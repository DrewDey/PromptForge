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
  const options = {
    baseUrl: 'http://localhost:3012',
    parentRoute: '/hp-10bii-calculator-demo#source-run-path',
    childRoute: '/school-desk-hp-calculator-fork-demo#source-run-path',
    grandchildRoute: '/qa/fork-lineage-grandchild-fixture#source-run-path',
    nestedChildRoute: '/airlock-zero-swarm-shift-fork-demo#source-run-path',
  }

  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index]
    const value = argv[index + 1]
    if (!value) throw new Error(`Missing value after ${key}.`)
    if (key === '--base-url') options.baseUrl = value
    else if (key === '--parent-route') options.parentRoute = value
    else if (key === '--child-route') options.childRoute = value
    else if (key === '--grandchild-route') options.grandchildRoute = value
    else if (key === '--nested-child-route') options.nestedChildRoute = value
    else throw new Error(`Unknown argument: ${key}`)
    index += 1
  }

  options.baseUrl = new URL(options.baseUrl).origin
  return options
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
    await new Promise((resolve) => setTimeout(resolve, 75))
  }
  throw new Error(`${label} timed out; last value was ${JSON.stringify(lastValue)}.`)
}

async function navigate(client, sessionId, url) {
  await client.send('Page.navigate', { url }, sessionId)
  await waitForValue(
    client,
    sessionId,
    `document.readyState === 'complete' && Boolean(document.querySelector('#source-run-path'))`,
    Boolean,
    `build path at ${url}`,
  )
}

const branchButtonsExpression = `(() => {
  const buttons=[...document.querySelectorAll('[data-response-fork-destination-panel] button')];
  return [...new Set(buttons.map((button)=>button.getAttribute('aria-label') || button.textContent?.trim() || ''))].filter(Boolean);
})()`

const lineageSnapshotExpression = `(() => {
  const roots=[...document.querySelectorAll('[data-project-fork-build-path]')];
  const root=roots[0];
  if (!root) return null;
  const unique=(values)=>[...new Set(values.filter(Boolean))];
  const inherited=unique([...root.querySelectorAll('[data-fork-inherited-step]')].map((node)=>node.getAttribute('data-fork-inherited-step')));
  const sourceResponses=unique([...root.querySelectorAll('[data-fork-source-response]')].map((node)=>node.closest('[data-fork-inherited-step]')?.getAttribute('data-fork-inherited-step')));
  const continuation=unique([...root.querySelectorAll('[data-fork-continuation]')].map((node)=>node.getAttribute('data-fork-continuation')));
  const artifactPaths=unique([...root.querySelectorAll('[data-fork-display-artifact]')].map((node)=>node.getAttribute('data-fork-display-artifact')));
  const trail=[...root.querySelectorAll('nav[aria-label="Fork lineage"] li')].map((node)=>node.textContent?.trim() || '').filter(Boolean);
  const desktopPath=root.querySelector('[data-fork-desktop-path]');
  const desktopSourceResponse=desktopPath?.querySelector('aside [data-fork-source-response="true"]');
  const sourceLane=desktopPath?.querySelector('[data-fork-source-lane]');
  const connectorLane=desktopPath?.querySelector('[data-fork-connector-lane]');
  const continuationLane=desktopPath?.querySelector('[data-fork-continuation-lane]');
  const connector=desktopPath?.querySelector('[data-fork-response-connector]');
  const socket=desktopPath?.querySelector('[data-fork-response-socket]');
  const sourceResponseRect=desktopSourceResponse?.getBoundingClientRect();
  const connectorRect=connector?.getBoundingClientRect();
  const sourceCenter=sourceResponseRect ? sourceResponseRect.top + sourceResponseRect.height / 2 : null;
  const connectorCenter=connectorRect ? connectorRect.top + connectorRect.height / 2 : null;
  const rect=(node)=>{
    const value=node?.getBoundingClientRect();
    return value ? {
      left: value.left,
      right: value.right,
      top: value.top,
      bottom: value.bottom,
      width: value.width,
      height: value.height,
    } : null;
  };
  return {
    count: roots.length,
    mode: root.getAttribute('data-project-fork-build-path-mode'),
    title: root.querySelector('h3')?.textContent?.trim() || '',
    inherited,
    sourceResponses,
    continuation,
    artifactPaths,
    trail,
    connector: {
      step: connector?.getAttribute('data-fork-response-connector-step') || '',
      visible: Boolean(connectorRect && connectorRect.width > 0 && connectorRect.height > 0 && Number.parseFloat(getComputedStyle(connector).opacity) > 0),
      sourceCenter,
      connectorCenter,
      delta: sourceCenter === null || connectorCenter === null ? null : Math.abs(sourceCenter - connectorCenter),
    },
    desktopGeometry: {
      layout: desktopPath?.getAttribute('data-fork-desktop-layout') || '',
      gridColumns: desktopPath ? getComputedStyle(desktopPath).gridTemplateColumns.trim().split(' ').filter(Boolean) : [],
      sourceLane: rect(sourceLane),
      connectorLane: rect(connectorLane),
      continuationLane: rect(continuationLane),
      connector: rect(connector),
      socket: rect(socket),
    },
  };
})()`

