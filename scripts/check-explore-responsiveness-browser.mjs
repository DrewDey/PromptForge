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

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 1000, mobile: false },
  { name: 'mobile-390', width: 390, height: 844, mobile: true },
]

function parseArgs(argv) {
  let baseUrl = 'http://127.0.0.1:3011'
  let json = false
  let requireFeedback = false
  let repeat = 1

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--base-url') baseUrl = argv[++index] ?? ''
    else if (arg === '--json') json = true
    else if (arg === '--require-feedback') requireFeedback = true
    else if (arg === '--repeat') repeat = Number.parseInt(argv[++index] ?? '', 10)
    else throw new Error(`Unknown argument: ${arg}`)
  }

  if (!Number.isInteger(repeat) || repeat < 1 || repeat > 10) {
    throw new Error('--repeat must be an integer from 1 through 10.')
  }

  return { baseUrl: new URL(baseUrl).origin, json, repeat, requireFeedback }
}

async function evaluate(client, sessionId, expression, awaitPromise = false) {
  const { result, exceptionDetails } = await client.send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise,
  }, sessionId)
  if (exceptionDetails) throw new Error(exceptionDetails.text ?? 'Browser evaluation failed.')
  return result.value
}

async function waitForValue(client, sessionId, expression, predicate, label, timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs
  let value
  while (Date.now() < deadline) {
    value = await evaluate(client, sessionId, expression)
    if (predicate(value)) return value
    await new Promise((resolve) => setTimeout(resolve, 25))
  }
  throw new Error(`${label} timed out; last value was ${JSON.stringify(value)}.`)
}

function roundMeasurement(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  return Math.round(value * 10) / 10
}

