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
  if (exceptionDetails) throw new Error(exceptionDetails.text || 'Browser evaluation failed.')
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
    `document.readyState === 'complete' && Boolean(document.querySelector('[data-fork-generation-workspace]'))`,
    Boolean,
    `depth-10 fixture at ${url}`,
  )
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
    activeView:root.querySelector('[data-fork-generation-nav][data-active-view="true"]')?.getAttribute('data-fork-generation-nav'),
    identities:nodes.map((node)=>({
      level:Number(node.getAttribute('data-display-level')),
      index:Number(node.getAttribute('data-generation-index')),
      projectId:node.getAttribute('data-generation-id'),
      href:node.querySelector('a[aria-label^="Open level "]')?.href || '',
      modelLabel:node.querySelector('[data-public-model-identity]')?.textContent?.trim() || '',
      responsePackageId:node.querySelector('[data-fork-generation-response]')?.getAttribute('data-response-package-id') || '',
      responseText:node.querySelector('[data-fork-generation-response]')?.textContent || '',
      artifactPath:node.querySelector('[data-fork-generation-artifact]')?.getAttribute('data-artifact-path'),
      sha:node.querySelector('[data-fork-generation-artifact]')?.getAttribute('data-artifact-sha256'),
      artifactViewerHref:node.querySelector('[data-fork-generation-artifact] a[aria-label^="Open "]')?.href || '',
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
      const prompt=root.querySelector('[data-fork-generation-prompt="' + CSS.escape(promptId) + '"]');
      const responseRect=response?.getBoundingClientRect();
      const promptRect=prompt?.getBoundingClientRect();
      const values=(edge.querySelector('path')?.getAttribute('d') || '').match(/-?\\d+(?:\\.\\d+)?/g)?.map(Number) || [];
      const [sourceX,sourceY,,targetY,targetX]=values;
      return {
        cardLocalStepId:response?.getAttribute('data-step-id') || null,
        cardLocalResponsePackageId:response?.getAttribute('data-response-package-id') || null,
        sourceXDelta:responseRect && canvasRect ? Math.abs(sourceX-(responseRect.right-canvasRect.left)) : null,
        sourceYDelta:responseRect && canvasRect ? Math.abs(sourceY-(responseRect.top-canvasRect.top+responseRect.height/2)) : null,
        targetXDelta:promptRect && canvasRect ? Math.abs(targetX-(promptRect.left-canvasRect.left)) : null,
        targetYDelta:promptRect && canvasRect ? Math.abs(targetY-(promptRect.top-canvasRect.top+promptRect.height/2)) : null,
      };
    }),
    rootPipeColor:getComputedStyle(root.querySelector('[data-testid="fork-node-1"] [data-fork-generation-step] > span')).backgroundColor,
    forkPipeColors:[...root.querySelectorAll('[data-fork-generation][data-generation-kind="fork"] [data-fork-generation-step] > span')]
      .map((node)=>getComputedStyle(node).backgroundColor),
    connectorStrokes:[...root.querySelectorAll('[data-fork-generation-connector] path')].map((node)=>node.getAttribute('stroke')),
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
    internalHorizontalOverflow:viewport.scrollWidth > viewport.clientWidth + 1,
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
  if (snapshot.eligibilityAllowed !== 'denied' || snapshot.eligibilityReason !== 'max-depth') {
    throw new Error(`${family}/${viewport}: terminal max-depth denial missing.`)
  }
  if (snapshot.enabledForkActions !== 0) throw new Error(`${family}/${viewport}: enabled fork action remained at level 10.`)
  if (snapshot.role !== 'region' || !/fork lineage/i.test(snapshot.ariaLabel) || snapshot.workspaceTabIndex !== 0) {
    throw new Error(`${family}/${viewport}: region name or keyboard focus contract failed.`)
  }
  if (
    snapshot.rootPipeColor !== 'rgb(43, 209, 95)' ||
    snapshot.forkPipeColors.some((color) => color !== 'rgb(232, 122, 44)') ||
    snapshot.connectorStrokes.some((stroke) => !['#8f3f0a', '#e87a2c'].includes(stroke))
  ) {
    throw new Error(`${family}/${viewport}: green root or orange fork piping contract failed.`)
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
    const artifactUrl = new URL(identity.artifactViewerHref)
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
      const href = new URL(identity.href)
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

async function setSelect(client, sessionId, selector, value) {
  await evaluate(client, sessionId, `(() => {
    const select=document.querySelector(${JSON.stringify(selector)});
    if (!select) return false;
    const setter=Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set;
    setter.call(select,${JSON.stringify(value)});
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
      const centered=lane.offsetLeft-Math.max(0,(viewport.clientWidth-lane.offsetWidth)/2);
      const target=Math.min(centered,viewport.scrollWidth-viewport.clientWidth);
      return Math.abs(viewport.scrollLeft-target);
    })()`,
    (delta) => Number.isFinite(delta) && delta <= 12,
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
    await Promise.all([
      client.send('Page.enable', {}, sessionId),
      client.send('Runtime.enable', {}, sessionId),
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

      for (const family of ['prepared', 'community']) {
        await setFamily(client, sessionId, family)
        const snapshot = await waitFor(
          client,
          sessionId,
          snapshotExpression,
          (value) => value?.nodeCount === 10 && value?.edgeCount === 9 && value?.activeView === '10',
          `${family}/${viewport.name} complete lineage`,
        )
        assertCompleteSnapshot(snapshot, family, viewport.name)
        const keyboardAndResize = await verifyKeyboardAndResize(client, sessionId)
        const manualScroll = await verifyManualScrollNavigatorSync(client, sessionId)
        const reducedMotion = await verifyReducedMotion(client, sessionId)
        measurements.push({
          family,
          viewport: viewport.name,
          ...snapshot,
          interactionEvidence: {
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
            const viewport=document.querySelector('[data-fork-generation-workspace]');
            viewport?.scrollTo({left:0,behavior:'instant'});
            root?.scrollIntoView({block:'start'});
            return true;
          })()`)
          await waitFor(
            client,
            sessionId,
            `document.querySelector('[data-fork-generation-nav][data-active-view="true"]')?.getAttribute('data-fork-generation-nav')`,
            (value) => value === '1',
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
    }

    if (options.measurementsPath) {
      writeFileSync(options.measurementsPath, `${JSON.stringify({
        evidenceScope: 'local QA fixture only; not production-public proof',
        capturedAt: new Date().toISOString(),
        measurements,
      }, null, 2)}\n`)
    }
    console.log('Depth-10 project-fork browser verification passed.')
    console.log('Verified local fixture: prepared/community, 10 levels, 9 exact edges, desktop, 390x844, keyboard, a11y, reduced motion, ResizeObserver, fail-closed integrity.')
  } finally {
    client?.close()
    child.kill('SIGTERM')
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