function assertDesktopBranchGeometry(snapshot, label) {
  const geometry = snapshot.desktopGeometry
  if (geometry?.layout !== 'branch') throw new Error(`${label} is missing the explicit desktop branch layout contract.`)
  if (geometry.gridColumns?.length !== 3) {
    throw new Error(`${label} rendered ${geometry.gridColumns?.length ?? 0} desktop grid columns instead of three.`)
  }
  const { sourceLane, connectorLane, continuationLane, connector, socket } = geometry
  if (![sourceLane, connectorLane, continuationLane, connector, socket].every(Boolean)) {
    throw new Error(`${label} did not render all source, connector, socket, and continuation geometry.`)
  }
  if (sourceLane.width < 240) throw new Error(`${label} source lane collapsed to ${sourceLane.width}px.`)
  if (connectorLane.width < 64) throw new Error(`${label} connector lane collapsed to ${connectorLane.width}px.`)
  if (continuationLane.width <= sourceLane.width) {
    throw new Error(`${label} continuation lane (${continuationLane.width}px) did not retain the primary workspace over the ${sourceLane.width}px source lane.`)
  }
  if (sourceLane.right > connectorLane.left + 1 || connectorLane.right > continuationLane.left + 1) {
    throw new Error(`${label} source, connector, and continuation lanes are not ordered left to right.`)
  }
  if (Math.abs(sourceLane.top - continuationLane.top) > 2) {
    throw new Error(`${label} desktop source and continuation lanes do not share a coherent top edge.`)
  }
  if (connector.width < 64 || connector.height < 20) {
    throw new Error(`${label} response connector is only ${connector.width}x${connector.height}px.`)
  }
  if (socket.width < 44 || socket.height < 44) {
    throw new Error(`${label} response socket is only ${socket.width}x${socket.height}px.`)
  }
}

function assertLineageSnapshot(snapshot, mode, label) {
  if (!snapshot) throw new Error(`${label} did not mount the shared fork workspace.`)
  if (snapshot.count !== 1) throw new Error(`${label} mounted ${snapshot.count} fork workspaces instead of one.`)
  if (snapshot.mode !== mode) throw new Error(`${label} mounted mode ${snapshot.mode || '(missing)'} instead of ${mode}.`)
  if (!snapshot.title) throw new Error(`${label} did not show the active branch title.`)
  if (snapshot.inherited.length === 0) throw new Error(`${label} did not preserve inherited prompt-response history.`)
  if (snapshot.sourceResponses.length !== 1) throw new Error(`${label} did not identify exactly one source response.`)
  if (snapshot.continuation.length === 0) throw new Error(`${label} did not show the child continuation.`)
  if (snapshot.artifactPaths.length === 0) throw new Error(`${label} did not expose an inline child artifact action.`)
  if (!snapshot.connector?.visible) throw new Error(`${label} did not render the exact-response connector.`)
  if (snapshot.connector.step !== snapshot.sourceResponses[0]) {
    throw new Error(`${label} connector targets ${snapshot.connector.step || '(missing)'} instead of ${snapshot.sourceResponses[0]}.`)
  }
  if (!Number.isFinite(snapshot.connector.delta) || snapshot.connector.delta > 2) {
    throw new Error(`${label} connector misses the exact response center by ${snapshot.connector.delta}px.`)
  }
  assertDesktopBranchGeometry(snapshot, label)
}

