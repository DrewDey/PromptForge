#!/usr/bin/env node

import { spawn } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { CdpClient, chromeExecutable, waitForWebSocketUrl } from './measure-html-artifacts.mjs'
import {
  createSupabaseServerClient,
  isLegacyServiceRoleKey,
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

function requiredServerKey({ allowLegacy }) {
  const serverKey = resolveSupabaseServerKey(process.env)
  if (isSupabaseSecretKey(serverKey)) return serverKey
  if (allowLegacy && isLegacyServiceRoleKey(serverKey)) return serverKey
  throw new Error('The deployed acceptance gate requires SUPABASE_SECRET_KEY with a current sb_secret_ key.')
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
  if (exceptionDetails) {
    throw new Error(
      exceptionDetails.exception?.description
      ?? exceptionDetails.exception?.value
      ?? exceptionDetails.text
      ?? 'Browser evaluation failed.',
    )
  }
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

function renderedElementExpression(selector) {
  return `([...document.querySelectorAll(${JSON.stringify(selector)})].find((element) => {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return !element.hidden &&
      rect.width > 0 &&
      rect.height > 0 &&
      style.display !== 'none' &&
      style.visibility !== 'hidden';
  }) ?? null)`
}

async function clickElement(client, sessionId, selector, label) {
  const point = await evaluate(client, sessionId, `(async () => {
    const element = ${renderedElementExpression(selector)};
    if (!element || element.hidden || element.disabled) {
      throw new Error(${JSON.stringify(`${label} is unavailable.`)});
    }
    element.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    if (
      rect.width <= 0 ||
      rect.height <= 0 ||
      style.display === 'none' ||
      style.visibility === 'hidden' ||
      style.pointerEvents === 'none'
    ) {
      throw new Error(${JSON.stringify(`${label} is not interactable.`)});
    }
    return {
      x: rect.left + (rect.width / 2),
      y: rect.top + (rect.height / 2),
    };
  })()`)
  await client.send('Input.dispatchMouseEvent', {
    type: 'mouseMoved',
    x: point.x,
    y: point.y,
    buttons: 0,
  }, sessionId)
  await client.send('Input.dispatchMouseEvent', {
    type: 'mousePressed',
    x: point.x,
    y: point.y,
    button: 'left',
    buttons: 1,
    clickCount: 1,
  }, sessionId)
  await client.send('Input.dispatchMouseEvent', {
    type: 'mouseReleased',
    x: point.x,
    y: point.y,
    button: 'left',
    buttons: 0,
    clickCount: 1,
  }, sessionId)
}

async function setFileInputFiles(client, sessionId, selector, files, label) {
  const { result, exceptionDetails } = await client.send('Runtime.evaluate', {
    expression: `(() => {
      const element = ${renderedElementExpression(selector)};
      if (!(element instanceof HTMLInputElement) || element.type !== 'file') {
        throw new Error(${JSON.stringify(`${label} is unavailable.`)});
      }
      return element;
    })()`,
    returnByValue: false,
  }, sessionId)
  if (exceptionDetails) {
    throw new Error(
      exceptionDetails.exception?.description
      ?? exceptionDetails.exception?.value
      ?? exceptionDetails.text
      ?? `${label} could not be resolved.`,
    )
  }
  if (!result.objectId) throw new Error(`${label} could not be resolved.`)
  try {
    await client.send('DOM.setFileInputFiles', {
      objectId: result.objectId,
      files,
    }, sessionId)
  } finally {
    await client.send('Runtime.releaseObject', { objectId: result.objectId }, sessionId)
  }
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
  const acceptanceMailbox = requiredEnvironment('COMMUNITY_PROJECT_ACCEPTANCE_EMAIL')
  const accountBootstrap = process.env.COMMUNITY_PROJECT_ACCEPTANCE_BOOTSTRAP?.trim() || 'public-signup'
  if (!['public-signup', 'admin-no-mail'].includes(accountBootstrap)) {
    throw new Error('COMMUNITY_PROJECT_ACCEPTANCE_BOOTSTRAP must be public-signup or admin-no-mail.')
  }
  const allowLegacy = process.env.COMMUNITY_PROJECT_ACCEPTANCE_ALLOW_LEGACY_KEY === '1'
  if (allowLegacy && accountBootstrap !== 'admin-no-mail') {
    throw new Error('Legacy-key compatibility is limited to the operator-only admin-no-mail acceptance mode.')
  }
  const serverKey = requiredServerKey({ allowLegacy })
  const usesLegacyKey = isLegacyServiceRoleKey(serverKey)
  const vercelProtectionBypass = process.env.VERCEL_PROTECTION_BYPASS?.trim()
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
  let sessionId = ''
  let runError = null
  let acceptanceStage = 'preflight controls'

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

    acceptanceStage = 'administrator lookup'
    const { data: administrators, error: administratorError } = await admin
      .from('profiles')
      .select('id')
      .eq('role', 'admin')
      .order('created_at', { ascending: true })
      .limit(1)
    if (administratorError) throw administratorError
    administratorId = administrators?.[0]?.id ?? ''
    if (!administratorId) throw new Error('No PathForge administrator is available for disposable admission.')

    acceptanceStage = 'browser launch'
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
    ;({ sessionId } = await client.send('Target.attachToTarget', { targetId, flatten: true }))
    await Promise.all([
      client.send('Page.enable', {}, sessionId),
      client.send('Runtime.enable', {}, sessionId),
      client.send('DOM.enable', {}, sessionId),
      client.send('Network.enable', {}, sessionId),
      client.send('Emulation.setDeviceMetricsOverride', {
        width: 390,
        height: 844,
        deviceScaleFactor: 1,
        mobile: true,
      }, sessionId),
    ])
    if (vercelProtectionBypass) {
      await client.send('Network.setExtraHTTPHeaders', {
        headers: {
          'x-vercel-protection-bypass': vercelProtectionBypass,
          'x-vercel-set-bypass-cookie': 'true',
        },
      }, sessionId)
    }

    acceptanceStage = accountBootstrap === 'public-signup'
      ? 'public signup'
      : 'operator-only no-mail account bootstrap'
    if (accountBootstrap === 'public-signup') {
      await navigate(client, sessionId, `${options.baseUrl}/auth/signup?next=%2Fbuild`)
      await waitFor(client, sessionId, `(() => ({
        passed: Boolean(${renderedElementExpression('input[name="username"]')}),
      }))()`, 'public signup form')
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
      await waitFor(client, sessionId, `(() => {
        const heading = ${renderedElementExpression('h1')};
        const main = ${renderedElementExpression('main')};
        const alert = ${renderedElementExpression('[role="alert"]')};
        return {
          passed: heading?.textContent?.includes('Check your') &&
            main?.textContent?.includes('One last step'),
          path: location.pathname,
          error: alert?.textContent?.trim() || '',
        };
      })()`, 'public signup email-confirmation handoff')
      if (options.screenshotDir) await capture(client, sessionId, path.join(options.screenshotDir, 'live-public-signup-confirmation.png'))
    } else {
      const { data: createdIdentity, error: createIdentityError } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: false,
        user_metadata: { username, display_name: username },
      })
      if (createIdentityError || !createdIdentity.user) {
        throw createIdentityError ?? new Error('The operator-only no-mail acceptance identity was not created.')
      }
      userId = createdIdentity.user.id
    }

    acceptanceStage = 'fresh profile verification'
    const createdProfile = await waitForProfile(admin, username)
    if (userId && createdProfile.id !== userId) {
      throw new Error('The fresh Auth identity and PathForge profile did not bind to the same user.')
    }
    userId = createdProfile.id
    if (createdProfile.username !== username) {
      throw new Error('The fresh account did not persist the exact PathForge handle.')
    }
    const { data: unconfirmedUser, error: unconfirmedUserError } = await admin.auth.admin.getUserById(userId)
    if (unconfirmedUserError || !unconfirmedUser.user) {
      throw unconfirmedUserError ?? new Error('The fresh account could not be read back.')
    }
    if (unconfirmedUser.user.email_confirmed_at) {
      throw new Error('The fresh account bypassed the configured email-confirmation boundary.')
    }

    acceptanceStage = 'operator verification-link generation'
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
      throw new Error('The operator verification token did not bind to the fresh identity.')
    }
    callbackUrl.searchParams.set('token_hash', verificationLink.properties.hashed_token)
    callbackUrl.searchParams.set('type', 'magiclink')
    acceptanceStage = 'token-hash callback and pre-admission denial'
    await navigate(client, sessionId, callbackUrl.toString())
    await waitFor(client, sessionId, `(() => {
      const main = ${renderedElementExpression('main')};
      const upload = ${renderedElementExpression('input[type="file"]')};
      return {
        passed: location.pathname === '/build' &&
          main?.textContent?.includes('not currently in the pilot'),
        path: location.pathname,
        hasUpload: Boolean(upload),
      };
    })()`, 'verified callback and signed-in pre-admission denial')
    const { data: confirmedUser, error: confirmedUserError } = await admin.auth.admin.getUserById(userId)
    if (confirmedUserError || !confirmedUser.user?.email_confirmed_at) {
      throw confirmedUserError ?? new Error('The email verification callback did not confirm the fresh identity.')
    }
    const denied = await evaluate(client, sessionId, `({
      hasUpload: Boolean(${renderedElementExpression('input[type="file"]')}),
    })`)
    if (denied.hasUpload) throw new Error('The fresh account received an upload control before admission.')
    if (options.screenshotDir) await capture(client, sessionId, path.join(options.screenshotDir, 'live-pre-admission-denial.png'))

    acceptanceStage = 'internal acceptance admission'
    const { error: admissionError } = await admin.rpc('set_community_project_pilot_member', {
      target_user: userId,
      administrator: administratorId,
      enabled: true,
      requested_member_kind: 'internal_acceptance',
      member_note: 'Disposable automated production acceptance',
    })
    if (admissionError) throw admissionError

    acceptanceStage = 'admitted upload form'
    await navigate(client, sessionId, `${options.baseUrl}/build`)
    await waitFor(client, sessionId, `(() => {
      const form = ${renderedElementExpression('form[data-active-community-submission-step]')};
      return {
        passed: Boolean(
          form &&
          form.getAttribute('data-active-community-submission-step') === '1' &&
          form.querySelector('#community-project-artifact')
        ),
        renderedFormCount: [...document.querySelectorAll('form[data-active-community-submission-step]')]
          .filter((candidate) => candidate.getBoundingClientRect().width > 0).length,
      };
    })()`, 'post-admission upload form')
    if (options.screenshotDir) {
      await capture(client, sessionId, path.join(options.screenshotDir, 'live-admitted-upload-form-mobile-390.png'))
    }

    await setFileInputFiles(
      client,
      sessionId,
      'form[data-active-community-submission-step] #community-project-artifact',
      [ACCEPTANCE_ARTIFACT],
      'The admitted upload artifact input',
    )

    const projectTitle = `Disposable acceptance ${suffix}`
    acceptanceStage = 'private project submission field population'
    await evaluate(client, sessionId, `(() => {
      const form = ${renderedElementExpression('form[data-active-community-submission-step]')};
      if (!form) throw new Error('The rendered admitted upload form is unavailable.');
      const setControl = (selector, value) => {
        const element = form.querySelector(selector);
        if (!element) throw new Error('Missing upload control: ' + selector);
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
      const checkpoint = [...form.querySelectorAll('fieldset')].find((item) => item.querySelector('legend')?.textContent?.trim() === 'Checkpoint 1');
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
      for (const checkbox of form.querySelectorAll('input[type="checkbox"][required]')) {
        checkbox.checked = true;
        checkbox.dispatchEvent(new Event('change', { bubbles: true }));
      }
      form.querySelector('#community-project-artifact').dispatchEvent(new Event('change', { bubbles: true }));
      return { checkboxCount: form.querySelectorAll('input[type="checkbox"][required]').length };
    })()`)
    for (let guidedStep = 1; guidedStep < 6; guidedStep += 1) {
      acceptanceStage = `private project submission guided step ${guidedStep}`
      await waitFor(client, sessionId, `(() => {
        const form = ${renderedElementExpression('form[data-active-community-submission-step]')};
        const section = form?.querySelector('[data-community-submission-step="${guidedStep}"]');
        return {
          passed: form?.getAttribute('data-active-community-submission-step') === '${guidedStep}' &&
            Boolean(section) &&
            section.querySelectorAll(':invalid').length === 0,
          activeStep: form?.getAttribute('data-active-community-submission-step') || '',
          formCount: document.querySelectorAll('form[enctype="multipart/form-data"]').length,
          formAttributes: form ? [...form.attributes].map((attribute) => [attribute.name, attribute.value]) : [],
          heading: document.querySelector('h1')?.textContent?.trim() || '',
          pathname: location.pathname,
          invalidControls: [...(section?.querySelectorAll(':invalid') ?? [])].map((item) => item.name || item.id || item.tagName),
        };
      })()`, `completed guided upload step ${guidedStep}`, 10_000)
      await clickElement(
        client,
        sessionId,
        'form[data-active-community-submission-step] button[data-community-submission-continue]',
        'Guided upload continue control',
      )
      await waitFor(client, sessionId, `(() => {
        const form = ${renderedElementExpression('form[data-active-community-submission-step]')};
        return {
          passed: form?.getAttribute('data-active-community-submission-step') === '${guidedStep + 1}',
          activeStep: form?.getAttribute('data-active-community-submission-step') || '',
          alert: form?.querySelector('[role="alert"]')?.textContent?.trim() || '',
          continueHidden: form?.querySelector('button[data-community-submission-continue]')?.hidden ?? null,
        };
      })()`, `guided upload step ${guidedStep + 1}`, 10_000)
    }
    acceptanceStage = 'private project submission final validation'
    await waitFor(client, sessionId, `(() => {
      const form = ${renderedElementExpression('form[data-active-community-submission-step]')};
      const button = [...(form?.querySelectorAll('button') ?? [])].find((item) => item.textContent.includes('Submit private review bundle'));
      return {
        passed: Boolean(form?.checkValidity() && button && !button.disabled),
        invalidNames: [...(form?.querySelectorAll(':invalid') ?? [])].map((item) => item.name || item.id || item.tagName),
      };
    })()`, 'completed upload form')
    acceptanceStage = 'private project submission request'
    await clickElement(
      client,
      sessionId,
      'form[data-active-community-submission-step] button[type="submit"]',
      'Submit private review bundle button',
    )
    acceptanceStage = 'private project submission receipt'
    await waitFor(client, sessionId, `(() => {
      const form = ${renderedElementExpression('form[data-active-community-submission-step]')};
      const heading = ${renderedElementExpression('h1')};
      const main = ${renderedElementExpression('main')};
      const submit = form?.querySelector('button[type="submit"]');
      return {
        passed: new RegExp('^/my-forge/community-projects/[0-9a-f-]+$').test(location.pathname) &&
          heading?.textContent?.trim() === ${JSON.stringify(projectTitle)} &&
          main?.textContent?.includes('Private bundle received.'),
        path: location.pathname,
        heading: heading?.textContent?.trim() || '',
        activeStep: form?.getAttribute('data-active-community-submission-step') || '',
        alert: form?.querySelector('[role="alert"]')?.textContent?.trim() || '',
        status: form?.querySelector('[role="status"]')?.textContent?.trim() || '',
        submitText: submit?.textContent?.trim() || '',
        submitDisabled: submit?.disabled ?? null,
        body: document.body.textContent.slice(0, 300),
      };
    })()`, 'private submission receipt', 60_000)
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
      const heading = ${renderedElementExpression('h1')};
      const main = ${renderedElementExpression('main')};
      return {
        passed: heading?.textContent?.trim() === ${JSON.stringify(projectTitle)} &&
          main?.textContent?.includes('Private bundle received.') &&
          Math.max(root.scrollWidth, body?.scrollWidth || 0) <= root.clientWidth + 1,
        heading: heading?.textContent?.trim() || '',
        viewport: root.clientWidth,
        scrollWidth: Math.max(root.scrollWidth, body?.scrollWidth || 0),
      };
    })()`, 'desktop private submission receipt')
    if (options.screenshotDir) await capture(client, sessionId, path.join(options.screenshotDir, 'live-private-submission-receipt-desktop.png'))

    acceptanceStage = 'owner withdrawal'
    await evaluate(client, sessionId, `(() => {
      window.confirm = () => true;
      const button = [...document.querySelectorAll('button')].find((item) => {
        const rect = item.getBoundingClientRect();
        return rect.width > 0 &&
          rect.height > 0 &&
          (item.textContent.includes('Withdraw') || item.textContent.includes('Unpublish'));
      });
      if (!button) throw new Error('Owner withdrawal button was not found.');
      button.setAttribute('data-live-acceptance-withdraw', '');
      return true;
    })()`)
    await clickElement(
      client,
      sessionId,
      'button[data-live-acceptance-withdraw]',
      'Owner withdrawal button',
    )
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
    await waitFor(client, sessionId, `(() => ({
      passed: document.body.textContent.includes('The artifact has been purged.') &&
        ![...document.querySelectorAll('button')].some((item) =>
          item.textContent.includes('Withdraw') || item.textContent.includes('Unpublish')
        ),
      body: document.body.textContent.slice(0, 400),
    }))()`, 'owner withdrawal receipt', 30_000)
    if (options.screenshotDir) await capture(client, sessionId, path.join(options.screenshotDir, 'live-owner-withdrawal.png'))

    await client.send('Target.closeTarget', { targetId })
  } catch (error) {
    if (options.screenshotDir && client && sessionId) {
      try {
        await capture(client, sessionId, path.join(options.screenshotDir, 'live-acceptance-failure.png'))
      } catch {
        // Preserve the original acceptance failure if Chrome has already closed.
      }
    }
    runError = new Error(
      `${acceptanceStage}: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error },
    )
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
  const accountProof = accountBootstrap === 'public-signup'
    ? 'submitted the public signup form and preserved the unconfirmed boundary'
    : 'created an unconfirmed disposable identity through the operator-only no-mail bootstrap'
  const keyProof = usesLegacyKey
    ? ' The existing legacy service-role key was used only for compatibility; this run does not satisfy the current sb_secret_ production gate.'
    : ''
  console.log(`Live fresh-account acceptance passed and cleanup verified: ${accountProof}, completed a real token-hash callback, denied upload before admission, admitted with external invitations locked, uploaded privately at 390px, verified the desktop owner receipt, withdrew, removed exact disposable resources, and left the acceptance slot empty. SMTP inbox delivery remains a separate required manual gate before external invitations.${keyProof}`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
