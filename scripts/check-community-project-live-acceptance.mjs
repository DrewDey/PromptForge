#!/usr/bin/env node

import { spawn } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { CdpClient, chromeExecutable, waitForWebSocketUrl } from './measure-html-artifacts.mjs'
import {
  createSupabaseServerClient,
  isSupabaseSecretKey,
  resolveSupabaseServerKey,
} from '../src/lib/supabase/server-client.mjs'

const ACCEPTANCE_ARTIFACT = path.resolve('test-fixtures/community-project/valid.html')

function parseArgs(argv) {
  const options = { baseUrl: '', screenshotDir: '' }
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index]
    const value = argv[index + 1]
    if (!value) throw new Error(`Missing value after ${key}.`)
    if (key === '--base-url') options.baseUrl = new URL(value).origin
    else if (key === '--screenshot-dir') options.screenshotDir = path.resolve(value)
    else throw new Error(`Unknown argument: ${key}`)
  }
  if (!options.baseUrl) throw new Error('Pass --base-url for the deployed PathForge environment.')
  if (options.screenshotDir) mkdirSync(options.screenshotDir, { recursive: true })
  return options
}

function requiredEnvironment(name) {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} is required for the disposable live acceptance check.`)
  return value
}

function requiredServerKey() {
  const serverKey = resolveSupabaseServerKey(process.env)
  if (!isSupabaseSecretKey(serverKey)) {
    throw new Error('The deployed acceptance gate requires SUPABASE_SECRET_KEY with a current sb_secret_ key.')
  }
  return serverKey
}

function disposableAcceptanceEmail(baseEmail, suffix) {
  const at = baseEmail.lastIndexOf('@')
  if (at <= 0 || at === baseEmail.length - 1) {
    throw new Error('COMMUNITY_PROJECT_ACCEPTANCE_EMAIL must be a valid operator-controlled email address.')
  }
  const local = baseEmail.slice(0, at).replace(/\+.*/, '')
  const domain = baseEmail.slice(at + 1)
  return `${local}+pathforge-${suffix}@${domain}`
}

async function evaluate(client, sessionId, expression) {
  const { result, exceptionDetails } = await client.send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
  }, sessionId)
  if (exceptionDetails) throw new Error(exceptionDetails.text ?? 'Browser evaluation failed.')
  return result.value
}

async function navigate(client, sessionId, url) {
  const loaded = client.waitFor('Page.loadEventFired', sessionId)
  await client.send('Page.navigate', { url }, sessionId)
  await loaded
}

async function waitFor(client, sessionId, expression, label, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs
  let lastValue
  while (Date.now() < deadline) {
    lastValue = await evaluate(client, sessionId, expression)
    if (lastValue?.passed) return lastValue
    await new Promise((resolve) => setTimeout(resolve, 150))
  }
  throw new Error(`${label} timed out; last state was ${JSON.stringify(lastValue)}.`)
}

async function capture(client, sessionId, outputPath) {
  const { data } = await client.send('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: false,
  }, sessionId)
  writeFileSync(outputPath, Buffer.from(data, 'base64'))
}

async function waitForProfile(admin, username) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const { data, error } = await admin
      .from('profiles')
      .select('id,username')
      .eq('username', username)
      .maybeSingle()
    if (error) throw error
    if (data) return data
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error('The fresh Auth account did not receive its PathForge profile.')
}

async function waitForSubmission(admin, userId) {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const { data, error } = await admin
      .from('community_project_submissions')
      .select('id,status,artifact_path')
      .eq('author_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) throw error
    if (data) return data
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error('The signed-in upload did not create a private submission receipt.')
}

async function findAuthUserByEmail(admin, email) {
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw error
    const match = data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase())
    if (match) return match
    if (data.users.length < 1000) return null
  }
  throw new Error('The disposable Auth identity could not be resolved within the bounded cleanup scan.')
}

async function recordCleanup(cleanupErrors, label, task) {
  try {
    await task()
  } catch (error) {
    cleanupErrors.push(`${label}: ${error instanceof Error ? error.message : String(error)}`)
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  const supabaseUrl = requiredEnvironment('NEXT_PUBLIC_SUPABASE_URL')
  const serverKey = requiredServerKey()
  const acceptanceMailbox = requiredEnvironment('COMMUNITY_PROJECT_ACCEPTANCE_EMAIL')
  const admin = createSupabaseServerClient(supabaseUrl, serverKey)
  const executable = chromeExecutable()
  if (!executable) throw new Error('Chrome was not found for the live acceptance check.')

  const suffix = `${Date.now().toString(36)}${randomBytes(3).toString('hex')}`.slice(-14)
  const username = `accept_${suffix}`
  const email = disposableAcceptanceEmail(acceptanceMailbox, suffix)
  const password = `${randomBytes(24).toString('base64url')}Aa1!`
  const profile = mkdtempSync(path.join(tmpdir(), 'pathforge-community-live-acceptance-'))
  let userId = ''
  let submission = null
  let administratorId = ''
  let chrome
  let client
  let runError = null

  try {
    const { data: controls, error: controlError } = await admin
      .from('community_project_pilot_controls')
      .select('allow_invited_submissions,allow_internal_acceptance_submissions')
      .eq('singleton', true)
      .single()
    if (controlError) throw controlError
    if (controls.allow_invited_submissions || !controls.allow_internal_acceptance_submissions) {
      throw new Error('The live acceptance check requires external invitations locked and internal acceptance enabled.')
    }
    const { count: activeAcceptanceCount, error: activeAcceptanceError } = await admin
      .from('community_project_pilot_members')
      .select('user_id', { count: 'exact', head: true })
      .eq('active', true)
      .eq('member_kind', 'internal_acceptance')
      .gt('expires_at', new Date().toISOString())
    if (activeAcceptanceError) throw activeAcceptanceError
    if ((activeAcceptanceCount ?? 0) !== 0) {
      throw new Error('The disposable acceptance slot is already occupied; no account was created.')
    }

    const { data: administrators, error: administratorError } = await admin
      .from('profiles')
      .select('id')
      .eq('role', 'admin')
      .order('created_at', { ascending: true })
      .limit(1)
    if (administratorError) throw administratorError
    administratorId = administrators?.[0]?.id ?? ''
    if (!administratorId) throw new Error('No PathForge administrator is available for disposable admission.')

    chrome = spawn(executable, [
      '--headless=new',
      '--disable-gpu',
      '--no-sandbox',
      '--remote-debugging-port=0',
      `--user-data-dir=${profile}`,
      'about:blank',
    ], { stdio: ['ignore', 'ignore', 'pipe'] })
    client = new CdpClient(await waitForWebSocketUrl(chrome))
    await client.ready()
    const { targetId } = await client.send('Target.createTarget', { url: 'about:blank' })
    const { sessionId } = await client.send('Target.attachToTarget', { targetId, flatten: true })
    await Promise.all([
      client.send('Page.enable', {}, sessionId),
      client.send('Runtime.enable', {}, sessionId),
      client.send('DOM.enable', {}, sessionId),
      client.send('Emulation.setDeviceMetricsOverride', {
        width: 390,
        height: 844,
        deviceScaleFactor: 1,
        mobile: true,
      }, sessionId),
    ])

    await navigate(client, sessionId, `${options.baseUrl}/auth/signup?next=%2Fbuild`)
    await waitFor(client, sessionId, `({ passed: Boolean(document.querySelector('input[name="username"]')) })`, 'public signup form')
    await evaluate(client, sessionId, `(() => {
      const setValue = (selector, value) => {
        const element = document.querySelector(selector);
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
        setter.call(element, value);
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
      };
      setValue('input[name="username"]', ${JSON.stringify(username)});
      setValue('input[name="email"]', ${JSON.stringify(email)});
      setValue('input[name="password"]', ${JSON.stringify(password)});
      document.querySelector('form').requestSubmit();
      return true;
    })()`)
    await waitFor(client, sessionId, `(() => ({
      passed: document.querySelector('h1')?.textContent?.includes('Check your') &&
        document.body.textContent.includes('One last step'),
      path: location.pathname,
      error: document.querySelector('[role="alert"]')?.textContent || '',
    }))()`, 'public signup email-confirmation handoff')
    if (options.screenshotDir) await capture(client, sessionId, path.join(options.screenshotDir, 'live-public-signup-confirmation.png'))

    const createdProfile = await waitForProfile(admin, username)
    userId = createdProfile.id
    if (createdProfile.username !== username) {
      throw new Error('The public signup did not persist the exact PathForge handle.')
    }
    const { data: unconfirmedUser, error: unconfirmedUserError } = await admin.auth.admin.getUserById(userId)
    if (unconfirmedUserError || !unconfirmedUser.user) {
      throw unconfirmedUserError ?? new Error('The public signup account could not be read back.')
    }
    if (unconfirmedUser.user.email_confirmed_at) {
      throw new Error('The public signup bypassed the configured email-confirmation boundary.')
    }

    const callbackUrl = new URL('/auth/callback', options.baseUrl)
    callbackUrl.searchParams.set('flow', 'signup')
    callbackUrl.searchParams.set('next', '/build')
    const { data: verificationLink, error: verificationLinkError } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: { redirectTo: callbackUrl.toString() },
    })
    if (verificationLinkError || !verificationLink.properties?.hashed_token) {
      throw verificationLinkError ?? new Error('The operator verification token was not generated.')
    }
    if (verificationLink.user?.id !== userId) {
      throw new Error('The operator verification token did not bind to the public-signup identity.')
    }
    callbackUrl.searchParams.set('token_hash', verificationLink.properties.hashed_token)
    callbackUrl.searchParams.set('type', 'magiclink')
    await navigate(client, sessionId, callbackUrl.toString())
    await waitFor(client, sessionId, `(() => ({
      passed: location.pathname === '/build' && document.body.textContent.includes('not currently in the pilot'),
      path: location.pathname,
      hasUpload: Boolean(document.querySelector('input[type="file"]')),
    }))()`, 'verified callback and signed-in pre-admission denial')
    const { data: confirmedUser, error: confirmedUserError } = await admin.auth.admin.getUserById(userId)
    if (confirmedUserError || !confirmedUser.user?.email_confirmed_at) {
      throw confirmedUserError ?? new Error('The email verification callback did not confirm the public-signup identity.')
    }
    const denied = await evaluate(client, sessionId, `({ hasUpload: Boolean(document.querySelector('input[type="file"]')) })`)
    if (denied.hasUpload) throw new Error('The fresh account received an upload control before admission.')
    if (options.screenshotDir) await capture(client, sessionId, path.join(options.screenshotDir, 'live-pre-admission-denial.png'))

    const { error: admissionError } = await admin.rpc('set_community_project_pilot_member', {
      target_user: userId,
      administrator: administratorId,
      enabled: true,
      requested_member_kind: 'internal_acceptance',
      member_note: 'Disposable automated production acceptance',
    })
    if (admissionError) throw admissionError

    await navigate(client, sessionId, `${options.baseUrl}/build`)
    await waitFor(client, sessionId, `({ passed: Boolean(document.querySelector('#community-project-artifact')) })`, 'post-admission upload form')

    const { root } = await client.send('DOM.getDocument', { depth: -1, pierce: true }, sessionId)
    const { nodeId } = await client.send('DOM.querySelector', {
      nodeId: root.nodeId,
      selector: '#community-project-artifact',
    }, sessionId)
    if (!nodeId) throw new Error('The admitted upload form has no artifact input.')
    await client.send('DOM.setFileInputFiles', { nodeId, files: [ACCEPTANCE_ARTIFACT] }, sessionId)

    const projectTitle = `Disposable acceptance ${suffix}`
    await evaluate(client, sessionId, `(() => {
      const setControl = (selector, value) => {
        const element = document.querySelector(selector);
        const prototype = element instanceof HTMLSelectElement ? HTMLSelectElement.prototype : element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
        Object.getOwnPropertyDescriptor(prototype, 'value').set.call(element, value);
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
      };
      setControl('input[name="title"]', ${JSON.stringify(projectTitle)});
      setControl('textarea[name="summary"]', 'A disposable safe one-file project that proves the fresh-account private upload lifecycle.');
      setControl('select[name="category_slug"]', 'personal');
      setControl('select[name="difficulty"]', 'beginner');
      setControl('select[name="provider"]', 'ChatGPT');
      setControl('input[name="model"]', 'Acceptance fixture model');
      setControl('select[name="evidence_scope"]', 'selected_excerpts');
      setControl('select[name="reuse_permission"]', 'view_only');
      const checkpoint = [...document.querySelectorAll('fieldset')].find((item) => item.querySelector('legend')?.textContent?.trim() === 'Checkpoint 1');
      if (!checkpoint) throw new Error('Checkpoint 1 controls were not found.');
      const checkpointInput = checkpoint.querySelector('input');
      const textareas = checkpoint.querySelectorAll('textarea');
      if (!checkpointInput || textareas.length !== 2) throw new Error('Checkpoint 1 controls are incomplete.');
      const inputSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      inputSetter.call(checkpointInput, 'Acceptance checkpoint');
      checkpointInput.dispatchEvent(new Event('input', { bubbles: true }));
      checkpointInput.dispatchEvent(new Event('change', { bubbles: true }));
      const textAreaSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
      textAreaSetter.call(textareas[0], 'Create a safe one-file interactive acceptance fixture.');
      textareas[0].dispatchEvent(new Event('input', { bubbles: true }));
      textAreaSetter.call(textareas[1], 'Created the self-contained fixture without network access.');
      textareas[1].dispatchEvent(new Event('input', { bubbles: true }));
      for (const checkbox of document.querySelectorAll('input[type="checkbox"][required]')) {
        checkbox.checked = true;
        checkbox.dispatchEvent(new Event('change', { bubbles: true }));
      }
      document.querySelector('#community-project-artifact').dispatchEvent(new Event('change', { bubbles: true }));
      return { checkboxCount: document.querySelectorAll('input[type="checkbox"][required]').length };
    })()`)
    for (let guidedStep = 1; guidedStep < 6; guidedStep += 1) {
      await waitFor(client, sessionId, `(() => {
        const form = document.querySelector('form[enctype="multipart/form-data"]');
        const section = form?.querySelector('[data-community-submission-step="${guidedStep}"]');
        return {
          passed: form?.getAttribute('data-active-community-submission-step') === '${guidedStep}' &&
            Boolean(section) &&
            section.querySelectorAll(':invalid').length === 0,
          activeStep: form?.getAttribute('data-active-community-submission-step') || '',
          invalidControls: [...(section?.querySelectorAll(':invalid') ?? [])].map((item) => item.name || item.id || item.tagName),
        };
      })()`, `completed guided upload step ${guidedStep}`)
      await evaluate(client, sessionId, `(() => {
        const button = document.querySelector('button[data-community-submission-continue]');
        if (!button || button.hidden) throw new Error('Guided upload continue control is unavailable.');
        button.click();
        return true;
      })()`)
      await waitFor(client, sessionId, `(() => ({
        passed: document.querySelector('form[enctype="multipart/form-data"]')
          ?.getAttribute('data-active-community-submission-step') === '${guidedStep + 1}',
      }))()`, `guided upload step ${guidedStep + 1}`)
    }
    await waitFor(client, sessionId, `(() => {
      const form = document.querySelector('form');
      const button = [...document.querySelectorAll('button')].find((item) => item.textContent.includes('Submit private review bundle'));
      return {
        passed: Boolean(form?.checkValidity() && button && !button.disabled),
        invalidNames: [...(form?.querySelectorAll(':invalid') ?? [])].map((item) => item.name || item.id || item.tagName),
      };
    })()`, 'completed upload form')
    await evaluate(client, sessionId, `(() => {
      const button = [...document.querySelectorAll('button')].find((item) => item.textContent.includes('Submit private review bundle'));
      if (!button) throw new Error('Submit private review bundle button was not found.');
      button.click();
      return true;
    })()`)
    await waitFor(client, sessionId, `(() => ({
      passed: /^\/my-forge\/community-projects\/[0-9a-f-]+$/.test(location.pathname),
      path: location.pathname,
      body: document.body.textContent.slice(0, 300),
    }))()`, 'private submission receipt', 60_000)
    submission = await waitForSubmission(admin, userId)
    if (submission.status !== 'queued' || !submission.artifact_path) {
      throw new Error('The fresh-account upload did not remain queued in private quarantine.')
    }
    if (options.screenshotDir) await capture(client, sessionId, path.join(options.screenshotDir, 'live-private-submission-receipt-mobile-390.png'))

    const receiptPath = await evaluate(client, sessionId, 'location.pathname + location.search')
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 1000,
      deviceScaleFactor: 1,
      mobile: false,
    }, sessionId)
    await navigate(client, sessionId, `${options.baseUrl}${receiptPath}`)
    await waitFor(client, sessionId, `(() => {
      const root = document.documentElement;
      const body = document.body;
      return {
        passed: document.querySelector('h1')?.textContent === ${JSON.stringify(projectTitle)} &&
          document.body.textContent.includes('Private bundle received.') &&
          Math.max(root.scrollWidth, body?.scrollWidth || 0) <= root.clientWidth + 1,
        heading: document.querySelector('h1')?.textContent || '',
        viewport: root.clientWidth,
        scrollWidth: Math.max(root.scrollWidth, body?.scrollWidth || 0),
      };
    })()`, 'desktop private submission receipt')
    if (options.screenshotDir) await capture(client, sessionId, path.join(options.screenshotDir, 'live-private-submission-receipt-desktop.png'))

    await evaluate(client, sessionId, `(() => {
      window.confirm = () => true;
      const button = [...document.querySelectorAll('button')].find((item) => item.textContent.includes('Withdraw') || item.textContent.includes('Unpublish'));
      if (!button) throw new Error('Owner withdrawal button was not found.');
      button.click();
      return true;
    })()`)
    for (let attempt = 0; attempt < 120; attempt += 1) {
      const { data, error } = await admin
        .from('community_project_submissions')
        .select('status,artifact_path')
        .eq('id', submission.id)
        .single()
      if (error) throw error
      if (data.status === 'withdrawn' && data.artifact_path === null) break
      if (attempt === 119) throw new Error('Owner withdrawal did not confirm private artifact cleanup.')
      await new Promise((resolve) => setTimeout(resolve, 250))
    }
    if (options.screenshotDir) await capture(client, sessionId, path.join(options.screenshotDir, 'live-owner-withdrawal.png'))

    await client.send('Target.closeTarget', { targetId })
  } catch (error) {
    runError = error
  } finally {
    const cleanupErrors = []
    client?.close()
    chrome?.kill('SIGTERM')
    if (!userId) {
      await recordCleanup(cleanupErrors, 'Auth identity recovery for cleanup', async () => {
        const recoveredUser = await findAuthUserByEmail(admin, email)
        userId = recoveredUser?.id ?? ''
      })
    }
    if (userId && administratorId) {
      await recordCleanup(cleanupErrors, 'membership revocation', async () => {
        const { error } = await admin.rpc('set_community_project_pilot_member', {
          target_user: userId,
          administrator: administratorId,
          enabled: false,
          requested_member_kind: 'internal_acceptance',
          member_note: 'Disposable acceptance cleanup',
        })
        if (error) throw error
      })
    }
    if (userId) {
      await recordCleanup(cleanupErrors, 'quarantine cleanup', async () => {
        const { data, error } = await admin
          .from('community_project_submissions')
          .select('artifact_path')
          .eq('author_id', userId)
          .not('artifact_path', 'is', null)
        if (error) throw error
        const paths = [...new Set([
          ...(data ?? []).flatMap((item) => item.artifact_path ? [item.artifact_path] : []),
          ...(submission?.artifact_path ? [submission.artifact_path] : []),
        ])]
        if (paths.length) {
          const { error: removeError } = await admin.storage.from('community-project-quarantine').remove(paths)
          if (removeError) throw removeError
        }
      })
      await recordCleanup(cleanupErrors, 'disposable submission cleanup', async () => {
        const { data: disposableSubmissions, error: lookupError } = await admin
          .from('community_project_submissions')
          .select('id,status,prompt_id')
          .eq('author_id', userId)
        if (lookupError) throw lookupError
        const unsafeRows = (disposableSubmissions ?? []).filter(
          (item) => item.prompt_id !== null || item.status === 'published',
        )
        if (unsafeRows.length) {
          throw new Error('refusing to delete a disposable fixture that unexpectedly reached publication')
        }
        if ((disposableSubmissions ?? []).length) {
          const { error: deleteError } = await admin
            .from('community_project_submissions')
            .delete()
            .eq('author_id', userId)
          if (deleteError) throw deleteError
        }
      })
      await recordCleanup(cleanupErrors, 'Auth user deletion', async () => {
        const { error } = await admin.auth.admin.deleteUser(userId)
        if (error) throw error
      })
      await recordCleanup(cleanupErrors, 'membership postcondition', async () => {
        const { data, error } = await admin
          .from('community_project_pilot_members')
          .select('user_id')
          .eq('user_id', userId)
        if (error) throw error
        if ((data ?? []).length) throw new Error('the disposable membership still exists')
      })
      await recordCleanup(cleanupErrors, 'acceptance-slot postcondition', async () => {
        const { count, error } = await admin
          .from('community_project_pilot_members')
          .select('user_id', { count: 'exact', head: true })
          .eq('active', true)
          .eq('member_kind', 'internal_acceptance')
          .gt('expires_at', new Date().toISOString())
        if (error) throw error
        if ((count ?? 0) !== 0) throw new Error(`${count} current internal acceptance memberships remain`)
      })
      await recordCleanup(cleanupErrors, 'submission postcondition', async () => {
        const { data, error } = await admin
          .from('community_project_submissions')
          .select('id')
          .eq('author_id', userId)
        if (error) throw error
        if ((data ?? []).length) throw new Error('disposable submission rows still exist')
      })
      await recordCleanup(cleanupErrors, 'quarantine postcondition', async () => {
        const { data, error } = await admin.storage
          .from('community-project-quarantine')
          .list(userId, { limit: 100 })
        if (error) throw error
        if ((data ?? []).length) throw new Error('disposable quarantine objects still exist')
      })
      await recordCleanup(cleanupErrors, 'Auth user postcondition', async () => {
        const { data, error } = await admin.auth.admin.getUserById(userId)
        if (!error && data?.user) throw new Error('the disposable Auth user still exists')
        if (error && !/not found/i.test(error.message)) throw error
      })
    }
    await recordCleanup(cleanupErrors, 'pilot-control postcondition', async () => {
      const { data, error } = await admin
        .from('community_project_pilot_controls')
        .select('allow_invited_submissions,allow_internal_acceptance_submissions')
        .eq('singleton', true)
        .single()
      if (error) throw error
      if (data.allow_invited_submissions || !data.allow_internal_acceptance_submissions) {
        throw new Error('external invitations are not locked with internal acceptance enabled')
      }
    })
    await recordCleanup(cleanupErrors, 'browser-profile cleanup', async () => {
      rmSync(profile, { recursive: true, force: true, maxRetries: 8, retryDelay: 125 })
    })
    if (cleanupErrors.length) {
      const runFailure = runError
        ? `Acceptance flow failed: ${runError instanceof Error ? runError.message : String(runError)}. `
        : ''
      throw new Error(`${runFailure}Disposable cleanup verification failed: ${cleanupErrors.join(' | ')}`)
    }
  }
  if (runError) throw runError
  console.log('Live fresh-account acceptance passed and cleanup verified: submitted the public signup form, completed a real token-hash callback, denied upload before admission, admitted with external invitations locked, uploaded privately at 390px, verified the desktop owner receipt, withdrew, removed exact disposable resources, and left the acceptance slot empty. SMTP inbox delivery remains a separate required manual gate before external invitations.')
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