async function selectOnlyBranch(client, sessionId, label) {
  const branchLabels = await waitForValue(
    client,
    sessionId,
    branchButtonsExpression,
    (value) => Array.isArray(value) && value.length > 0,
    `${label} branch destination`,
  )
  if (branchLabels.length !== 1) {
    throw new Error(`${label} exposed ${branchLabels.length} distinct branches; expected exactly one for the selected model run.`)
  }

  await waitForValue(
    client,
    sessionId,
    `(() => {
      const button=document.querySelector('[data-response-fork-destination-panel] button');
      const showcase=document.querySelector('[data-source-run-showcase-hydrated]');
      return {
        button: Boolean(button),
        hydrated: showcase?.getAttribute('data-source-run-showcase-hydrated') || '',
        readyState: document.readyState,
        scripts: document.scripts.length,
        buttonKeys: button ? Object.keys(button).filter((key) => key.startsWith('__react')).slice(0, 4) : [],
      };
    })()`,
    (value) => value?.button && value?.hydrated === 'true',
    `${label} hydrated branch control`,
  )
  await client.send('Runtime.evaluate', {
    expression: `document.querySelector('[data-response-fork-destination-panel] button')?.click()`,
  }, sessionId)
  return branchLabels[0]
}

async function waitForLineage(client, sessionId, mode, label) {
  return waitForValue(
    client,
    sessionId,
    lineageSnapshotExpression,
    (value) => (
      value?.count === 1 &&
      value.mode === mode &&
      value.continuation?.length > 0 &&
      value.connector?.visible &&
      value.desktopGeometry?.gridColumns?.length === 3 &&
      value.desktopGeometry?.connector?.width >= 64 &&
      value.desktopGeometry?.socket?.width >= 44 &&
      Number.isFinite(value.connector?.delta) &&
      value.connector.delta <= 2
    ),
    `${label} shared lineage workspace`,
  )
}

async function verifyArtifactDisplay(client, sessionId, snapshot, label) {
  const expectedPath = snapshot.artifactPaths[0]
  await client.send('Runtime.evaluate', {
    expression: `(() => {
      const expected=${JSON.stringify(expectedPath)};
      [...document.querySelectorAll('[data-fork-display-artifact]')]
        .find((node)=>node.getAttribute('data-fork-display-artifact')===expected)?.click();
    })()`,
  }, sessionId)

  const mounted = await waitForValue(
    client,
    sessionId,
    `(() => {
      const expected=${JSON.stringify(expectedPath)};
      const frame=[...document.querySelectorAll('[data-artifact-package-id]')]
        .find((node)=>node.getAttribute('data-artifact-path')===expected);
      return {
        found: Boolean(frame),
        loading: Boolean(document.querySelector('[data-artifact-loading]')),
        error: document.querySelector('[data-artifact-load-error]')?.getAttribute('data-artifact-load-error') || '',
        iframe: Boolean(frame?.querySelector('iframe[srcdoc]')),
        sandbox: frame?.querySelector('iframe')?.getAttribute('sandbox') || '',
      };
    })()`,
    (value) => value?.found && !value.loading && value.iframe,
    `${label} inline artifact ${expectedPath}`,
  )
  if (mounted.error) throw new Error(`${label} inline artifact rendered ${mounted.error}.`)
  if (mounted.sandbox !== 'allow-scripts allow-pointer-lock') {
    throw new Error(`${label} inline artifact has unexpected sandbox tokens: ${mounted.sandbox}.`)
  }
}

