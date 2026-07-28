#!/usr/bin/env node

import { spawn } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import {
  CdpClient,
  chromeExecutable,
  waitForWebSocketUrl,
} from './measure-html-artifacts.mjs'
import {
  isExpectedLocalActivationFailure,
  isExpectedLocalFaviconFailure,
  isExpectedLocalVercelScriptFailure,
} from './browser-guard-errors.mjs'

const expectedArtifacts = [
  ['public/artifacts/airlock-zero-blackout-shift-claude-sonnet-5-max.html', '7af1f063c94b567a2e72d7a5c85a9d28aab65b7e77b6d391d3713ec466e3452c'],
  ['public/artifacts/airlock-zero-claude-sonnet-5-max-step-10.html', '11cca990f198047304a4fb802e6345ac1bd735ea7cb3e37455c7886996a7637e'],
  ['public/artifacts/airlock-zero-claude-sonnet-5-max-step-5.html', '80b261205590d1ebd80c111e826810110750d9322f3db97199c13cc1e2f726bf'],
  ['public/artifacts/airlock-zero-claude-sonnet-5-max-step-7.html', '05e963aba2029733bd2cabb94e74f5d2868ea97e7eda01ec3ca7d662e026667e'],
  ['public/artifacts/airlock-zero-gemini-35-flash-step-2.html', '7b14d660c95d448ae7c8bd8df9953819f608c8236fbe35e4a328a9de3a834497'],
  ['public/artifacts/airlock-zero-gemini-35-flash-step-3.html', 'b390710493d8bc2797a1fe211b112ae5d3d8a1f610438f2ebed5aa153028fa35'],
  ['public/artifacts/airlock-zero-gemini-35-flash-step-4.html', '4f6c5c78ad5a2e40b79b88a4f49229472ccec57b407ee37e3bc33f9a7f9bbd69'],
  ['public/artifacts/airlock-zero-gemini-35-flash-step-5.html', '5406a6eadf52fd1b07334adfb60fdf913ffa3b08b57d31edb417fe51124880a2'],
  ['public/artifacts/airlock-zero-gemini-35-flash-step-6.html', 'c9a1131ffb7c2bd8da4133f9ad986f30c5b3e02904f4921f8bec9aebab5eeabc'],
  ['public/artifacts/airlock-zero-gemini-35-flash-step-7.html', 'b330778cc944ef0f6681dddfdd982a606c1db7c9a9aab1fdbc9041a44b9eedac'],
]

const eligibleProvenance = {
  'model-present': {
    currentProjectId: '71500000-0000-4000-8000-000000000001',
    modelVariantId: '72200000-0000-4000-8000-000000000001',
    runId: 'eligible-child-run-b',
    stepId: 'eligible-child-run-b:step:2',
    stepNumber: '2',
    localStepId: '72100000-0000-4000-8000-000000000001',
    localResponsePackageId: 'qa-local-model-response-package-only',
    artifactPath: 'public/artifacts/airlock-zero-gemini-35-flash-step-2.html',
    artifactSha256: '7b14d660c95d448ae7c8bd8df9953819f608c8236fbe35e4a328a9de3a834497',
    promptFamilyId:
      '71000000-0000-4000-8000-000000000001:valid-run-a:step:1',
  },
  'source-run-only': {
    currentProjectId: '71500000-0000-4000-8000-000000000003',
    modelVariantId: null,
    runId: '72500000-0000-4000-8000-000000000001',
    stepId:
      '71500000-0000-4000-8000-000000000003:72500000-0000-4000-8000-000000000001:step:3',
    stepNumber: '3',
    localStepId: '72100000-0000-4000-8000-000000000003',
    localResponsePackageId: 'qa-local-source-run-response-package-only',
    artifactPath: 'public/artifacts/airlock-zero-gemini-35-flash-step-3.html',
    artifactSha256: 'b390710493d8bc2797a1fe211b112ae5d3d8a1f610438f2ebed5aa153028fa35',
    promptFamilyId:
      '71000000-0000-4000-8000-000000000001:71000000-0000-4000-8000-000000000001:71400000-0000-4000-8000-000000000001:step:2',
  },
}

function parseArgs(argv) {
  const options = {
    baseUrl: 'http://localhost:3012',
    route: '/qa/fork-lineage-depth-10-fixture?run=qa-prepared-current-run-B',
    screenshotDir: null,
    measurementsPath: null,
  }
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index]
    const value = argv[index + 1]
    if (!value) throw new Error(`Missing value after ${key}.`)
    if (key === '--base-url') options.baseUrl = new URL(value).origin
    else if (key === '--route') options.route = value
    else if (key === '--screenshot-dir') options.screenshotDir = path.resolve(value)
    else if (key === '--measurements') options.measurementsPath = path.resolve(value)
    else throw new Error(`Unknown argument: ${key}`)
    index += 1
  }
  return options
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
        ?? exceptionDetails.text
        ?? 'Browser evaluation failed.',
    )
  }
  return result.value
}

async function waitFor(client, sessionId, expression, predicate, label, timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs
  let value
  while (Date.now() < deadline) {
    value = await evaluate(client, sessionId, expression)
    if (predicate(value)) return value
    await new Promise((resolve) => setTimeout(resolve, 75))
  }
  throw new Error(`${label} timed out; last value: ${JSON.stringify(value)}`)
}

async function navigate(client, sessionId, url) {
  await client.send('Page.navigate', { url }, sessionId)
  await waitFor(
    client,
    sessionId,
    `document.readyState === 'complete' && document.querySelector('[data-depth-ten-fixture]')?.getAttribute('data-fixture-hydrated') === 'true' && Boolean(document.querySelector('[data-fork-generation-workspace]'))`,
    Boolean,
    `depth-10 fixture at ${url}`,
  )
}

async function verifyGenericResponseForkActions(
  client,
  sessionId,
  baseUrl,
  viewportName,
  screenshotDir,
) {
  const url = new URL('/qa/generic-fork-action-fixture', baseUrl).href
  await client.send('Page.navigate', { url }, sessionId)
  const snapshot = await waitFor(
    client,
    sessionId,
    `(() => {
      if (document.readyState !== 'complete') return null;
      const root=document.querySelector('[data-generic-fork-action-fixture]');
      if (!root) return null;
      const positive=[...root.querySelectorAll('[data-generic-fork-positive] a')];
      const negative=[...root.querySelectorAll('[data-generic-fork-negative] a')];
      return {
        positive:positive.map((link)=>{
          const url=new URL(link.href);
          const style=getComputedStyle(link);
          const rect=link.getBoundingClientRect();
          return {
            path:url.pathname,
            project:url.searchParams.get('fork'),
            step:url.searchParams.get('forkStep'),
            stepNumber:url.searchParams.get('forkStepNumber'),
            family:url.searchParams.get('promptFamily'),
            run:url.searchParams.get('forkRun'),
            artifact:url.searchParams.get('forkArtifact'),
            sha:url.searchParams.get('forkArtifactSha256'),
            visible:style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0,
            width:rect.width,
            height:rect.height,
          };
        }),
        negativeCount:negative.length,
        negativeReason:root.querySelector('[data-generic-fork-negative]')?.getAttribute('data-generic-project-fork-reason'),
        overflow:document.documentElement.scrollWidth-window.innerWidth,
      };
    })()`,
    (value) => (
      value?.positive?.length === 3 &&
      value.positive.some((action) => action.visible)
    ),
    `generic response action fixture at ${viewportName}`,
  )
  for (const action of snapshot.positive) {
    if (
      action.path !== '/build' ||
      action.project !== 'qa-generic-fork-project' ||
      action.step !== 'qa-generic-fork-step-2' ||
      action.stepNumber !== '2' ||
      action.family !== 'qa-generic-fork-project:qa-generic-fork-step-2' ||
      action.run !== null ||
      action.artifact !== null ||
      action.sha !== null
    ) {
      throw new Error(
        `Generic ${viewportName} response action lost its exact plain prompt-step identity: ${JSON.stringify(action)}.`,
      )
    }
  }
  const visibleActions = snapshot.positive.filter((action) => action.visible)
  if (
    visibleActions.length < 1 ||
    visibleActions.some((action) => action.width < 44 || action.height < 40) ||
    snapshot.negativeCount !== 0 ||
    snapshot.negativeReason !== 'exact-response-unavailable' ||
    snapshot.overflow > 1
  ) {
    throw new Error(
      `Generic ${viewportName} response action availability/layout failed: ${JSON.stringify(snapshot)}.`,
    )
  }
  if (screenshotDir) {
    await captureScreenshot(
      client,
      sessionId,
      path.join(screenshotDir, `generic-response-fork-${viewportName}.png`),
    )
  }
  return snapshot
}