async function measureLink(client, sessionId, config) {
  const serialized = JSON.stringify(config)
  return evaluate(client, sessionId, `(async () => {
    const config = ${serialized};
    const normalize = (value) => value.replace(/\\s+/g, ' ').trim();
    const links = [...document.querySelectorAll(config.container + ' a')];
    const link = links.find((candidate) => normalize(candidate.textContent || '') === config.label);
    if (!link) throw new Error('Missing link: ' + config.label);
    const target = new URL(link.href);
    const beforeTitle = normalize(document.querySelector('.path-catalog-grid .path-card h3')?.textContent || '');
    const sortLabel = document.querySelector('[data-discovery-sort-label]');
    const initialSortLabel = normalize(sortLabel?.textContent || '');
    performance.clearResourceTimings();
    const startedAt = performance.now();
    let acknowledgementAt = null;
    let urlAt = null;
    let resultAt = null;
    const hasFeedback = () => {
      const currentSortLabel = normalize(sortLabel?.textContent || '');
      const sortLabelChanged = Boolean(
        initialSortLabel &&
        currentSortLabel &&
        currentSortLabel !== initialSortLabel &&
        /…|\.\.\./.test(currentSortLabel),
      );
      return Boolean(document.querySelector(
        '[data-discovery-navigation-pending="true"], summary[aria-busy="true"], [data-explore-navigation-status], [data-explore-pending], .pf-paths[aria-busy="true"]',
      )) || sortLabelChanged;
    };
    const record = () => {
      const now = performance.now();
      if (acknowledgementAt === null && hasFeedback()) acknowledgementAt = now;
      if (urlAt === null && location.pathname === target.pathname && location.search === target.search) urlAt = now;
      const activeLink = [...document.querySelectorAll(config.container + ' a')]
        .find((candidate) => normalize(candidate.textContent || '') === config.label);
      const title = normalize(document.querySelector('.path-catalog-grid .path-card h3')?.textContent || '');
      const resultChanged = config.kind === 'sort'
        ? normalize(document.querySelector('.path-sort-menu summary strong')?.textContent || '') === config.label && title !== beforeTitle
        : activeLink?.classList.contains('is-active') && normalize(document.querySelector('.path-section-heading h2')?.textContent || '').includes('path');
      if (resultAt === null && resultChanged) resultAt = now;
    };
    const observer = new MutationObserver(record);
    observer.observe(document.documentElement, { subtree: true, childList: true, attributes: true });
    link.click();
    await new Promise((resolve, reject) => {
      const deadline = performance.now() + 15000;
      const tick = () => {
        record();
        if (urlAt !== null && resultAt !== null) return resolve();
        if (performance.now() > deadline) return reject(new Error('Navigation timed out for ' + config.label));
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    observer.disconnect();
    const resources = performance.getEntriesByType('resource')
      .filter((entry) => entry.name.includes('_rsc='))
      .map((entry) => ({
        name: entry.name,
        startTime: entry.startTime,
        responseStart: entry.responseStart,
        responseEnd: entry.responseEnd,
        duration: entry.duration,
        transferSize: entry.transferSize,
        encodedBodySize: entry.encodedBodySize,
        decodedBodySize: entry.decodedBodySize,
      }));
    const matchingResources = resources.filter((entry) => {
      const resourceUrl = new URL(entry.name);
      if (resourceUrl.pathname !== target.pathname) return false;
      resourceUrl.searchParams.delete('_rsc');
      return resourceUrl.search === target.search;
    });
    const resource = matchingResources.toSorted((left, right) => (
      right.decodedBodySize - left.decodedBodySize || right.startTime - left.startTime
    ))[0] || resources.toSorted((left, right) => (
      right.decodedBodySize - left.decodedBodySize || right.startTime - left.startTime
    ))[0] || null;
    return {
      label: config.label,
      target: target.pathname + target.search,
      acknowledgementMs: acknowledgementAt === null ? null : acknowledgementAt - startedAt,
      urlMs: urlAt - startedAt,
      completeMs: resultAt - startedAt,
      requestDispatchMs: resource ? resource.startTime - startedAt : null,
      responseStartMs: resource ? resource.responseStart - startedAt : null,
      responseEndMs: resource ? resource.responseEnd - startedAt : null,
      browserApplyMs: resource ? resultAt - resource.responseEnd : null,
      transferSize: resource?.transferSize ?? null,
      encodedBodySize: resource?.encodedBodySize ?? null,
      decodedBodySize: resource?.decodedBodySize ?? null,
      rscResourceCount: resources.length,
      competingRscCount: resources.filter((entry) => entry !== resource).length,
      beforeTitle,
      afterTitle: normalize(document.querySelector('.path-catalog-grid .path-card h3')?.textContent || ''),
      finalUrl: location.pathname + location.search,
    };
  })()`, true)
}