async function verifyConnectorAfterSourceExpansion(client, sessionId, label) {
  const expanded = await client.send('Runtime.evaluate', {
    expression: `(() => {
      const summary=document.querySelector(
        '[data-fork-desktop-path] aside [data-fork-source-response="true"] details summary'
      );
      if (!summary) return false;
      summary.click();
      return true;
    })()`,
    returnByValue: true,
  }, sessionId)
  if (!expanded.result.value) {
    throw new Error(`${label} did not expose the exact source-response disclosure.`)
  }

  const snapshot = await waitForValue(
    client,
    sessionId,
    lineageSnapshotExpression,
    (value) => (
      value?.connector?.visible &&
      Number.isFinite(value.connector?.delta) &&
      value.connector.delta <= 2
    ),
    `${label} connector realignment after source-response expansion`,
  )
  if (snapshot.connector.step !== snapshot.sourceResponses[0]) {
    throw new Error(`${label} connector changed source responses after disclosure expansion.`)
  }
}

async function verifyNestedForkCreation(client, sessionId, nestedChildUrl) {
  await navigate(client, sessionId, nestedChildUrl)
  await waitForLineage(client, sessionId, 'child', 'nested-fork child page')

  const nested = await waitForValue(
    client,
    sessionId,
    `(() => {
      const links=[...document.querySelectorAll('[data-fork-continuation-fork]')];
      if (links.length !== 1) return { count: links.length };
      const url=new URL(links[0].href);
      return {
        count: links.length,
        path: url.pathname,
        sourceProjectId: url.searchParams.get('fork'),
        sourceRunId: url.searchParams.get('forkRun'),
        sourceStepId: url.searchParams.get('forkStep'),
        sourceStepNumber: url.searchParams.get('forkStepNumber'),
        sourceArtifactPath: url.searchParams.get('forkArtifact'),
        sourceArtifactSha256: url.searchParams.get('forkArtifactSha256'),
        parentForkId: url.searchParams.get('parentFork'),
        depth: url.searchParams.get('forkDepth'),
        promptFamilyId: url.searchParams.get('promptFamily'),
      };
    })()`,
    (value) => value?.count === 1,
    'nested fork creation action',
  )
  if (nested.path !== '/build') throw new Error(`Nested fork action targets ${nested.path || '(missing)'} instead of /build.`)
  if (!nested.sourceProjectId || nested.parentForkId !== nested.sourceProjectId) {
    throw new Error('Nested fork action did not preserve the immediate child as its parent.')
  }
  if (!nested.sourceRunId || !nested.sourceStepId || !nested.promptFamilyId) {
    throw new Error('Nested fork action omitted exact run, response, or prompt-family identity.')
  }
  if (!nested.sourceStepId.endsWith(`:step:${nested.sourceStepNumber}`)) {
    throw new Error('Nested fork response ID and response number drifted.')
  }
  if (!nested.sourceArtifactPath?.startsWith('public/artifacts/')) {
    throw new Error('Nested fork action omitted its exact public artifact path.')
  }
  if (!/^[0-9a-f]{64}$/.test(nested.sourceArtifactSha256 ?? '')) {
    throw new Error('Nested fork action omitted its exact artifact SHA-256.')
  }
  if (nested.depth !== '1') {
    throw new Error(`Nested fork action used depth ${nested.depth ?? '(missing)'} instead of 1.`)
  }
}