async function stopChrome(child) {
  if (child.exitCode !== null || child.signalCode !== null) return
  let resolveExit
  const exited = new Promise((resolve) => {
    resolveExit = resolve
    child.once('exit', resolve)
  })
  child.kill('SIGTERM')
  const stopped = await Promise.race([
    exited.then(() => true),
    new Promise((resolve) => setTimeout(() => resolve(false), 2_000)),
  ])
  if (!stopped && child.exitCode === null && child.signalCode === null) {
    child.kill('SIGKILL')
    await Promise.race([
      exited,
      new Promise((resolve) => setTimeout(resolve, 2_000)),
    ])
  }
  resolveExit?.()
  child.stderr?.destroy()
}

const snapshotExpression = `(() => {
  const fixture=document.querySelector('[data-depth-ten-fixture]');
  const root=fixture?.querySelector('[data-testid="fork-lineage"]');
  const viewport=root?.querySelector('[data-fork-generation-workspace]');
  if (!root || !viewport) return null;
  const nodes=[...root.querySelectorAll('[data-fork-generation]')];
  const edges=[...root.querySelectorAll('[data-fork-generation-connector]')];
  const canvas=root.querySelector('[data-fork-generation-canvas]');
  const canvasRect=canvas?.getBoundingClientRect();
  const testIds=[...root.querySelectorAll('[data-testid]')].map((node)=>node.getAttribute('data-testid'));
  const targetSizes=[...root.querySelectorAll('a[href],button,summary,[tabindex="0"]')].map((node)=>{
    const rect=node.getBoundingClientRect();
    return { label:node.getAttribute('aria-label') || node.textContent?.trim() || '', width:rect.width, height:rect.height };
  });
  return {
    pageUrl:location.href,
    family:fixture.getAttribute('data-presentation-family'),
    scenario:fixture.getAttribute('data-fixture-scenario'),
    integrity:fixture.getAttribute('data-integrity-kind'),
    eligibilityAllowed:root.querySelector('[data-fork-eligibility]')?.getAttribute('data-fork-eligibility'),
    eligibilityReason:root.querySelector('[data-fork-eligibility]')?.getAttribute('data-fork-eligibility-reason'),
    role:viewport.getAttribute('role'),
    ariaLabel:viewport.getAttribute('aria-label') || '',
    workspaceTabIndex:viewport.tabIndex,
    nodeCount:nodes.length,
    edgeCount:edges.length,
    displayLevels:nodes.map((node)=>Number(node.getAttribute('data-display-level'))),
    generationIndexes:nodes.map((node)=>Number(node.getAttribute('data-generation-index'))),
    kinds:nodes.map((node)=>node.getAttribute('data-generation-kind')),
    currentLevels:nodes.filter((node)=>node.getAttribute('data-generation-current') === 'true').map((node)=>Number(node.getAttribute('data-display-level'))),
    currentActivePaths:nodes.filter((node)=>node.getAttribute('data-generation-current') === 'true')
      .flatMap((node)=>[...node.querySelectorAll('[data-fork-generation-active-path]')]).length,
    currentPipelines:nodes.filter((node)=>node.getAttribute('data-generation-current') === 'true')
      .flatMap((node)=>[...node.querySelectorAll('[data-fork-generation-pipeline]')]).length,
    activeView:root.querySelector('[data-fork-generation-nav][data-active-view="true"]')?.getAttribute('data-fork-generation-nav'),
    identities:nodes.map((node)=>({
      level:Number(node.getAttribute('data-display-level')),
      index:Number(node.getAttribute('data-generation-index')),
      projectId:node.getAttribute('data-generation-id'),
      href:node.getAttribute('data-generation-href') || '',
      modelLabel:node.getAttribute('data-generation-model-label') || '',
      responsePackageId:node.querySelector('[data-fork-generation-response]')?.getAttribute('data-response-package-id') || '',
      responseText:node.querySelector('[data-fork-generation-response]')?.textContent || '',
      artifactPath:node.getAttribute('data-generation-artifact-path'),
      sha:node.getAttribute('data-generation-artifact-sha256'),
      artifactViewerHref:node.getAttribute('data-generation-artifact-viewer-href') || '',
    })),
    edgeIdentities:edges.map((edge)=>({
      testId:edge.getAttribute('data-testid'),
      parentId:edge.getAttribute('data-parent-generation-id'),
      childId:edge.getAttribute('data-child-generation-id'),
      responseId:edge.getAttribute('data-parent-response-id'),
      responsePackageId:edge.getAttribute('data-parent-response-package-id'),
      localStepId:edge.getAttribute('data-parent-local-step-id'),
      responseAnchorId:edge.getAttribute('data-parent-response-anchor-id'),
      promptId:edge.getAttribute('data-child-prompt-id'),
      storedDepth:edge.getAttribute('data-stored-depth'),
      branchIndex:edge.getAttribute('data-branch-index'),
      promptFamilyId:edge.getAttribute('data-prompt-family-id'),
      sourceRunId:edge.getAttribute('data-source-run-id'),
      sourceArtifactPath:edge.getAttribute('data-source-artifact-path'),
      sourceArtifactSha256:edge.getAttribute('data-source-artifact-sha256'),
    })),
    edgeGeometry:edges.map((edge)=>{
      const responseAnchorId=edge.getAttribute('data-parent-response-anchor-id') || '';
      const promptId=edge.getAttribute('data-child-prompt-id') || '';
      const response=root.querySelector('[data-response-package-id="' + CSS.escape(responseAnchorId) + '"]');
      const sourceAnchor=response?.querySelector('[data-fork-generation-source-socket]');
      const promptAnchor=root.querySelector('[data-fork-generation-prompt-anchor="' + CSS.escape(promptId) + '"]');
      const sourceAnchorRect=sourceAnchor?.getBoundingClientRect();
      const promptAnchorRect=promptAnchor?.getBoundingClientRect();
      const values=(edge.querySelector('path')?.getAttribute('d') || '').match(/-?\\d+(?:\\.\\d+)?/g)?.map(Number) || [];
      const [sourceX,sourceY,,targetY,targetX]=values;
      return {
        cardLocalStepId:response?.getAttribute('data-step-id') || null,
        cardLocalResponsePackageId:response?.getAttribute('data-response-package-id') || null,
        sourceXDelta:sourceAnchorRect && canvasRect ? Math.abs(sourceX-(sourceAnchorRect.left-canvasRect.left+sourceAnchorRect.width/2)) : null,
        sourceYDelta:sourceAnchorRect && canvasRect ? Math.abs(sourceY-(sourceAnchorRect.top-canvasRect.top+sourceAnchorRect.height/2)) : null,
        targetXDelta:promptAnchorRect && canvasRect ? Math.abs(targetX-(promptAnchorRect.left-canvasRect.left+promptAnchorRect.width/2)) : null,
        targetYDelta:promptAnchorRect && canvasRect ? Math.abs(targetY-(promptAnchorRect.top-canvasRect.top+promptAnchorRect.height/2)) : null,
      };
    }),
    rootPipeColor:getComputedStyle(root.querySelector('[data-testid="fork-node-1"] [data-fork-generation-pipeline]')).backgroundColor,
    forkPipeColors:[...root.querySelectorAll('[data-fork-generation][data-generation-kind="fork"] [data-fork-generation-pipeline]')]
      .map((node)=>getComputedStyle(node).backgroundColor),
    connectorStrokes:[...root.querySelectorAll('[data-fork-generation-connector] path')].map((node)=>node.getAttribute('stroke')),
    approvedCompositionGeometry:{
      laneWidths:nodes.map((node)=>node.getBoundingClientRect().width),
      laneGaps:nodes.slice(1).map((node,index)=>{
        const previousRect=nodes[index].getBoundingClientRect();
        const currentRect=node.getBoundingClientRect();
        return currentRect.left-previousRect.right;
      }),
      promptNodes:[...root.querySelectorAll('[data-fork-generation-prompt-node]')].map((node)=>{
        const rect=node.getBoundingClientRect();
        return {width:rect.width,height:rect.height};
      }),
      responseNodes:[...root.querySelectorAll('[data-fork-generation-response-node]')].map((node)=>{
        const rect=node.getBoundingClientRect();
        return {width:rect.width,height:rect.height};
      }),
      sourceSockets:[...root.querySelectorAll('[data-fork-generation-source-socket]')].map((node)=>{
        const rect=node.getBoundingClientRect();
        return {width:rect.width,height:rect.height};
      }),
      connectorHorizontalSpans:edges.map((edge)=>{
        const values=(edge.querySelector('path')?.getAttribute('d') || '').match(/-?\\d+(?:\\.\\d+)?/g)?.map(Number) || [];
        return values.length >= 5 ? values[4]-values[0] : null;
      }),
      connectorStrokeWidths:edges.flatMap((edge)=>
        [...edge.querySelectorAll('path')].map((path)=>path.getAttribute('stroke-width'))
      ),
    },
    duplicateTestIds:[...new Set(testIds.filter((id,index)=>testIds.indexOf(id)!==index))],
    enabledForkActions:root.querySelectorAll('[data-fork-continuation-fork]').length,
    minTargetWidth:Math.min(...targetSizes.map((target)=>target.width)),
    minTargetHeight:Math.min(...targetSizes.map((target)=>target.height)),
    undersizedTargets:targetSizes.filter((target)=>target.width < 44 || target.height < 44),
    pageOverflow:Math.max(0,document.documentElement.scrollWidth-window.innerWidth),
    viewportWidth:window.innerWidth,
    viewportHeight:window.innerHeight,
    workspaceClientWidth:viewport.clientWidth,
    workspaceScrollWidth:viewport.scrollWidth,
    workspaceScrollLeft:viewport.scrollLeft,
    workspaceBoundaryRemainder:Math.abs(
      (viewport.scrollWidth-viewport.clientWidth)-viewport.scrollLeft
    ),
    workspaceFirstAlignmentDelta:(() => {
      const viewportRect=viewport.getBoundingClientRect();
      const firstRect=nodes[0]?.getBoundingClientRect();
      const paddingLeft=Number.parseFloat(getComputedStyle(viewport).paddingLeft) || 0;
      const scrollportLeft=viewportRect.left+viewport.clientLeft;
      return firstRect ? Math.abs(firstRect.left-(scrollportLeft+paddingLeft)) : null;
    })(),
    workspaceFirstAlignmentOffset:(() => {
      const viewportRect=viewport.getBoundingClientRect();
      const firstRect=nodes[0]?.getBoundingClientRect();
      const paddingLeft=Number.parseFloat(getComputedStyle(viewport).paddingLeft) || 0;
      const scrollportLeft=viewportRect.left+viewport.clientLeft;
      return firstRect ? firstRect.left-(scrollportLeft+paddingLeft) : null;
    })(),
    workspaceLastAlignmentDelta:(() => {
      const viewportRect=viewport.getBoundingClientRect();
      const lastRect=nodes.at(-1)?.getBoundingClientRect();
      const paddingRight=Number.parseFloat(getComputedStyle(viewport).paddingRight) || 0;
      const scrollportRight=viewportRect.left+viewport.clientLeft+viewport.clientWidth;
      return lastRect ? Math.abs(lastRect.right-(scrollportRight-paddingRight)) : null;
    })(),
    workspaceLastAlignmentOffset:(() => {
      const viewportRect=viewport.getBoundingClientRect();
      const lastRect=nodes.at(-1)?.getBoundingClientRect();
      const paddingRight=Number.parseFloat(getComputedStyle(viewport).paddingRight) || 0;
      const scrollportRight=viewportRect.left+viewport.clientLeft+viewport.clientWidth;
      return lastRect ? lastRect.right-(scrollportRight-paddingRight) : null;
    })(),
    internalHorizontalOverflow:viewport.scrollWidth > viewport.clientWidth + 1,
    scrollSnap:{
      viewport:getComputedStyle(viewport).scrollSnapType,
      canvas:canvas ? getComputedStyle(canvas).scrollSnapType : '',
      lanes:nodes.map((node)=>getComputedStyle(node).scrollSnapAlign),
      overflowX:getComputedStyle(viewport).overflowX,
    },
  };
})()`

