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
import { isExpectedLocalActivationFailure } from './browser-guard-errors.mjs'

function parseArgs(argv) {
  let baseUrl = 'http://127.0.0.1:3012'
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] !== '--base-url') throw new Error(`Unknown argument: ${argv[index]}`)
    baseUrl = argv[++index] ?? ''
  }
  return new URL(baseUrl).origin
}

async function waitForValue(client, sessionId, expression, predicate, label, timeoutMs = 15_000) {
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
    await new Promise((resolve) => setTimeout(resolve, 40))
  }
  throw new Error(`${label} timed out; last value was ${JSON.stringify(lastValue)}.`)
}

const discoverySnapshotExpression = `(() => {
  const menu=document.querySelector('[data-discovery-sort-menu]');
  const summary=menu?.querySelector('summary');
  const selected=menu?.querySelector('[data-discovery-sort-label]');
  const newest=menu?.querySelector('[data-discovery-navigation-kind="sort"][href*="sort=newest"]');
  const pending=menu?.querySelector('[data-discovery-navigation-pending="true"]');
  const cards=[...document.querySelectorAll('.path-catalog-grid .path-card h3')]
    .map((node)=>node.textContent?.trim() || '')
    .filter(Boolean);
  const indicator=pending?.querySelector('.path-navigation-pending-indicator');
  const indicatorRect=indicator?.getBoundingClientRect();
  return {
    ready: Boolean(
      menu &&
      summary &&
      newest &&
      cards.length > 1 &&
      Object.keys(newest).some((key)=>key.startsWith('__reactProps$'))
    ),
    menuOpen: Boolean(menu?.open),
    selectedLabel: selected?.textContent?.trim() || '',
    summaryBusy: summary?.getAttribute('aria-busy') || '',
    pendingHref: pending?.getAttribute('href') || '',
    pendingBusy: pending?.getAttribute('aria-busy') || '',
    pendingDisabled: pending?.getAttribute('aria-disabled') || '',
    pendingVisible: Boolean(indicatorRect && indicatorRect.width > 0 && indicatorRect.height > 0),
    newestCurrent: newest?.getAttribute('aria-current') || '',
    href: window.location.href,
    cards,
  };
})()`

async function main() {
  const baseUrl = parseArgs(process.argv.slice(2))
  const executable = chromeExecutable()
  if (!executable) throw new Error('Chrome was not found for the discovery navigation browser guard.')

  const profile = mkdtempSync(path.join(tmpdir(), 'pathforge-discovery-navigation-browser-'))
  const chrome = spawn(executable, [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--remote-debugging-port=0',
    `--user-data-dir=${profile}`,
    'about:blank',
  ], { stdio: ['ignore', 'ignore', 'pipe'] })

  let client
  try {
    client = new CdpClient(await waitForWebSocketUrl(chrome))
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
        const entry = message.params.entry
        const expectedLocalActivationFailure = isExpectedLocalActivationFailure(baseUrl, entry)
        if (!expectedLocalActivationFailure) consoleErrors.push(entry.text)
      }
    }
    client.listeners.add(listener)

    try {
      await Promise.all([
        client.send('Page.enable', {}, sessionId),
        client.send('Runtime.enable', {}, sessionId),
        client.send('Log.enable', {}, sessionId),
        client.send('Network.enable', {}, sessionId),
        client.send('Emulation.setDeviceMetricsOverride', {
          width: 1440,
          height: 1000,
          deviceScaleFactor: 1,
          mobile: false,
        }, sessionId),
      ])

      const loaded = client.waitFor('Page.loadEventFired', sessionId)
      await client.send('Page.navigate', { url: `${baseUrl}/paths` }, sessionId)
      await loaded
      const initial = await waitForValue(
        client,
        sessionId,
        discoverySnapshotExpression,
        (value) => value?.ready && value.selectedLabel === 'Recommended',
        'recommended discovery catalog',
      )

      await client.send('Runtime.evaluate', {
        expression: `document.querySelector('[data-discovery-sort-menu] summary')?.click()`,
      }, sessionId)
      const opened = await waitForValue(
        client,
        sessionId,
        discoverySnapshotExpression,
        (value) => value?.menuOpen,
        'open discovery Sort menu',
      )
      if (!opened.menuOpen) throw new Error('The discovery Sort menu did not open on its first activation.')

      await client.send('Network.emulateNetworkConditions', {
        offline: false,
        latency: 1_400,
        downloadThroughput: 750_000,
        uploadThroughput: 250_000,
        connectionType: 'cellular3g',
      }, sessionId)
      await client.send('Runtime.evaluate', {
        expression: `document.querySelector('[data-discovery-navigation-kind="sort"][href*="sort=newest"]')?.click()`,
      }, sessionId)

      const acknowledged = await waitForValue(
        client,
        sessionId,
        discoverySnapshotExpression,
        (value) => (
          value?.selectedLabel === 'Newest…' &&
          value.summaryBusy === 'true' &&
          value.pendingBusy === 'true' &&
          value.pendingDisabled === 'true' &&
          value.pendingVisible
        ),
        'immediate Newest sort acknowledgement',
        1_000,
      )
      if (!acknowledged.pendingHref.includes('sort=newest')) {
        throw new Error(`Pending feedback targeted ${acknowledged.pendingHref || '(missing)'} instead of the Newest sort.`)
      }

      await client.send('Network.emulateNetworkConditions', {
        offline: false,
        latency: 0,
        downloadThroughput: -1,
        uploadThroughput: -1,
        connectionType: 'none',
      }, sessionId)
      const completed = await waitForValue(
        client,
        sessionId,
        discoverySnapshotExpression,
        (value) => (
          value?.href.includes('sort=newest') &&
          value.selectedLabel === 'Newest' &&
          value.newestCurrent === 'true' &&
          !value.pendingHref &&
          value.cards?.length > 1
        ),
        'completed Newest discovery navigation',
        20_000,
      )

      if (JSON.stringify(completed.cards) === JSON.stringify(initial.cards)) {
        throw new Error('Newest navigation changed the URL and label but left the visible result ordering unchanged.')
      }
      if (consoleErrors.length > 0) {
        throw new Error(`Discovery navigation logged errors: ${[...new Set(consoleErrors)].join(' | ')}`)
      }

      console.log('Discovery Sort menu, immediate pending acknowledgement, URL state, selected label, and result ordering browser guard passed.')
    } finally {
      client.listeners.delete(listener)
      await client.send('Target.closeTarget', { targetId })
    }
  } finally {
    client?.close()
    chrome.kill('SIGTERM')
    rmSync(profile, { recursive: true, force: true, maxRetries: 8, retryDelay: 125 })
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
