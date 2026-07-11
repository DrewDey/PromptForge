#!/usr/bin/env node

import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import {
  CdpClient,
  chromeExecutable,
  waitForWebSocketUrl,
} from './measure-html-artifacts.mjs'

function parseArgs(argv) {
  let baseUrl = 'http://127.0.0.1:3011'
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] !== '--base-url') throw new Error(`Unknown argument: ${argv[index]}`)
    baseUrl = argv[++index] ?? ''
  }
  return new URL(baseUrl).origin
}

async function waitForValue(client, sessionId, expression, predicate, label, timeoutMs = 12_000) {
  const deadline = Date.now() + timeoutMs
  let lastValue
  while (Date.now() < deadline) {
    const { result } = await client.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    }, sessionId)
    lastValue = result.value
    if (predicate(lastValue)) return lastValue
    await new Promise((resolve) => setTimeout(resolve, 75))
  }
  throw new Error(`${label} timed out; last value was ${JSON.stringify(lastValue)}.`)
}

async function navigate(client, sessionId, url) {
  const loaded = client.waitFor('Page.loadEventFired', sessionId)
  await client.send('Page.navigate', { url }, sessionId)
  await loaded
  await waitForValue(
    client,
    sessionId,
    `Boolean(document.querySelector('[data-model-variant-selector]'))`,
    Boolean,
    'model selector',
  )
}

async function main() {
  const baseUrl = parseArgs(process.argv.slice(2))
  const executable = chromeExecutable()
  if (!executable) throw new Error('Chrome was not found for the model-variant browser guard.')

  const profile = mkdtempSync(path.join(tmpdir(), 'pathforge-model-variant-browser-'))
  const child = spawn(executable, [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--remote-debugging-port=0',
    `--user-data-dir=${profile}`,
    'about:blank',
  ], { stdio: ['ignore', 'ignore', 'pipe'] })

  let client
  try {
    client = new CdpClient(await waitForWebSocketUrl(child))
    await client.ready()
    const { targetId } = await client.send('Target.createTarget', { url: 'about:blank' })
    const { sessionId } = await client.send('Target.attachToTarget', { targetId, flatten: true })
    const consoleErrors = []
    const listener = (message) => {
      if (message.sessionId !== sessionId) return
      if (message.method === 'Runtime.exceptionThrown') {
        consoleErrors.push(message.params.exceptionDetails?.text ?? 'Uncaught runtime exception')
      }
      if (message.method === 'Log.entryAdded' && message.params.entry?.level === 'error') {
        consoleErrors.push(message.params.entry.text)
      }
    }
    client.listeners.add(listener)

    try {
      await Promise.all([
        client.send('Page.enable', {}, sessionId),
        client.send('Runtime.enable', {}, sessionId),
        client.send('Log.enable', {}, sessionId),
        client.send('Emulation.setDeviceMetricsOverride', {
          width: 1440,
          height: 1000,
          deviceScaleFactor: 1,
          mobile: false,
        }, sessionId),
      ])

      const route = `${baseUrl}/t-shirt-print-alignment-press-game-demo`
      await navigate(client, sessionId, route)
      const selectorSnapshotExpression = `(() => {
        const rows=[...document.querySelectorAll('[data-model-variant-run]')];
        return {
          ids: rows.map((row)=>row.dataset.modelVariantRun),
          labels: rows.map((row)=>row.querySelector('.text-sm.font-black')?.textContent?.trim() ?? ''),
          activeId: rows.find((row)=>row.querySelector('[aria-current="page"]'))?.dataset.modelVariantRun ?? '',
          viewHref: rows.find((row)=>!row.querySelector('[aria-current="page"]'))?.querySelector('[data-model-variant-view]')?.href ?? '',
        };
      })()`
      const initial = await waitForValue(
        client,
        sessionId,
        selectorSnapshotExpression,
        (value) => value?.ids?.length === 3 && Boolean(value.viewHref),
        'three model selector rows',
      )
      const sortedLabels = [...initial.labels].sort(new Intl.Collator('en', {
        numeric: true,
        sensitivity: 'base',
      }).compare)
      if (JSON.stringify(initial.labels) !== JSON.stringify(sortedLabels)) {
        throw new Error(`Model selector is not alphabetical: ${initial.labels.join(', ')}.`)
      }

      await navigate(client, sessionId, initial.viewHref)
      const afterModelChange = await waitForValue(
        client,
        sessionId,
        selectorSnapshotExpression,
        (value) => value?.activeId && value.activeId !== initial.activeId,
        'changed active model',
      )
      if (JSON.stringify(afterModelChange.ids) !== JSON.stringify(initial.ids)) {
        throw new Error('Changing the selected model reordered the selector.')
      }

      const packageIds = await waitForValue(
        client,
        sessionId,
        `[...document.querySelectorAll('[data-artifact-package-select]')].map((button)=>button.dataset.artifactPackageSelect)`,
        (value) => Array.isArray(value) && value.length >= 2,
        'multiple selectable artifact packages',
      )
      const rapidSequence = [packageIds[0], packageIds[1], packageIds.at(-1)]
      const expectedPackageId = rapidSequence.at(-1)
      await client.send('Runtime.evaluate', {
        expression: `(() => {
          for (const id of ${JSON.stringify(rapidSequence)}) {
            document.querySelector('[data-artifact-package-select="'+CSS.escape(id)+'"]')?.click();
          }
        })()`,
      }, sessionId)
      const mountedPackage = await waitForValue(
        client,
        sessionId,
        `(() => {
          const frame=document.querySelector('[data-artifact-package-id]');
          return {
            id: frame?.dataset.artifactPackageId ?? '',
            path: frame?.dataset.artifactPath ?? '',
            loading: Boolean(document.querySelector('[data-artifact-loading]')),
            error: document.querySelector('[data-artifact-load-error]')?.getAttribute('data-artifact-load-error') ?? '',
            iframe: Boolean(frame?.querySelector('iframe[srcdoc]')),
            sandbox: frame?.querySelector('iframe')?.getAttribute('sandbox') ?? '',
          };
        })()`,
        (value) => value?.id === expectedPackageId && !value.loading && value.iframe,
        'final rapidly selected artifact',
      )
      if (mountedPackage.error) throw new Error(`Artifact switch rendered ${mountedPackage.error}.`)
      if (!mountedPackage.path.startsWith('/artifacts/')) {
        throw new Error(`Artifact switch mounted an invalid path: ${mountedPackage.path}.`)
      }
      if (mountedPackage.sandbox !== 'allow-scripts') {
        throw new Error(`Artifact frame has unexpected sandbox tokens: ${mountedPackage.sandbox}.`)
      }

      const compareHref = await waitForValue(
        client,
        sessionId,
        `document.querySelector('[data-model-variant-compare]')?.href ?? ''`,
        Boolean,
        'model comparison link',
      )
      await navigate(client, sessionId, compareHref)
      await waitForValue(
        client,
        sessionId,
        `Boolean(document.querySelector('[data-model-variant-comparison-panel]'))`,
        Boolean,
        'model comparison panel',
      )

      if (consoleErrors.length > 0) {
        throw new Error(`Model-variant browser flow logged errors: ${[...new Set(consoleErrors)].join(' | ')}`)
      }
    } finally {
      client.listeners.delete(listener)
      await client.send('Target.closeTarget', { targetId })
    }
  } finally {
    client?.close()
    child.kill('SIGTERM')
    rmSync(profile, { recursive: true, force: true, maxRetries: 8, retryDelay: 125 })
  }

  console.log('Model selector, comparison, and artifact-switch browser guard passed.')
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