function assertCompleteSnapshot(snapshot, family, viewport) {
  if (!snapshot) throw new Error(`${family}/${viewport}: fork lineage workspace missing.`)
  if (snapshot.family !== family) throw new Error(`${family}/${viewport}: rendered family ${snapshot.family}.`)
  if (snapshot.integrity !== 'complete') throw new Error(`${family}/${viewport}: integrity ${snapshot.integrity}.`)
  if (snapshot.nodeCount !== 10 || snapshot.edgeCount !== 9) {
    throw new Error(`${family}/${viewport}: rendered ${snapshot.nodeCount} nodes and ${snapshot.edgeCount} edges.`)
  }
  if (snapshot.displayLevels.join(',') !== '1,2,3,4,5,6,7,8,9,10') {
    throw new Error(`${family}/${viewport}: display levels are ${snapshot.displayLevels.join(',')}.`)
  }
  if (snapshot.generationIndexes.join(',') !== '0,1,2,3,4,5,6,7,8,9') {
    throw new Error(`${family}/${viewport}: zero-based indexes are ${snapshot.generationIndexes.join(',')}.`)
  }
  if (snapshot.kinds[0] !== 'root' || snapshot.kinds.slice(1).some((kind) => kind !== 'fork')) {
    throw new Error(`${family}/${viewport}: root/fork kinds drifted.`)
  }
  if (snapshot.currentLevels.join(',') !== '10') throw new Error(`${family}/${viewport}: level 10 is not current.`)
  if (snapshot.currentActivePaths !== 1 || snapshot.currentPipelines !== 1) {
    throw new Error(
      `${family}/${viewport}: current generation rendered ${snapshot.currentActivePaths} active paths and ${snapshot.currentPipelines} orange spines.`,
    )
  }
  if (snapshot.eligibilityAllowed !== 'denied' || snapshot.eligibilityReason !== 'max-depth') {
    throw new Error(`${family}/${viewport}: terminal max-depth denial missing.`)
  }
  if (snapshot.enabledForkActions !== 0) throw new Error(`${family}/${viewport}: enabled fork action remained at level 10.`)
  if (snapshot.role !== 'region' || !/fork lineage/i.test(snapshot.ariaLabel) || snapshot.workspaceTabIndex !== 0) {
    throw new Error(`${family}/${viewport}: region name or keyboard focus contract failed.`)
  }
  if (
    snapshot.scrollSnap.viewport !== 'x mandatory' ||
    snapshot.scrollSnap.canvas !== 'none' ||
    snapshot.scrollSnap.lanes[0] !== 'start' ||
    snapshot.scrollSnap.lanes.at(-1) !== 'end' ||
    snapshot.scrollSnap.lanes.slice(1,-1).some((alignment) => alignment !== 'center') ||
    snapshot.scrollSnap.overflowX !== 'auto'
  ) {
    throw new Error(
      `${family}/${viewport}: scroll snap is on the wrong element: ${JSON.stringify(snapshot.scrollSnap)}.`,
    )
  }
  if (snapshot.workspaceLastAlignmentDelta > 8) {
    throw new Error(
      `${family}/${viewport}: terminal lane is misaligned by ${snapshot.workspaceLastAlignmentDelta}px.`,
    )
  }
  if (
    snapshot.rootPipeColor !== 'rgb(43, 209, 95)' ||
    snapshot.forkPipeColors.some((color) => color !== 'rgb(232, 122, 44)') ||
    snapshot.connectorStrokes.some((stroke) => !['#8f3f0a', '#e87a2c'].includes(stroke))
  ) {
    throw new Error(`${family}/${viewport}: green root or orange fork piping contract failed.`)
  }
  const composition = snapshot.approvedCompositionGeometry
  const expectedCompactWidth = Math.min(snapshot.viewportWidth * 0.82, 320)
  const expectedActiveWidth = Math.min(snapshot.viewportWidth * 0.88, 748)
  if (
    !composition ||
    composition.laneWidths.length !== 10 ||
    composition.laneWidths.slice(0, -1).some(
      (width) => Math.abs(width - expectedCompactWidth) > 1,
    ) ||
    Math.abs(composition.laneWidths.at(-1) - expectedActiveWidth) > 1 ||
    composition.laneGaps.length !== 9 ||
    composition.laneGaps.some((gap) => Math.abs(gap - 104) > 1) ||
    composition.promptNodes.length !== 10 ||
    composition.promptNodes.some(({ width, height }) => width !== 48 || height !== 56) ||
    composition.responseNodes.length !== 10 ||
    composition.responseNodes.some(({ width, height }) => width !== 48 || height !== 56) ||
    composition.sourceSockets.length !== 9 ||
    composition.sourceSockets.some(({ width, height }) => width !== 48 || height !== 48) ||
    composition.connectorHorizontalSpans.length !== 9 ||
    composition.connectorHorizontalSpans.some(
      (span, index) => {
        const expectedSpan = index === 8
          ? (snapshot.viewportWidth < 1024 ? 162 : 166)
          : 167
        return !Number.isFinite(span) || Math.abs(span - expectedSpan) > 1
      },
    ) ||
    composition.connectorStrokeWidths.length !== 18 ||
    composition.connectorStrokeWidths.some(
      (width, index) => width !== (index % 2 === 0 ? '16' : '12'),
    )
  ) {
    throw new Error(
      `${family}/${viewport}: approved compact-inherited/wide-active pipe composition drifted: ${JSON.stringify(composition)}.`,
    )
  }
  if (snapshot.duplicateTestIds.length > 0) throw new Error(`${family}/${viewport}: duplicate selectors ${snapshot.duplicateTestIds.join(',')}.`)
  if (snapshot.pageOverflow !== 0) throw new Error(`${family}/${viewport}: page overflowed by ${snapshot.pageOverflow}px.`)
  if (!snapshot.internalHorizontalOverflow) throw new Error(`${family}/${viewport}: lineage is not horizontally navigable inside its viewport.`)
  if (snapshot.undersizedTargets.length > 0) {
    throw new Error(`${family}/${viewport}: touch targets below 44px: ${JSON.stringify(snapshot.undersizedTargets)}`)
  }
  snapshot.identities.forEach((identity, index) => {
    const level = index + 1
    const expectedProviders = ['OpenAI', 'Anthropic', null, 'Google']
    const artifactUrl = new URL(identity.artifactViewerHref, snapshot.pageUrl)
    const expectedProvider = family === 'prepared' && level === 4
      ? 'Anthropic'
      : family === 'prepared' && level === 10
        ? 'Google'
        : expectedProviders[index % expectedProviders.length]
    const expectedModel = family === 'prepared' && level === 4
      ? 'qa-prepared-model-run-B'
      : family === 'prepared' && level === 10
        ? 'qa-prepared-current-model-run-B'
        : `qa-${family}-model-level-${level}`
    const expectedResponsePackage = family === 'prepared' && level === 4
      ? '00000000-0000-4000-8000-000000000004'
      : family === 'prepared' && level === 10
        ? 'qa-prepared-current-run-B:step:first'
        : `qa-${family}-run-level-${level}:step:first`
    const [expectedArtifactPath, expectedArtifactSha] = expectedArtifacts[index]
    if (
      identity.level !== level ||
      identity.index !== index ||
      identity.projectId !== `qa-${family}-project-level-${level}` ||
      identity.modelLabel !== expectedModel ||
      identity.responsePackageId !== expectedResponsePackage ||
      identity.artifactPath !== expectedArtifactPath ||
      identity.sha !== expectedArtifactSha ||
      artifactUrl.searchParams.get('provider') !== expectedProvider
    ) throw new Error(`${family}/${viewport}: exact identity drift at level ${level}.`)
    if (family === 'prepared' && level === 4) {
      const href = new URL(identity.href, snapshot.pageUrl)
      if (href.searchParams.get('run') !== 'qa-prepared-run-B') {
        throw new Error(`${family}/${viewport}: prepared parent href did not preserve explicit run B.`)
      }
    }
    if (
      family === 'prepared' &&
      level === 10 &&
      (
        !snapshot.pageUrl.includes('run=qa-prepared-current-run-B') ||
        !identity.responseText.includes('Exact response for prepared level 10.')
      )
    ) {
      throw new Error(`${family}/${viewport}: current level did not present active run B.`)
    }
  })
  snapshot.edgeIdentities.forEach((edge, index) => {
    const parentLevel = index + 1
    const childLevel = parentLevel + 1
    const expectedResponseId = family === 'prepared' && parentLevel === 4
      ? 'qa-prepared-project-level-4:qa-prepared-run-B:step:1'
      : `qa-${family}-run-level-${parentLevel}:step:first`
    const expectedResponseAnchorId = family === 'prepared' && parentLevel === 4
      ? '00000000-0000-4000-8000-000000000004'
      : expectedResponseId
    const expectedLocalStepId = expectedResponseAnchorId
    const expectedPromptId = family === 'prepared' && childLevel === 4
      ? '00000000-0000-4000-8000-000000000004'
      : family === 'prepared' && childLevel === 10
        ? 'qa-prepared-current-run-B:step:first'
        : `qa-${family}-run-level-${childLevel}:step:first`
    const expectedSourceRunId = family === 'prepared' && parentLevel === 4
      ? 'qa-prepared-run-B'
      : `qa-${family}-run-level-${parentLevel}`
    if (
      edge.testId !== `fork-edge-${parentLevel}-${childLevel}` ||
      edge.parentId !== `qa-${family}-project-level-${parentLevel}` ||
      edge.childId !== `qa-${family}-project-level-${childLevel}` ||
      edge.responseId !== expectedResponseId ||
      edge.responsePackageId !== expectedResponseId ||
      edge.localStepId !== expectedLocalStepId ||
      edge.responseAnchorId !== expectedResponseAnchorId ||
      edge.promptId !== expectedPromptId ||
      edge.storedDepth !== String(parentLevel - 1) ||
      edge.branchIndex !== '0' ||
      edge.promptFamilyId !== `qa-${family}-project-level-1:qa-${family}-run-level-1:step:first`
      || edge.sourceRunId !== expectedSourceRunId
      || edge.sourceArtifactPath !== expectedArtifacts[parentLevel - 1][0]
      || edge.sourceArtifactSha256 !== expectedArtifacts[parentLevel - 1][1]
    ) throw new Error(
      `${family}/${viewport}: exact endpoint drift on edge ${parentLevel}-${childLevel}: ${JSON.stringify(edge)}.`,
    )
  })
  snapshot.edgeGeometry.forEach((geometry, index) => {
    const edge = snapshot.edgeIdentities[index]
    const deltas = [
      geometry.sourceXDelta,
      geometry.sourceYDelta,
      geometry.targetXDelta,
      geometry.targetYDelta,
    ]
    if (
      geometry.cardLocalStepId !== edge.localStepId ||
      geometry.cardLocalResponsePackageId !== edge.responseAnchorId ||
      deltas.some((delta) => !Number.isFinite(delta) || delta > 2)
    ) {
      throw new Error(`${family}/${viewport}: connector ${index + 1}-${index + 2} misses its exact card endpoints: ${JSON.stringify(geometry)}.`)
    }
  })
}