async function measureViewport(client, baseUrl, viewport) {
  const { targetId } = await client.send('Target.createTarget', { url: 'about:blank' })
  const { sessionId } = await client.send('Target.attachToTarget', { targetId, flatten: true })
  const consoleErrors = []
  const httpFailures = []
  const listener = (message) => {
    if (message.sessionId !== sessionId) return
    if (message.method === 'Runtime.exceptionThrown') {
      consoleErrors.push(message.params.exceptionDetails?.exception?.description ?? message.params.exceptionDetails?.text ?? 'Runtime exception')
    }
    if (message.method === 'Log.entryAdded' && message.params.entry?.level === 'error') {
      const entry = message.params.entry
      const isLocalVercelInstrumentation = (
        baseUrl.startsWith('http://127.0.0.1') || baseUrl.startsWith('http://localhost')
      ) && (
        entry.url?.includes('/_vercel/') ||
        entry.url?.includes('/api/activation-events') ||
        entry.text.includes('/_vercel/') ||
        entry.text.includes('/api/activation-events')
      )
      if (!isLocalVercelInstrumentation) consoleErrors.push(entry.text)
    }
    if (message.method === 'Network.responseReceived' && message.params.response?.status >= 400) {
      const response = message.params.response
      const isExpectedLocalInstrumentation = (
        baseUrl.startsWith('http://127.0.0.1') || baseUrl.startsWith('http://localhost')
      ) && (
        response.url.includes('/_vercel/') || response.url.includes('/api/activation-events')
      )
      if (!isExpectedLocalInstrumentation) {
        httpFailures.push(`${response.status} ${response.url}`)
      }
    }
  }
  client.listeners.add(listener)

  try {
    await Promise.all([
      client.send('Page.enable', {}, sessionId),
      client.send('Runtime.enable', {}, sessionId),
      client.send('Log.enable', {}, sessionId),
      client.send('Network.enable', {}, sessionId),
      client.send('Network.setCacheDisabled', { cacheDisabled: true }, sessionId),
      client.send('Emulation.setDeviceMetricsOverride', {
        width: viewport.width,
        height: viewport.height,
        deviceScaleFactor: 1,
        mobile: viewport.mobile,
      }, sessionId),
      client.send('Page.addScriptToEvaluateOnNewDocument', {
        source: `(() => {
          window.__exploreHydration = { readyAt: null };
          const probe = () => {
            const link = document.querySelector('.path-sort-popover a');
            if (link && Object.keys(link).some((key) => key.startsWith('__reactProps$'))) {
              window.__exploreHydration.readyAt = performance.now();
              return;
            }
            requestAnimationFrame(probe);
          };
          requestAnimationFrame(probe);
        })();`,
      }, sessionId),
    ])

    const loaded = client.waitFor('Page.loadEventFired', sessionId, 20_000)
    await client.send('Page.navigate', { url: `${baseUrl}/paths` }, sessionId)
    await loaded
    await waitForValue(
      client,
      sessionId,
      `({ root: Boolean(document.querySelector('.pf-paths')), readyAt: window.__exploreHydration?.readyAt ?? null })`,
      (value) => value?.root && typeof value.readyAt === 'number',
      `${viewport.name} Explore hydration`,
    )

    const initial = await evaluate(client, sessionId, `(() => {
      const navigation = performance.getEntriesByType('navigation')[0];
      return {
        responseStartMs: navigation.responseStart,
        domContentLoadedMs: navigation.domContentLoadedEventEnd,
        loadMs: navigation.loadEventEnd,
        hydrationReadyMs: window.__exploreHydration.readyAt,
        cardCount: document.querySelectorAll('.path-catalog-grid .path-card').length,
        catalogText: document.querySelector('.path-eyebrow')?.textContent?.replace(/\\s+/g, ' ').trim() ?? '',
        viewportWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      };
    })()`)

    const disclosure = await evaluate(client, sessionId, `(async () => {
      const details = document.querySelector('.path-sort-menu');
      const summary = details?.querySelector('summary');
      const startedAt = performance.now();
      summary?.click();
      await new Promise((resolve) => requestAnimationFrame(resolve));
      return { openMs: performance.now() - startedAt, open: Boolean(details?.open) };
    })()`, true)

    const newest = await measureLink(client, sessionId, {
      container: '.path-sort-popover',
      label: 'Newest',
      kind: 'sort',
    })
    const games = await measureLink(client, sessionId, {
      container: '.path-filter-row',
      label: 'Games',
      kind: 'filter',
    })

    return {
      viewport: viewport.name,
      initial: Object.fromEntries(Object.entries(initial).map(([key, value]) => [key, roundMeasurement(value) ?? value])),
      disclosure: { open: disclosure.open, openMs: roundMeasurement(disclosure.openMs) },
      interactions: [newest, games].map((measurement) => Object.fromEntries(
        Object.entries(measurement).map(([key, value]) => [key, roundMeasurement(value) ?? value]),
      )),
      consoleErrors: [...new Set(consoleErrors)],
      httpFailures: [...new Set(httpFailures)],
    }
  } finally {
    client.listeners.delete(listener)
    await client.send('Target.closeTarget', { targetId })
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  const executable = chromeExecutable()
  if (!executable) throw new Error('Chrome was not found for the Explore responsiveness browser guard.')

  const profile = mkdtempSync(path.join(tmpdir(), 'pathforge-explore-browser-'))
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
    const results = []
    for (let run = 1; run <= options.repeat; run += 1) {
      for (const viewport of VIEWPORTS) {
        results.push({
          ...await measureViewport(client, options.baseUrl, viewport),
          run,
        })
      }
    }

    const failures = []
    for (const result of results) {
      const runLabel = `${result.viewport} run ${result.run}`
      if (result.initial.scrollWidth > result.initial.viewportWidth) failures.push(`${runLabel} overflows horizontally`)
      if (!result.disclosure.open) failures.push(`${runLabel} sort disclosure did not open`)
      if (result.consoleErrors.length > 0) failures.push(`${runLabel} logged browser errors`)
      if (result.httpFailures.length > 0) failures.push(`${runLabel} received failed HTTP responses`)
      for (const interaction of result.interactions) {
        if (interaction.finalUrl !== interaction.target) failures.push(`${runLabel} ${interaction.label} URL did not settle`)
        if (options.requireFeedback && interaction.acknowledgementMs === null) {
          failures.push(`${runLabel} ${interaction.label} had no immediate acknowledgement`)
        }
        if (options.requireFeedback && interaction.acknowledgementMs > 100) {
          failures.push(`${runLabel} ${interaction.label} acknowledgement took ${interaction.acknowledgementMs}ms`)
        }
      }
    }

    const median = (values) => {
      const ordered = values.filter(Number.isFinite).toSorted((left, right) => left - right)
      if (ordered.length === 0) return null
      const middle = Math.floor(ordered.length / 2)
      return ordered.length % 2 === 0
        ? roundMeasurement((ordered[middle - 1] + ordered[middle]) / 2)
        : ordered[middle]
    }
    const measurementSummary = []
    for (const viewport of VIEWPORTS) {
      const viewportResults = results.filter((result) => result.viewport === viewport.name)
      for (const label of ['Newest', 'Games']) {
        const interactions = viewportResults.map((result) => (
          result.interactions.find((interaction) => interaction.label === label)
        ))
        const complete = interactions.map((interaction) => interaction.completeMs)
        const acknowledgements = interactions.map((interaction) => interaction.acknowledgementMs)
        const ttfb = interactions.map((interaction) => (
          interaction.responseStartMs - interaction.requestDispatchMs
        ))
        const transfer = interactions.map((interaction) => (
          interaction.responseEndMs - interaction.responseStartMs
        ))
        measurementSummary.push({
          viewport: viewport.name,
          label,
          runs: interactions.length,
          acknowledgementMedianMs: median(acknowledgements),
          acknowledgementMissingRuns: acknowledgements.filter((value) => value === null).length,
          completeMedianMs: median(complete),
          completeRangeMs: [Math.min(...complete), Math.max(...complete)].map(roundMeasurement),
          serverNetworkTtfbMedianMs: median(ttfb),
          transferMedianMs: median(transfer),
          browserApplyMedianMs: median(interactions.map((interaction) => interaction.browserApplyMs)),
          competingRscMedian: median(interactions.map((interaction) => interaction.competingRscCount)),
        })
      }
    }

    if (options.json) console.log(JSON.stringify({ baseUrl: options.baseUrl, summary: measurementSummary, results, failures }, null, 2))
    else {
      for (const entry of measurementSummary) {
        console.log(`${entry.viewport} ${entry.label}: ack=${entry.acknowledgementMedianMs ?? 'none'}ms complete=${entry.completeMedianMs}ms range=${entry.completeRangeMs.join('-')}ms competing-rsc=${entry.competingRscMedian}`)
      }
    }

    if (failures.length > 0) throw new Error(failures.join('; '))
  } finally {
    client?.close()
    child.kill('SIGTERM')
    rmSync(profile, { recursive: true, force: true, maxRetries: 8, retryDelay: 125 })
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