async function modelVariantRoutes(client, sessionId) {
  return waitForValue(
    client,
    sessionId,
    `(() => {
      const rows=[...document.querySelectorAll('[data-model-variant-run]')];
      if (rows.length === 0) return [];
      const urls=[location.href];
      for (const row of rows) {
        const href=row.querySelector('[data-model-variant-view]')?.href;
        if (href) urls.push(href);
      }
      return [...new Set(urls)];
    })()`,
    Array.isArray,
    'optional model variant routes',
  )
}

async function verifyModelRunIsolation(client, sessionId, parentUrl) {
  await navigate(client, sessionId, parentUrl)
  const routes = await modelVariantRoutes(client, sessionId)
  if (routes.length === 0) return false
  if (routes.length !== 3) throw new Error(`Model fork showcase exposed ${routes.length} runs instead of three.`)

  const branchTitles = []
  for (const route of routes) {
    await navigate(client, sessionId, route)
    await selectOnlyBranch(client, sessionId, `model route ${route}`)
    const snapshot = await waitForLineage(client, sessionId, 'parent', `model route ${route}`)
    assertLineageSnapshot(snapshot, 'parent', `model route ${route}`)
    branchTitles.push(snapshot.title)
  }
  if (new Set(branchTitles).size !== routes.length) {
    throw new Error(`Model runs did not stay isolated to distinct branches: ${branchTitles.join(', ')}.`)
  }
  return true
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  const parentUrl = new URL(options.parentRoute, options.baseUrl).href
  const childUrl = new URL(options.childRoute, options.baseUrl).href
  const grandchildUrl = new URL(options.grandchildRoute, options.baseUrl).href
  const nestedChildUrl = new URL(options.nestedChildRoute, options.baseUrl).href
  const executable = chromeExecutable()
  if (!executable) throw new Error('Chrome was not found for the project-fork browser guard.')

  const profile = mkdtempSync(path.join(tmpdir(), 'pathforge-project-fork-browser-'))
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
        const entry = message.params.entry
        const expectedLocalActivationFailure = isExpectedLocalActivationFailure(options.baseUrl, entry)
        if (!expectedLocalActivationFailure) consoleErrors.push(entry.text)
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

      await navigate(client, sessionId, parentUrl)
      await selectOnlyBranch(client, sessionId, 'parent page')
      const parentSnapshot = await waitForLineage(client, sessionId, 'parent', 'parent page')
      assertLineageSnapshot(parentSnapshot, 'parent', 'Parent page')
      await verifyArtifactDisplay(client, sessionId, parentSnapshot, 'Parent page')

      await navigate(client, sessionId, childUrl)
      const childSnapshot = await waitForLineage(client, sessionId, 'child', 'child page')
      assertLineageSnapshot(childSnapshot, 'child', 'Child page')
      if (JSON.stringify(childSnapshot.inherited) !== JSON.stringify(parentSnapshot.inherited)) {
        throw new Error('Parent and child pages did not preserve the same inherited source path.')
      }
      if (JSON.stringify(childSnapshot.sourceResponses) !== JSON.stringify(parentSnapshot.sourceResponses)) {
        throw new Error('Parent and child pages did not anchor the branch to the same exact source response.')
      }
      if (JSON.stringify(childSnapshot.continuation) !== JSON.stringify(parentSnapshot.continuation)) {
        throw new Error(`Parent and child pages did not render the same fork continuation (${JSON.stringify(parentSnapshot.continuation)} vs ${JSON.stringify(childSnapshot.continuation)}).`)
      }
      await verifyArtifactDisplay(client, sessionId, childSnapshot, 'Child page')
      await verifyConnectorAfterSourceExpansion(client, sessionId, 'Child page')

      await navigate(client, sessionId, grandchildUrl)
      const grandchildSnapshot = await waitForLineage(client, sessionId, 'child', 'grandchild fixture')
      assertLineageSnapshot(grandchildSnapshot, 'child', 'Grandchild fixture')
      if (grandchildSnapshot.inherited.length < 3) {
        throw new Error(`Grandchild fixture preserved only ${grandchildSnapshot.inherited.length} inherited steps.`)
      }
      if (grandchildSnapshot.trail.length !== 3) {
        throw new Error(`Grandchild fixture rendered ${grandchildSnapshot.trail.length} lineage crumbs instead of three.`)
      }
      if (!grandchildSnapshot.sourceResponses[0]?.endsWith(':step:3')) {
        throw new Error(`Grandchild fixture anchored to ${grandchildSnapshot.sourceResponses[0] || '(missing)'} instead of its immediate response 03.`)
      }
      await verifyArtifactDisplay(client, sessionId, grandchildSnapshot, 'Grandchild fixture')
      await verifyNestedForkCreation(client, sessionId, nestedChildUrl)

      await client.send('Emulation.setDeviceMetricsOverride', {
        width: 390,
        height: 844,
        deviceScaleFactor: 1,
        mobile: true,
      }, sessionId)
      await navigate(client, sessionId, childUrl)
      const mobile = await waitForValue(
        client,
        sessionId,
        `(() => {
          const root=document.querySelector('[data-project-fork-build-path]');
          const disclosure=root?.querySelector('details[data-fork-inherited-path]');
          const desktopPath=[...root?.querySelectorAll('aside[data-fork-inherited-path]') || []][0];
          const connectorLane=root?.querySelector('[data-fork-connector-lane]');
          const continuationLane=root?.querySelector('[data-fork-continuation-lane]');
          const rootRect=root?.getBoundingClientRect();
          const continuationRect=continuationLane?.getBoundingClientRect();
          return {
            mode: root?.getAttribute('data-project-fork-build-path-mode') || '',
            overflow: document.documentElement.scrollWidth - window.innerWidth,
            disclosureVisible: Boolean(disclosure && getComputedStyle(disclosure).display !== 'none'),
            desktopHidden: Boolean(desktopPath && getComputedStyle(desktopPath).display === 'none'),
            connectorHidden: Boolean(connectorLane && getComputedStyle(connectorLane).display === 'none'),
            continuationWidth: continuationRect?.width || 0,
            availableWidth: rootRect?.width || 0,
          };
        })()`,
        (value) => value?.mode === 'child' && value.disclosureVisible,
        '390px child lineage layout',
      )
      if (mobile.overflow > 1) throw new Error(`390px child lineage overflows horizontally by ${mobile.overflow}px.`)
      if (!mobile.desktopHidden) throw new Error('390px child lineage did not collapse the desktop inherited rail.')
      if (!mobile.connectorHidden) throw new Error('390px child lineage did not collapse the desktop connector lane.')
      if (mobile.continuationWidth <= 0 || mobile.continuationWidth > mobile.availableWidth) {
        throw new Error(`390px continuation width ${mobile.continuationWidth}px is not contained by its ${mobile.availableWidth}px fork workspace.`)
      }

      await client.send('Emulation.setDeviceMetricsOverride', {
        width: 1440,
        height: 1000,
        deviceScaleFactor: 1,
        mobile: false,
      }, sessionId)
      const modelRunIsolationVerified = await verifyModelRunIsolation(client, sessionId, parentUrl)

      if (consoleErrors.length > 0) {
        throw new Error(`Project-fork browser flow logged errors: ${[...new Set(consoleErrors)].join(' | ')}`)
      }

      console.log(
        modelRunIsolationVerified
          ? 'Parent/child/grandchild fork lineage, artifact display, three-run isolation, and mobile browser guard passed.'
          : 'Parent/child/grandchild fork lineage, artifact display, and mobile browser guard passed; model-run isolation was not applicable on this route.',
      )
    } catch (error) {
      const browserEvidence = [...new Set(consoleErrors)].join(' | ')
      throw new Error(
        `${error instanceof Error ? error.message : String(error)}` +
        (browserEvidence ? ` Browser errors: ${browserEvidence}` : ''),
      )
    } finally {
      client.listeners.delete(listener)
      await client.send('Target.closeTarget', { targetId })
    }
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