async function setFamily(client, sessionId, family) {
  await evaluate(client, sessionId, `(() => {
    const button=document.querySelector('[data-fixture-family="${family}"]');
    button?.click();
    return Boolean(button);
  })()`)
  await waitFor(
    client,
    sessionId,
    `document.querySelector('[data-depth-ten-fixture]')?.getAttribute('data-presentation-family')`,
    (value) => value === family,
    `${family} presentation`,
  )
}

async function setScenario(client, sessionId, scenario) {
  await waitFor(
    client,
    sessionId,
    `Boolean(document.querySelector('[data-fixture-scenario-picker]'))`,
    Boolean,
    'hydrated fixture scenario picker',
  )
  await evaluate(
    client,
    sessionId,
    `new Promise((resolve)=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve(true))))`,
  )
  await setSelect(client, sessionId, '[data-fixture-scenario-picker]', scenario)
  const changed = await evaluate(client, sessionId, `(() => ({
    value:document.querySelector('[data-fixture-scenario-picker]')?.value,
    fixture:document.querySelector('[data-depth-ten-fixture]')?.getAttribute('data-fixture-scenario'),
  }))()`)
  if (changed.value !== scenario) {
    throw new Error(`Could not set ${scenario} scenario picker: ${JSON.stringify(changed)}`)
  }
  await waitFor(
    client,
    sessionId,
    `document.querySelector('[data-depth-ten-fixture]')?.getAttribute('data-fixture-scenario')`,
    (value) => value === scenario,
    `${scenario} fixture scenario`,
  )
}

async function setSelect(client, sessionId, selector, value) {
  await evaluate(client, sessionId, `(() => {
    const select=document.querySelector(${JSON.stringify(selector)});
    if (!select) return false;
    const setter=Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set;
    setter.call(select,${JSON.stringify(value)});
    select.dispatchEvent(new Event('input',{bubbles:true}));
    select.dispatchEvent(new Event('change',{bubbles:true}));
    return true;
  })()`)
}

async function verifyIntegrityDenials(client, sessionId, family) {
  for (const integrity of ['missing-parent', 'cycle', 'truncated', 'unavailable']) {
    await setSelect(client, sessionId, '[data-fixture-integrity-picker]', integrity)
    const value = await waitFor(
      client,
      sessionId,
      `(() => {
        const fixture=document.querySelector('[data-depth-ten-fixture]');
        const root=fixture?.querySelector('[data-testid="fork-lineage"]');
        return {
          kind:fixture?.getAttribute('data-integrity-kind'),
          reason:root?.querySelector('[data-fork-eligibility]')?.getAttribute('data-fork-eligibility-reason'),
          nodes:root?.querySelectorAll('[data-fork-generation]').length || 0,
          enabled:root?.querySelectorAll('[data-fork-continuation-fork]').length || 0,
        };
      })()`,
      (snapshot) => snapshot?.kind === integrity,
      `${family}/${integrity} denial`,
    )
    const validNodeCount = integrity === 'truncated'
      ? value.nodes === 10
      : value.nodes >= 1 && value.nodes < 10
    if (value.reason !== integrity || value.enabled !== 0 || !validNodeCount) {
      throw new Error(`${family}/${integrity}: broken prefix or fail-closed denial failed: ${JSON.stringify(value)}`)
    }
    if (integrity === 'missing-parent') {
      const suffix = await evaluate(client, sessionId, `(() => {
        const first=document.querySelector('[data-fork-generation]');
        const label=document.querySelector('[data-testid="fork-lineage"] a')?.textContent || '';
        return {
          firstLevel:first?.getAttribute('data-display-level'),
          firstKind:first?.getAttribute('data-generation-kind'),
          label,
        };
      })()`)
      if (Number(suffix.firstLevel) <= 1 || suffix.firstKind !== 'fork' || !suffix.label.includes('Earliest verified level')) {
        throw new Error(`${family}/missing-parent: known suffix was mislabeled or normalized: ${JSON.stringify(suffix)}`)
      }
    }
  }

  await setSelect(client, sessionId, '[data-fixture-integrity-picker]', 'invalid')
  for (const invalidCase of ['stale-depth', 'family-mismatch', 'edge-mismatch']) {
    await setSelect(client, sessionId, '[data-fixture-invalid-case-picker]', invalidCase)
    const evidence = await waitFor(
      client,
      sessionId,
      `document.querySelector('[data-invalid-lineage-evidence]')?.textContent || ''`,
      (text) => text.includes(invalidCase),
      `${family}/${invalidCase} evidence`,
    )
    if (invalidCase === 'stale-depth' && !evidence.includes('observed stored depth 9')) {
      throw new Error(`${family}: legacy stored depth 9 was not preserved as invalid evidence.`)
    }
    const denial = await evaluate(client, sessionId, `(() => {
      const root=document.querySelector('[data-testid="fork-lineage"]');
      return {
        reason:root?.querySelector('[data-fork-eligibility]')?.getAttribute('data-fork-eligibility-reason'),
        enabled:root?.querySelectorAll('[data-fork-continuation-fork]').length || 0,
      };
    })()`)
    if (denial.reason !== 'invalid' || denial.enabled !== 0) {
      throw new Error(`${family}/${invalidCase}: invalid lineage did not fail closed.`)
    }
  }
  await setSelect(client, sessionId, '[data-fixture-integrity-picker]', 'complete')
}

async function verifyKeyboardAndResize(client, sessionId) {
  await waitFor(
    client,
    sessionId,
    `(() => {
      const viewport=document.querySelector('[data-fork-generation-workspace]');
      if (!viewport) return null;
      return Math.abs(
        viewport.scrollLeft-(viewport.scrollWidth-viewport.clientWidth)
      );
    })()`,
    (delta) => Number.isFinite(delta) && delta <= 16,
    'initial terminal scroll completion',
  )
  await evaluate(
    client,
    sessionId,
    `new Promise((resolve)=>setTimeout(()=>resolve(true),300))`,
  )
  const before = await evaluate(client, sessionId, `document.querySelector('[data-testid="fork-edge-1-2"] path')?.getAttribute('d') || ''`)
  await evaluate(client, sessionId, `(() => {
    const viewport=document.querySelector('[data-fork-generation-workspace]');
    viewport?.focus();
    viewport?.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true}));
    return document.activeElement === viewport;
  })()`)
  await waitFor(
    client,
    sessionId,
    `document.querySelector('[data-fork-generation-nav][data-active-view="true"]')?.getAttribute('data-fork-generation-nav')`,
    (value) => value === '9',
    'keyboard previous-level navigation',
  )
  await evaluate(client, sessionId, `(() => {
    const viewport=document.querySelector('[data-fork-generation-workspace]');
    viewport?.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));
    const details=document.querySelector('[data-testid="fork-node-1"] details');
    if (details) details.open=true;
    return true;
  })()`)
  await waitFor(
    client,
    sessionId,
    `(() => {
      const viewport=document.querySelector('[data-fork-generation-workspace]');
      const lane=document.querySelector('[data-testid="fork-node-10"]');
      if (!viewport || !lane) return null;
      const target=viewport.scrollWidth-viewport.clientWidth;
      return Math.abs(viewport.scrollLeft-target);
    })()`,
    (delta) => Number.isFinite(delta) && delta <= 16,
    'keyboard next-level scroll completion',
  )
  await waitFor(
    client,
    sessionId,
    `document.querySelector('[data-testid="fork-edge-1-2"] path')?.getAttribute('d') || ''`,
    (value) => value && value !== before,
    'ResizeObserver realignment after response expansion',
  )
  await evaluate(
    client,
    sessionId,
    `new Promise((resolve)=>setTimeout(()=>resolve(document.querySelector('[data-fork-generation-workspace]')?.scrollLeft),500))`,
  )
  return {
    previousLevel: '9',
    nextLevel: '10',
    resizeObserverRealigned: true,
  }
}

async function verifyMidTrackSnap(client, sessionId) {
  await evaluate(client, sessionId, `(() => {
    document.querySelector('[data-fork-generation-nav="5"]')?.click();
    return true;
  })()`)
  const centeredFive = await waitFor(
    client,
    sessionId,
    `(() => {
      const viewport=document.querySelector('[data-fork-generation-workspace]');
      const lane=document.querySelector('[data-testid="fork-node-5"]');
      if (!viewport || !lane) return null;
      const viewportRect=viewport.getBoundingClientRect();
      const laneRect=lane.getBoundingClientRect();
      return {
        active:document.querySelector('[data-fork-generation-nav][data-active-view="true"]')?.getAttribute('data-fork-generation-nav'),
        centerDelta:Math.abs((laneRect.left+laneRect.width/2)-(viewportRect.left+viewportRect.width/2)),
      };
    })()`,
    (value) => value?.active === '5' && value.centerDelta <= 16,
    'level 5 mid-track snap',
  )

  const viewportPoint = await evaluate(client, sessionId, `(() => {
    const viewport=document.querySelector('[data-fork-generation-workspace]');
    viewport?.scrollIntoView({block:'start'});
    const rect=viewport?.getBoundingClientRect();
    if (!rect) return null;
    const visibleTop=Math.max(0,rect.top);
    const visibleBottom=Math.min(innerHeight,rect.bottom);
    return {
      x:Math.max(1,Math.min(innerWidth-1,rect.left+rect.width/2)),
      y:Math.max(1,Math.min(innerHeight-1,(visibleTop+visibleBottom)/2)),
    };
  })()`)
  if (!viewportPoint) throw new Error('Mid-track touch-like gesture viewport was missing.')
  await client.send('Input.synthesizeScrollGesture', {
    x: viewportPoint.x,
    y: viewportPoint.y,
    xDistance: -496,
    yDistance: 0,
    speed: 800,
    gestureSourceType: 'touch',
  }, sessionId)
  const touchSettled = await waitFor(
    client,
    sessionId,
    `(() => {
      const viewport=document.querySelector('[data-fork-generation-workspace]');
      const active=document.querySelector('[data-fork-generation-nav][data-active-view="true"]')?.getAttribute('data-fork-generation-nav');
      const lane=active ? document.querySelector('[data-testid="fork-node-' + active + '"]') : null;
      if (!viewport || !lane) return null;
      const viewportRect=viewport.getBoundingClientRect();
      const laneRect=lane.getBoundingClientRect();
      return {
        active,
        centerDelta:Math.abs((laneRect.left+laneRect.width/2)-(viewportRect.left+viewportRect.width/2)),
      };
    })()`,
    (value) => ['6', '7'].includes(value?.active) && value.centerDelta <= 20,
    'touch-like mid-track snap settling',
  )

  await evaluate(client, sessionId, `(() => {
    const viewport=document.querySelector('[data-fork-generation-workspace]');
    viewport?.focus();
    viewport?.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));
    return true;
  })()`)
  const keyboardExpected = String(Number(touchSettled.active) + 1)
  const keyboardSettled = await waitFor(
    client,
    sessionId,
    `(() => {
      const viewport=document.querySelector('[data-fork-generation-workspace]');
      const active=document.querySelector('[data-fork-generation-nav][data-active-view="true"]')?.getAttribute('data-fork-generation-nav');
      const lane=active ? document.querySelector('[data-testid="fork-node-' + active + '"]') : null;
      if (!viewport || !lane) return null;
      const viewportRect=viewport.getBoundingClientRect();
      const laneRect=lane.getBoundingClientRect();
      return {
        active,
        centerDelta:Math.abs((laneRect.left+laneRect.width/2)-(viewportRect.left+viewportRect.width/2)),
      };
    })()`,
    (value) => value?.active === keyboardExpected && value.centerDelta <= 16,
    'keyboard mid-track snap settling',
  )
  return {
    selectedLevel: centeredFive.active,
    selectedCenterDelta: centeredFive.centerDelta,
    touchSettledLevel: touchSettled.active,
    touchCenterDelta: touchSettled.centerDelta,
    keyboardSettledLevel: keyboardSettled.active,
    keyboardCenterDelta: keyboardSettled.centerDelta,
  }
}

async function verifyPreparedEligibilityActions(client, sessionId, viewportName, screenshotDir) {
  const results = []
  for (const scenario of ['model-present', 'source-run-only']) {
    await setScenario(client, sessionId, scenario)
    const expected = eligibleProvenance[scenario]
    const evidence = await waitFor(
      client,
      sessionId,
      `(() => {
        const root=document.querySelector('[data-testid="fork-lineage"]');
        const current=root?.querySelector('[data-generation-current="true"]');
        const response=current?.querySelector('[data-fork-generation-response]');
        const actions=[...(root?.querySelectorAll('[data-fork-continuation-fork]') || [])];
        const hrefs=[...(root?.querySelectorAll('a[href*="/build"]') || [])].map((link)=>link.href);
        return {
          nodes:root?.querySelectorAll('[data-fork-generation]').length || 0,
          reason:root?.querySelector('[data-fork-eligibility]')?.getAttribute('data-fork-eligibility-reason'),
          allowed:root?.querySelector('[data-fork-eligibility]')?.getAttribute('data-fork-eligibility'),
          actionCount:actions.length,
          actionHref:actions[0]?.href || '',
          actionStepId:actions[0]?.closest('[data-fork-generation-response]')?.getAttribute('data-step-id') || '',
          responseStepId:response?.getAttribute('data-step-id') || '',
          responsePackageId:response?.getAttribute('data-response-package-id') || '',
          allBuildHrefs:hrefs,
        };
      })()`,
      (value) => value?.nodes === 2 && value?.actionCount === 1,
      `${scenario}/${viewportName} prepared eligibility action`,
    )
    const actionUrl = new URL(evidence.actionHref)
    const expectedParams = {
      fork: expected.currentProjectId,
      forkRun: expected.runId,
      forkStep: expected.stepId,
      forkStepNumber: expected.stepNumber,
      forkArtifact: expected.artifactPath,
      forkArtifactSha256: expected.artifactSha256,
      parentFork: expected.currentProjectId,
      forkDepth: '1',
      promptFamily: expected.promptFamilyId,
    }
    if (
      evidence.allowed !== 'allowed' ||
      evidence.reason !== 'eligible' ||
      actionUrl.pathname !== '/build' ||
      evidence.actionStepId !== expected.localStepId ||
      evidence.responseStepId !== expected.localStepId ||
      evidence.responsePackageId !== expected.localResponsePackageId ||
      evidence.allBuildHrefs.length !== 1
    ) {
      throw new Error(`${scenario}/${viewportName}: authoritative action placement drifted: ${JSON.stringify(evidence)}.`)
    }
    for (const [key, value] of Object.entries(expectedParams)) {
      if (actionUrl.searchParams.get(key) !== value) {
        throw new Error(`${scenario}/${viewportName}: ${key} was ${actionUrl.searchParams.get(key)}, expected ${value}.`)
      }
    }
    if (
      actionUrl.searchParams.get('forkVariant') !== expected.modelVariantId ||
      actionUrl.href.includes(encodeURIComponent(expected.localStepId)) ||
      actionUrl.href.includes(encodeURIComponent(expected.localResponsePackageId))
    ) {
      throw new Error(`${scenario}/${viewportName}: model/local DOM identity leaked or drifted in ${actionUrl.href}.`)
    }
    results.push({
      scenario,
      actionHref: actionUrl.href,
      localStepId: evidence.responseStepId,
      localResponsePackageId: evidence.responsePackageId,
    })
    if (screenshotDir) {
      await captureScreenshot(
        client,
        sessionId,
        path.join(screenshotDir, `eligible-${scenario}-${viewportName}.png`),
      )
    }
  }

  await setScenario(client, sessionId, 'incomplete')
  const incomplete = await waitFor(
    client,
    sessionId,
    `(() => {
      const root=document.querySelector('[data-testid="fork-lineage"]');
      return {
        allowed:root?.querySelector('[data-fork-eligibility]')?.getAttribute('data-fork-eligibility'),
        reason:root?.querySelector('[data-fork-eligibility]')?.getAttribute('data-fork-eligibility-reason'),
        actions:root?.querySelectorAll('[data-fork-continuation-fork]').length || 0,
      };
    })()`,
    (value) => value?.reason === 'eligible',
    `incomplete/${viewportName} prepared eligibility`,
  )
  if (incomplete.allowed !== 'allowed' || incomplete.actions !== 0) {
    throw new Error(`incomplete/${viewportName}: incomplete authoritative tuple did not fail closed: ${JSON.stringify(incomplete)}.`)
  }
  await setScenario(client, sessionId, 'terminal')
  return { valid: results, incomplete }
}

async function verifyManualScrollNavigatorSync(client, sessionId) {
  await evaluate(client, sessionId, `(() => {
    const viewport=document.querySelector('[data-fork-generation-workspace]');
    if (!viewport) return false;
    viewport.scrollTo({left:viewport.scrollWidth,behavior:'instant'});
    viewport.dispatchEvent(new Event('scroll',{bubbles:true}));
    return true;
  })()`)
  const terminal = await waitFor(
    client,
    sessionId,
    `(() => ({
      active:document.querySelector('[data-fork-generation-nav][data-active-view="true"]')?.getAttribute('data-fork-generation-nav'),
      pressed:document.querySelector('[data-fork-generation-nav="10"]')?.getAttribute('aria-pressed'),
      nextDisabled:Boolean(document.querySelector('[aria-label="Show next fork generation"]')?.disabled),
    }))()`,
    (value) => value.active === '10' && value.pressed === 'true' && value.nextDisabled,
    'manual scroll sync at last level',
  )

  await evaluate(client, sessionId, `(() => {
    const viewport=document.querySelector('[data-fork-generation-workspace]');
    if (!viewport) return false;
    viewport.scrollTo({left:0,behavior:'instant'});
    viewport.dispatchEvent(new Event('scroll',{bubbles:true}));
    return true;
  })()`)
  const start = await waitFor(
    client,
    sessionId,
    `(() => ({
      active:document.querySelector('[data-fork-generation-nav][data-active-view="true"]')?.getAttribute('data-fork-generation-nav'),
      pressed:document.querySelector('[data-fork-generation-nav="1"]')?.getAttribute('aria-pressed'),
      previousDisabled:Boolean(document.querySelector('[aria-label="Show previous fork generation"]')?.disabled),
      currentProject:document.querySelector('[data-fork-generation-nav][aria-current="step"]')?.getAttribute('data-fork-generation-nav'),
      scrollLeft:document.querySelector('[data-fork-generation-workspace]')?.scrollLeft,
    }))()`,
    (value) => value.active === '1' && value.pressed === 'true' && value.previousDisabled && value.currentProject === '10',
    'manual scroll sync at first level',
  )
  return {
    terminalActiveLevel: terminal.active,
    terminalNextDisabled: terminal.nextDisabled,
    startActiveLevel: start.active,
    startPreviousDisabled: start.previousDisabled,
    ariaCurrentProjectLevel: start.currentProject,
  }
}

async function verifyReducedMotion(client, sessionId) {
  await client.send('Emulation.setEmulatedMedia', {
    media: '',
    features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
  }, sessionId)
  const behavior = await evaluate(client, sessionId, `(() => {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  })()`)
  const scrollBehavior = await evaluate(client, sessionId, `(() => {
    let observed=null;
    const viewport=document.querySelector('[data-fork-generation-workspace]');
    if (!viewport) return null;
    const original=viewport.scrollTo;
    viewport.scrollTo=(options)=>{observed=options?.behavior ?? null};
    document.querySelector('[data-fork-generation-nav="1"]')?.click();
    viewport.scrollTo=original;
    return observed;
  })()`)
  if (behavior !== true || scrollBehavior !== 'auto') {
    throw new Error(`Reduced-motion navigation used ${scrollBehavior ?? behavior ?? '(missing)'} instead of auto.`)
  }
  await client.send('Emulation.setEmulatedMedia', { media: '', features: [] }, sessionId)
  return {
    mediaMatches: behavior,
    scrollBehavior,
  }
}

async function captureScreenshot(client, sessionId, destination) {
  const { data } = await client.send('Page.captureScreenshot', {
    format: 'png',
    fromSurface: true,
    captureBeyondViewport: false,
  }, sessionId)
  writeFileSync(destination, Buffer.from(data, 'base64'))
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  if (options.screenshotDir) mkdirSync(options.screenshotDir, { recursive: true })
  if (options.measurementsPath) mkdirSync(path.dirname(options.measurementsPath), { recursive: true })
  const executable = chromeExecutable()
  if (!executable) throw new Error('Chrome was not found for the depth-10 browser guard.')

  const profile = mkdtempSync(path.join(tmpdir(), 'pathforge-depth-ten-browser-'))
  const child = spawn(executable, [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--remote-debugging-port=0',
    `--user-data-dir=${profile}`,
    'about:blank',
  ], { stdio: ['ignore', 'ignore', 'pipe'] })

  let client
  const measurements = []
  try {
    client = new CdpClient(await waitForWebSocketUrl(child))
    await client.ready()
    const { targetId } = await client.send('Target.createTarget', { url: 'about:blank' })
    const { sessionId } = await client.send('Target.attachToTarget', { targetId, flatten: true })
    const browserErrors = []
    client.listeners.add((message) => {
      if (message.sessionId !== sessionId) return
      if (message.method === 'Runtime.exceptionThrown') {
        browserErrors.push({
          kind: 'exception',
          text: message.params.exceptionDetails?.exception?.description
            || message.params.exceptionDetails?.text
            || 'Runtime exception',
          url: message.params.exceptionDetails?.url || '',
        })
      }
      if (message.method === 'Log.entryAdded' && message.params.entry?.level === 'error') {
        const entry = message.params.entry
        if (
          !isExpectedLocalActivationFailure(options.baseUrl, entry) &&
          !isExpectedLocalVercelScriptFailure(options.baseUrl, entry) &&
          !isExpectedLocalFaviconFailure(options.baseUrl, entry)
        ) {
          browserErrors.push({
            kind: 'console',
            text: entry.text,
            url: entry.url || '',
          })
        }
      }
    })
    await Promise.all([
      client.send('Page.enable', {}, sessionId),
      client.send('Runtime.enable', {}, sessionId),
      client.send('Log.enable', {}, sessionId),
    ])

    for (const viewport of [
      { name: 'desktop-1440x1000', width: 1440, height: 1000, mobile: false },
      { name: 'mobile-390x844', width: 390, height: 844, mobile: true },
    ]) {
      await client.send('Emulation.setDeviceMetricsOverride', {
        width: viewport.width,
        height: viewport.height,
        deviceScaleFactor: 1,
        mobile: viewport.mobile,
      }, sessionId)
      await navigate(client, sessionId, new URL(options.route, options.baseUrl).href)
      const eligibilityActions = await verifyPreparedEligibilityActions(
        client,
        sessionId,
        viewport.name,
        options.screenshotDir,
      )

      for (const family of ['prepared', 'community']) {
        await setFamily(client, sessionId, family)
        const snapshot = await waitFor(
          client,
          sessionId,
          snapshotExpression,
          (value) => (
            value?.nodeCount === 10 &&
            value?.edgeCount === 9 &&
            value?.activeView === '10' &&
            Number.isFinite(value?.workspaceLastAlignmentDelta) &&
            value.workspaceLastAlignmentDelta <= 8
          ),
          `${family}/${viewport.name} complete lineage`,
        )
        assertCompleteSnapshot(snapshot, family, viewport.name)
        const midTrackSnap = await verifyMidTrackSnap(client, sessionId)
        await evaluate(client, sessionId, `document.querySelector('[data-fork-generation-nav="10"]')?.click()`)
        const keyboardAndResize = await verifyKeyboardAndResize(client, sessionId)
        const manualScroll = await verifyManualScrollNavigatorSync(client, sessionId)
        const reducedMotion = await verifyReducedMotion(client, sessionId)
        measurements.push({
          family,
          viewport: viewport.name,
          ...snapshot,
          interactionEvidence: {
            eligibilityActions,
            midTrackSnap,
            keyboardAndResize,
            manualScroll,
            reducedMotion,
          },
        })
        await verifyIntegrityDenials(client, sessionId, family)
        if (options.screenshotDir) {
          await setSelect(client, sessionId, '[data-fixture-integrity-picker]', 'complete')
          await evaluate(client, sessionId, `(() => {
            const root=document.querySelector('[data-testid="fork-lineage"]');
            root?.scrollIntoView({block:'start'});
            return true;
          })()`)
          await waitFor(
            client,
            sessionId,
            `(() => {
              const viewport=document.querySelector('[data-fork-generation-workspace]');
              const last=document.querySelector('[data-fork-generation]:last-of-type');
              if (!viewport || !last) return null;
              const viewportRect=viewport.getBoundingClientRect();
              const lastRect=last.getBoundingClientRect();
              const paddingRight=Number.parseFloat(getComputedStyle(viewport).paddingRight) || 0;
              const scrollportRight=viewportRect.left+viewport.clientLeft+viewport.clientWidth;
              return {
                active:document.querySelector('[data-fork-generation-nav][data-active-view="true"]')?.getAttribute('data-fork-generation-nav'),
                alignmentDelta:Math.abs(lastRect.right-(scrollportRight-paddingRight)),
              };
            })()`,
            (value) => value?.active === '10' && value.alignmentDelta <= 8,
            `${family}/${viewport.name} restored current boundary`,
          )
          await evaluate(
            client,
            sessionId,
            `document.querySelector('[data-fork-generation-nav="1"]')?.click()`,
          )
          await waitFor(
            client,
            sessionId,
            `(() => {
              const viewport=document.querySelector('[data-fork-generation-workspace]');
              const first=document.querySelector('[data-fork-generation]');
              if (!viewport || !first) return null;
              const viewportRect=viewport.getBoundingClientRect();
              const firstRect=first.getBoundingClientRect();
              const paddingLeft=Number.parseFloat(getComputedStyle(viewport).paddingLeft) || 0;
              const scrollportLeft=viewportRect.left+viewport.clientLeft;
              return {
                active:document.querySelector('[data-fork-generation-nav][data-active-view="true"]')?.getAttribute('data-fork-generation-nav'),
                alignmentDelta:Math.abs(firstRect.left-(scrollportLeft+paddingLeft)),
              };
            })()`,
            (value) => value?.active === '1' && value.alignmentDelta <= 8,
            `${family}/${viewport.name} screenshot start boundary`,
          )
          await captureScreenshot(
            client,
            sessionId,
            path.join(options.screenshotDir, `depth-10-${family}-${viewport.name}-overview.png`),
          )
          await evaluate(client, sessionId, `(() => {
            const viewport=document.querySelector('[data-fork-generation-workspace]');
            viewport?.scrollIntoView({block:'start'});
            return true;
          })()`)
          await captureScreenshot(
            client,
            sessionId,
            path.join(options.screenshotDir, `depth-10-${family}-${viewport.name}.png`),
          )
        }
      }
      measurements.push({
        family: 'generic',
        viewport: viewport.name,
        genericResponseActions: await verifyGenericResponseForkActions(
          client,
          sessionId,
          options.baseUrl,
          viewport.name,
          options.screenshotDir,
        ),
      })
    }

    if (browserErrors.length > 0) {
      throw new Error(`Unexpected browser errors: ${JSON.stringify(browserErrors, null, 2)}`)
    }
    if (options.measurementsPath) {
      writeFileSync(options.measurementsPath, `${JSON.stringify({
        evidenceScope: 'local QA fixture only; not production-public proof',
        capturedAt: new Date().toISOString(),
        measurements,
      }, null, 2)}\n`)
    }
    console.log('Depth-10 project-fork browser verification passed.')
    console.log('Verified local fixture: exact prepared and generic actions, snap ownership/settling, prepared/community/generic, 10 levels, 9 exact edges, desktop, 390x844, keyboard, a11y, reduced motion, ResizeObserver, fail-closed integrity.')
  } finally {
    client?.close()
    await stopChrome(child)
    try {
      rmSync(profile, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 })
    } catch (error) {
      if (!(error instanceof Error) || !('code' in error) || error.code !== 'ENOTEMPTY') {
        throw error
      }
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error))
  process.exit(1)
})
