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

function parseArgs(argv) {
  const options = {
    baseUrl: 'http://localhost:3012',
    parentRoute: '/hp-10bii-calculator-demo#source-run-path',
    childRoute: '/school-desk-hp-calculator-fork-demo#source-run-path',
    grandchildRoute: '/qa/fork-lineage-grandchild-fixture#source-run-path',
    nestedChildRoute: '/airlock-zero-swarm-shift-fork-demo#source-run-path',
    sourceParentRoute: '/airlock-zero-reactor-run-demo?run=562f5775-9739-4704-be3e-d85efbbd2a5c#source-run-path',
    swarmParentRoute: '/airlock-zero-reactor-run-demo?run=2e526efa-191c-48ea-9ba0-5ff073403770#source-run-path',
    hullParentRoute: '/airlock-zero-reactor-run-demo?run=248f4672-d557-4b01-8756-c1cec7290925#source-run-path',
    blackoutChildRoute: '/airlock-zero-blackout-shift-fork-demo#source-run-path',
    hullChildRoute: '/airlock-zero-hull-breach-fork-demo#source-run-path',
    screenshotDir: null,
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
    else if (key === '--source-parent-route') options.sourceParentRoute = value
    else if (key === '--swarm-parent-route') options.swarmParentRoute = value
    else if (key === '--hull-parent-route') options.hullParentRoute = value
    else if (key === '--blackout-child-route') options.blackoutChildRoute = value
    else if (key === '--hull-child-route') options.hullChildRoute = value
    else if (key === '--screenshot-dir') options.screenshotDir = path.resolve(value)
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
    const { result, exceptionDetails } = await client.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    }, sessionId)
    if (exceptionDetails) {
      throw new Error(
        `${label} browser evaluation failed: ${
          exceptionDetails.exception?.description ?? exceptionDetails.text ?? 'unknown exception'
        }`,
      )
    }
    lastValue = result.value
    if (predicate(lastValue)) return lastValue
    await new Promise((resolve) => setTimeout(resolve, 75))
  }
  throw new Error(`${label} timed out; last value was ${JSON.stringify(lastValue)}.`)
}

async function navigate(client, sessionId, url, navigationOptions = {}) {
  const expected = new URL(url)
  const canonicalFallback = navigationOptions.canonicalFallback
    ? {
        ...navigationOptions.canonicalFallback,
        url: new URL(navigationOptions.canonicalFallback.url),
      }
    : null
  if (
    canonicalFallback &&
    (
      !canonicalFallback.sourceRunId ||
      !canonicalFallback.modelIdentity ||
      canonicalFallback.url.origin !== expected.origin ||
      canonicalFallback.url.pathname !== expected.pathname ||
      canonicalFallback.url.search !== '' ||
      canonicalFallback.url.hash !== '' ||
      expected.searchParams.get('run') !== canonicalFallback.sourceRunId ||
      expected.hash !== '#source-run-path'
    )
  ) {
    throw new Error(`Invalid canonical navigation fallback for ${url}.`)
  }

  await client.send('Page.navigate', { url }, sessionId)
  await waitForValue(
    client,
    sessionId,
    `(() => {
      const expected=${JSON.stringify({
        origin: expected.origin,
        pathname: expected.pathname,
        search: expected.search,
        hash: expected.hash,
      })};
      const fallback=${JSON.stringify(canonicalFallback
        ? {
            origin: canonicalFallback.url.origin,
            pathname: canonicalFallback.url.pathname,
            search: canonicalFallback.url.search,
            hash: canonicalFallback.url.hash,
            sourceRunId: canonicalFallback.sourceRunId,
            modelIdentity: canonicalFallback.modelIdentity,
          }
        : null)};
      const exactLocation=location.origin === expected.origin &&
        location.pathname === expected.pathname &&
        location.search === expected.search &&
        location.hash === expected.hash;
      const canonicalLocation=Boolean(fallback) &&
        location.origin === fallback.origin &&
        location.pathname === fallback.pathname &&
        location.search === fallback.search &&
        location.hash === fallback.hash;
      const activeRun=fallback
        ? document.querySelector('[data-model-variant-run="' + CSS.escape(fallback.sourceRunId) + '"]')
        : null;
      const activeModelIdentity=activeRun
        ?.querySelector('[data-public-model-identity]')
        ?.textContent?.trim() || '';
      const selectedModelIdentity=document
        .querySelector('[data-model-variant-selector] summary [data-public-model-identity]')
        ?.textContent?.trim() || '';
      const canonicalRunProven=!canonicalLocation || Boolean(
        activeRun?.querySelector('[aria-current="page"]') &&
        activeModelIdentity === fallback.modelIdentity &&
        selectedModelIdentity === fallback.modelIdentity
      );
      const ready=document.readyState === 'complete' &&
        (exactLocation || canonicalLocation) &&
        canonicalRunProven &&
        Boolean(document.querySelector('#source-run-path'));
      return {
        ready,
        href:location.href,
        exactLocation,
        canonicalLocation,
        canonicalRunProven,
        activeModelIdentity,
        selectedModelIdentity,
        activeRunCurrent:Boolean(activeRun?.querySelector('[aria-current="page"]')),
      };
    })()`,
    (value) => value?.ready === true,
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
  const authoritativeViewport=root.querySelector('[data-fork-generation-workspace]');
  if (authoritativeViewport) {
    const generations=[...root.querySelectorAll('[data-fork-generation]')];
    const edges=[...root.querySelectorAll('[data-fork-generation-connector]')];
    const current=generations.find((node)=>node.getAttribute('data-generation-current')==='true') || generations.at(-1);
    const canvas=root.querySelector('[data-fork-generation-canvas]');
    const canvasRect=canvas?.getBoundingClientRect();
    const parseStepNumber=(node,label)=>{
      const text=[...node?.querySelectorAll('div') || []]
        .map((value)=>value.textContent?.trim() || '')
        .find((value)=>value.startsWith(label + ' ')) || '';
      const match=text.match(new RegExp('^' + label + ' \\\\s*(\\\\d+)','i'));
      return match ? Number(match[1]) : null;
    };
    const currentPrompts=[...current?.querySelectorAll('[data-fork-generation-prompt]') || []];
    const currentResponses=[...current?.querySelectorAll('[data-fork-generation-response]') || []];
    const edgeGeometry=edges.map((edge)=>{
      const values=(edge.querySelector('path')?.getAttribute('d') || '')
        .match(/-?\\\\d+(?:\\\\.\\\\d+)?/g)?.map(Number) || [];
      const [sourceX,sourceY,,targetY,targetX]=values;
      const responseAnchorId=edge.getAttribute('data-parent-response-anchor-id') || '';
      const promptId=edge.getAttribute('data-child-prompt-id') || '';
      const response=root.querySelector('[data-response-package-id="' + CSS.escape(responseAnchorId) + '"]');
      const prompt=root.querySelector('[data-fork-generation-prompt="' + CSS.escape(promptId) + '"]');
      const responseRect=response?.getBoundingClientRect();
      const promptRect=prompt?.getBoundingClientRect();
      return {
        sourceXDelta:responseRect && canvasRect ? Math.abs(sourceX-(responseRect.right-canvasRect.left)) : null,
        sourceYDelta:responseRect && canvasRect ? Math.abs(sourceY-(responseRect.top-canvasRect.top+responseRect.height/2)) : null,
        targetXDelta:promptRect && canvasRect ? Math.abs(targetX-(promptRect.left-canvasRect.left)) : null,
        targetYDelta:promptRect && canvasRect ? Math.abs(targetY-(promptRect.top-canvasRect.top+promptRect.height/2)) : null,
      };
    });
    const lastEdge=edges.at(-1);
    const lastGeometry=edgeGeometry.at(-1);
    return {
      authoritative:true,
      count:roots.length,
      mode:root.getAttribute('data-project-fork-build-path-mode'),
      title:current?.querySelector('h3')?.textContent?.trim() || '',
      inherited:unique(generations.slice(0,-1).flatMap((generation)=>
        [...generation.querySelectorAll('[data-fork-generation-step]')]
          .map((node)=>node.getAttribute('data-fork-generation-step'))
      )),
      sourceResponses:lastEdge ? [lastEdge.getAttribute('data-parent-response-id')] : [],
      continuation:unique(currentPrompts.map((node)=>node.getAttribute('data-fork-generation-prompt'))),
      continuationPrompts:currentPrompts.map((node)=>({
        id:node.getAttribute('data-fork-generation-prompt'),
        stepNumber:parseStepNumber(node,'Prompt'),
      })),
      continuationResponses:currentResponses.map((node)=>({
        id:node.getAttribute('data-fork-generation-response'),
        stepNumber:parseStepNumber(node,'Response'),
      })),
      artifactPaths:unique([...root.querySelectorAll('[data-fork-display-artifact]')]
        .map((node)=>node.getAttribute('data-fork-display-artifact'))),
      trail:generations.map((node)=>node.querySelector('h3')?.textContent?.trim() || '').filter(Boolean),
      generationCount:generations.length,
      edgeCount:edges.length,
      edgeGeometry,
      rootPipeColor:(()=>{
        const rail=generations[0]?.querySelector('[data-fork-generation-step] > span');
        return rail ? getComputedStyle(rail).backgroundColor : '';
      })(),
      forkPipeColors:generations.slice(1).flatMap((generation)=>{
        const rail=generation.querySelector('[data-fork-generation-step] > span');
        return rail ? [getComputedStyle(rail).backgroundColor] : [];
      }),
      connectorStrokes:[...root.querySelectorAll('[data-fork-generation-connector] path')]
        .map((node)=>node.getAttribute('stroke')),
      duplicateTestIds:(()=>{
        const ids=[...root.querySelectorAll('[data-testid]')].map((node)=>node.getAttribute('data-testid'));
        return [...new Set(ids.filter((id,index)=>ids.indexOf(id)!==index))];
      })(),
      eligibilityReason:root.querySelector('[data-fork-eligibility]')
        ?.getAttribute('data-fork-eligibility-reason') || '',
      connector:{
        visible:Boolean(lastEdge && lastGeometry),
        sourceStep:lastEdge?.getAttribute('data-parent-response-id') || '',
        targetStep:lastEdge?.getAttribute('data-child-prompt-id') || '',
        sourceResponseDelta:lastGeometry ? Math.max(lastGeometry.sourceXDelta,lastGeometry.sourceYDelta) : null,
        continuationPromptDelta:lastGeometry ? Math.max(lastGeometry.targetXDelta,lastGeometry.targetYDelta) : null,
      },
      desktopGeometry:{authoritative:true},
    };
  }
  const inherited=unique([...root.querySelectorAll('[data-fork-inherited-step]')].map((node)=>node.getAttribute('data-fork-inherited-step')));
  const sourceResponses=unique([...root.querySelectorAll('[data-fork-source-response]')].map((node)=>node.getAttribute('data-fork-source-response-id')));
  const continuation=unique([...root.querySelectorAll('[data-fork-continuation]')].map((node)=>node.getAttribute('data-fork-continuation')));
  const continuationPrompts=[...root.querySelectorAll('[data-fork-continuation-prompt]')].map((node)=>({
    id: node.getAttribute('data-fork-continuation-prompt'),
    stepNumber: Number(node.getAttribute('data-fork-continuation-prompt-step-number')),
  }));
  const continuationResponses=[...root.querySelectorAll('[data-fork-continuation-response]')].map((node)=>({
    id: node.getAttribute('data-fork-continuation-response'),
    stepNumber: Number(node.getAttribute('data-fork-continuation-response-step-number')),
  }));
  const artifactPaths=unique([...root.querySelectorAll('[data-fork-display-artifact]')].map((node)=>node.getAttribute('data-fork-display-artifact')));
  const trail=[...root.querySelectorAll('nav[aria-label="Fork lineage"] li')].map((node)=>node.textContent?.trim() || '').filter(Boolean);
  const desktopPath=root.querySelector('[data-fork-desktop-path]');
  const desktopSourcePrompt=desktopPath?.querySelector('aside [data-fork-source-prompt]');
  const desktopSourceResponse=desktopPath?.querySelector('aside [data-fork-source-response="true"]');
  const sourceLane=desktopPath?.querySelector('[data-fork-source-lane]');
  const connectorLane=desktopPath?.querySelector('[data-fork-connector-lane]');
  const continuationLane=desktopPath?.querySelector('[data-fork-continuation-lane]');
  const connector=desktopPath?.querySelector('[data-fork-response-connector]');
  const socket=desktopPath?.querySelector('[data-fork-response-socket]');
  const sourceEndpoint=desktopPath?.querySelector('[data-fork-source-connector-endpoint]');
  const continuationEndpoint=desktopPath?.querySelector('[data-fork-continuation-connector-endpoint]');
  const connectorVertical=desktopPath?.querySelector('[data-fork-response-connector-vertical]');
  const responseElbow=desktopPath?.querySelector('[data-fork-response-elbow]');
  const continuationElbow=desktopPath?.querySelector('[data-fork-continuation-elbow]');
  const firstContinuationPrompt=desktopPath?.querySelector('[data-fork-continuation-prompt]');
  const sourcePromptNode=desktopPath?.querySelector('[data-fork-source-prompt-node]');
  const sourceResponseNode=desktopPath?.querySelector('[data-fork-source-response-node]');
  const continuationPromptNodes=[...desktopPath?.querySelectorAll('[data-fork-continuation-prompt-node]') || []];
  const continuationResponseNodes=[...desktopPath?.querySelectorAll('[data-fork-continuation-response-node]') || []];
  const continuationIncomingArms=[...desktopPath?.querySelectorAll('[data-fork-continuation-incoming-arm]') || []];
  const continuationPromptCardArms=[...desktopPath?.querySelectorAll('[data-fork-continuation-prompt-card-arm]') || []];
  const continuationResponseCardArms=[...desktopPath?.querySelectorAll('[data-fork-continuation-response-card-arm]') || []];
  const sourcePipelines=[...desktopPath?.querySelectorAll('[data-fork-source-pipeline]') || []];
  const continuationPipelines=[...desktopPath?.querySelectorAll('[data-fork-continuation-pipeline]') || []];
  const sourcePromptRect=desktopSourcePrompt?.getBoundingClientRect();
  const sourceResponseRect=desktopSourceResponse?.getBoundingClientRect();
  const firstContinuationPromptRect=firstContinuationPrompt?.getBoundingClientRect();
  const connectorRect=connector?.getBoundingClientRect();
  const sourceEndpointRect=sourceEndpoint?.getBoundingClientRect();
  const continuationEndpointRect=continuationEndpoint?.getBoundingClientRect();
  const connectorVerticalRect=connectorVertical?.getBoundingClientRect();
  const responseElbowRect=responseElbow?.getBoundingClientRect();
  const continuationElbowRect=continuationElbow?.getBoundingClientRect();
  const socketRect=socket?.getBoundingClientRect();
  const centerY=(value)=>value ? value.top + value.height / 2 : null;
  const sourcePromptCenter=centerY(sourcePromptRect);
  const sourceResponseCenter=centerY(sourceResponseRect);
  const continuationPromptCenter=centerY(firstContinuationPromptRect);
  const sourceEndpointCenter=centerY(sourceEndpointRect);
  const continuationEndpointCenter=centerY(continuationEndpointRect);
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
  const continuationPromptCenters=[...desktopPath?.querySelectorAll('[data-fork-continuation-prompt]') || []]
    .map((node)=>centerY(node.getBoundingClientRect()));
  const continuationResponseCenters=[...desktopPath?.querySelectorAll('[data-fork-continuation-response]') || []]
    .map((node)=>centerY(node.getBoundingClientRect()));
  const firstContinuationNodeRect=continuationPromptNodes[0]?.getBoundingClientRect();
  return {
    count: roots.length,
    mode: root.getAttribute('data-project-fork-build-path-mode'),
    title: root.querySelector('h3')?.textContent?.trim() || '',
    inherited,
    sourceResponses,
    continuation,
    continuationPrompts,
    continuationResponses,
    artifactPaths,
    trail,
    connector: {
      sourceStep: connector?.getAttribute('data-fork-response-connector-source-step') || '',
      targetStep: connector?.getAttribute('data-fork-response-connector-target-step') || '',
      visible: Boolean(connectorRect && connectorRect.width > 0 && connectorRect.height > 0 && Number.parseFloat(getComputedStyle(connector).opacity) > 0),
      sourcePromptCenter,
      sourceResponseCenter,
      continuationPromptCenter,
      sourceEndpointCenter,
      continuationEndpointCenter,
      sourcePromptDelta: sourcePromptCenter === null || sourceEndpointCenter === null ? null : Math.abs(sourcePromptCenter - sourceEndpointCenter),
      sourceResponseDelta: sourceResponseCenter === null || sourceEndpointCenter === null ? null : Math.abs(sourceResponseCenter - sourceEndpointCenter),
      continuationPromptDelta: continuationPromptCenter === null || continuationEndpointCenter === null ? null : Math.abs(continuationPromptCenter - continuationEndpointCenter),
      sourceResponseRight: sourceResponseRect?.right ?? null,
      socketStep: socket?.getAttribute('data-fork-response-socket-step') || '',
      socketCenterX: socketRect ? socketRect.left + socketRect.width / 2 : null,
      socketCenterY: centerY(socketRect),
      socketResponseEdgeDelta: socketRect && sourceResponseRect ? Math.abs(socketRect.left + socketRect.width / 2 - sourceResponseRect.right) : null,
      socketResponseCenterDelta: socketRect && sourceResponseRect ? Math.abs(centerY(socketRect) - centerY(sourceResponseRect)) : null,
      socketToSourceArmGap: socketRect && sourceEndpointRect ? sourceEndpointRect.left - socketRect.right : null,
      responseElbowCenterX: responseElbowRect ? responseElbowRect.left + responseElbowRect.width / 2 : null,
      responseElbowCenterY: centerY(responseElbowRect),
      continuationElbowCenterY: centerY(continuationElbowRect),
      responseArmElbowGap: sourceEndpointRect && responseElbowRect ? responseElbowRect.left - sourceEndpointRect.right : null,
      continuationArmNodeGap: continuationEndpointRect && firstContinuationNodeRect ? firstContinuationNodeRect.left - continuationEndpointRect.right : null,
      verticalTop: connectorVerticalRect?.top ?? null,
      verticalBottom: connectorVerticalRect?.bottom ?? null,
      responseElbowRect: rect(responseElbow),
      continuationElbowRect: rect(continuationElbow),
      sourceArmRect: rect(sourceEndpoint),
      continuationArmRect: rect(continuationEndpoint),
      verticalRect: rect(connectorVertical),
      colors: {
        sourceArm: sourceEndpoint ? getComputedStyle(sourceEndpoint).backgroundColor : '',
        vertical: connectorVertical ? getComputedStyle(connectorVertical).backgroundColor : '',
        continuationArm: continuationEndpoint ? getComputedStyle(continuationEndpoint).backgroundColor : '',
        responseElbow: responseElbow ? getComputedStyle(responseElbow).backgroundColor : '',
        continuationElbow: continuationElbow ? getComputedStyle(continuationElbow).backgroundColor : '',
        socket: socket ? getComputedStyle(socket).backgroundColor : '',
      },
    },
    pipeline: {
      source: sourcePipelines.map((node)=>({
        segment: node.getAttribute('data-fork-source-pipeline'),
        rect: rect(node),
        color: getComputedStyle(node).backgroundColor,
      })),
      sourceNode: rect(sourcePromptNode),
      sourceNodeColor: sourcePromptNode ? getComputedStyle(sourcePromptNode).backgroundColor : '',
      sourceResponseNode: rect(sourceResponseNode),
      sourceResponseNodeColor: sourceResponseNode ? getComputedStyle(sourceResponseNode).backgroundColor : '',
      sourceContinuityGap: sourcePipelines.length === 2
        ? sourcePipelines[1].getBoundingClientRect().top - sourcePipelines[0].getBoundingClientRect().bottom
        : null,
      sourceTerminationDelta: sourcePipelines.length === 2 && sourceResponseNode
        ? sourcePipelines[1].getBoundingClientRect().bottom - centerY(sourceResponseNode.getBoundingClientRect())
        : null,
      continuation: continuationPipelines.map((node)=>({
        id: node.getAttribute('data-fork-continuation-pipeline'),
        firstStep: node.getAttribute('data-fork-continuation-pipeline-first-step'),
        lastStep: node.getAttribute('data-fork-continuation-pipeline-last-step'),
        rect: rect(node),
        color: getComputedStyle(node).backgroundColor,
      })),
      continuationPromptCenters,
      continuationResponseCenters,
      continuationPromptNodes: continuationPromptNodes.map((node)=>{
        const nodeRect=node.getBoundingClientRect();
        const prompt=root.querySelector('[data-fork-continuation-prompt="'+CSS.escape(node.getAttribute('data-fork-continuation-prompt-node') || '')+'"]');
        const promptRect=prompt?.getBoundingClientRect();
        return {
          id: node.getAttribute('data-fork-continuation-prompt-node'),
          rect: rect(node),
          color: getComputedStyle(node).backgroundColor,
          promptDelta: promptRect ? Math.abs(centerY(nodeRect) - centerY(promptRect)) : null,
        };
      }),
      continuationResponseNodes: continuationResponseNodes.map((node)=>{
        const nodeRect=node.getBoundingClientRect();
        const response=root.querySelector('[data-fork-continuation-response="'+CSS.escape(node.getAttribute('data-fork-continuation-response-node') || '')+'"]');
        const responseRect=response?.getBoundingClientRect();
        return {
          id: node.getAttribute('data-fork-continuation-response-node'),
          rect: rect(node),
          color: getComputedStyle(node).backgroundColor,
          responseDelta: responseRect ? Math.abs(centerY(nodeRect) - centerY(responseRect)) : null,
        };
      }),
      continuationIncomingArms: continuationIncomingArms.map((node)=>({
        id: node.getAttribute('data-fork-continuation-incoming-arm'),
        rect: rect(node),
        color: getComputedStyle(node).backgroundColor,
      })),
      continuationCardArms: [
        ...continuationPromptCardArms.map((node)=>({
          kind:'prompt',
          id:node.getAttribute('data-fork-continuation-prompt-card-arm'),
          rect:rect(node),
          color:getComputedStyle(node).backgroundColor,
        })),
        ...continuationResponseCardArms.map((node)=>({
          kind:'response',
          id:node.getAttribute('data-fork-continuation-response-card-arm'),
          rect:rect(node),
          color:getComputedStyle(node).backgroundColor,
        })),
      ],
    },
    desktopGeometry: {
      layout: desktopPath?.getAttribute('data-fork-desktop-layout') || '',
      gridColumns: desktopPath ? getComputedStyle(desktopPath).gridTemplateColumns.trim().split(/\\s+/).filter(Boolean) : [],
      sourceLane: rect(sourceLane),
      connectorLane: rect(connectorLane),
      continuationLane: rect(continuationLane),
      sourceGap: sourceLane && connectorLane ? connectorLane.getBoundingClientRect().left - sourceLane.getBoundingClientRect().right : null,
      continuationGap: connectorLane && continuationLane ? continuationLane.getBoundingClientRect().left - connectorLane.getBoundingClientRect().right : null,
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
  if (Math.abs(geometry.sourceGap - 16) > 1 || Math.abs(geometry.continuationGap - 16) > 1) {
    throw new Error(`${label} desktop branch gaps are ${geometry.sourceGap}px and ${geometry.continuationGap}px instead of 16px.`)
  }
  if (connector.width < 64 || connector.height < 20) {
    throw new Error(`${label} response-to-prompt connector is only ${connector.width}x${connector.height}px.`)
  }
  if (Math.abs(socket.width - 48) > 1 || Math.abs(socket.height - 48) > 1) {
    throw new Error(`${label} response-edge socket is ${socket.width}x${socket.height}px instead of 48x48px.`)
  }
  for (const [name, elbow] of [
    ['response', snapshot.connector.responseElbowRect],
    ['continuation', snapshot.connector.continuationElbowRect],
  ]) {
    if (!elbow || Math.abs(elbow.width - 16) > 1 || Math.abs(elbow.height - 16) > 1) {
      throw new Error(`${label} ${name} elbow is not a plain 16px square.`)
    }
    if (elbow.left < connectorLane.left + 16 || elbow.right > connectorLane.right - 16) {
      throw new Error(`${label} ${name} elbow does not retain 16px clearance inside the 72px connector lane.`)
    }
  }
}

function assertResponseToPromptPipeline(snapshot, label, expectedSourceNumber, expectedContinuationNumbers) {
  if (snapshot.authoritative) {
    const sourceResponse = snapshot.connector?.sourceStep
    const targetPrompt = snapshot.connector?.targetStep
    if (!sourceResponse || sourceResponse !== snapshot.sourceResponses[0]) {
      throw new Error(`${label} lost exact authoritative response provenance.`)
    }
    if (!targetPrompt || targetPrompt !== snapshot.continuationPrompts[0]?.id) {
      throw new Error(`${label} connector missed the first authoritative continuation prompt.`)
    }
    if (!sourceResponse.endsWith(`:step:${expectedSourceNumber}`)) {
      throw new Error(`${label} authoritative response is ${sourceResponse} instead of response ${expectedSourceNumber}.`)
    }
    const promptNumbers = snapshot.continuationPrompts.map((prompt) => prompt.stepNumber)
    const responseNumbers = snapshot.continuationResponses.map((response) => response.stepNumber)
    if (
      JSON.stringify(promptNumbers) !== JSON.stringify(expectedContinuationNumbers) ||
      JSON.stringify(responseNumbers) !== JSON.stringify(expectedContinuationNumbers)
    ) {
      throw new Error(
        `${label} authoritative continuation is ${JSON.stringify(promptNumbers)}/${JSON.stringify(responseNumbers)} ` +
        `instead of ${JSON.stringify(expectedContinuationNumbers)}.`,
      )
    }
    if (
      snapshot.edgeCount !== snapshot.generationCount - 1 ||
      snapshot.edgeGeometry.some((geometry) => (
        [geometry.sourceXDelta, geometry.sourceYDelta, geometry.targetXDelta, geometry.targetYDelta]
          .some((delta) => !Number.isFinite(delta) || delta > 2)
      ))
    ) {
      throw new Error(`${label} authoritative response-to-prompt geometry drifted.`)
    }
    if (
      snapshot.rootPipeColor !== 'rgb(43, 209, 95)' ||
      snapshot.forkPipeColors.some((color) => color !== 'rgb(232, 122, 44)') ||
      snapshot.connectorStrokes.some((stroke) => !['#8f3f0a', '#e87a2c'].includes(stroke)) ||
      snapshot.duplicateTestIds.length > 0
    ) {
      throw new Error(`${label} authoritative pipe colors or selector uniqueness drifted.`)
    }
    return
  }
  const sourceResponse = snapshot.connector?.sourceStep
  const targetPrompt = snapshot.connector?.targetStep
  if (!sourceResponse || !targetPrompt) throw new Error(`${label} omitted response-to-prompt connector identity.`)
  if (sourceResponse !== snapshot.sourceResponses[0]) {
    throw new Error(`${label} connector source ${sourceResponse} drifted from truthful response provenance ${snapshot.sourceResponses[0]}.`)
  }
  if (targetPrompt !== snapshot.continuationPrompts[0]?.id) {
    throw new Error(`${label} connector targets ${targetPrompt} instead of first continuation prompt ${snapshot.continuationPrompts[0]?.id || '(missing)'}.`)
  }
  if (!Number.isFinite(snapshot.connector.sourceResponseDelta) || snapshot.connector.sourceResponseDelta > 2) {
    throw new Error(`${label} source endpoint misses the exact inherited response center by ${snapshot.connector.sourceResponseDelta}px.`)
  }
  if (!Number.isFinite(snapshot.connector.continuationPromptDelta) || snapshot.connector.continuationPromptDelta > 2) {
    throw new Error(`${label} continuation endpoint misses the first prompt center by ${snapshot.connector.continuationPromptDelta}px.`)
  }
  if (!Number.isFinite(snapshot.connector.sourcePromptDelta) || snapshot.connector.sourcePromptDelta < 24) {
    throw new Error(`${label} connector still appears prompt-centered (${snapshot.connector.sourcePromptDelta}px from the prompt center).`)
  }
  if (snapshot.connector.socketStep !== sourceResponse) {
    throw new Error(`${label} response socket identity ${snapshot.connector.socketStep || '(missing)'} does not match ${sourceResponse}.`)
  }
  if (
    !Number.isFinite(snapshot.connector.socketResponseEdgeDelta) ||
    snapshot.connector.socketResponseEdgeDelta > 2 ||
    !Number.isFinite(snapshot.connector.socketResponseCenterDelta) ||
    snapshot.connector.socketResponseCenterDelta > 2
  ) {
    throw new Error(`${label} orange socket is not centered on the exact response card edge.`)
  }
  if (!Number.isFinite(snapshot.connector.socketToSourceArmGap) || snapshot.connector.socketToSourceArmGap > 2 || snapshot.connector.socketToSourceArmGap < -16) {
    throw new Error(`${label} response socket and orange source arm have an invalid ${snapshot.connector.socketToSourceArmGap}px clearance.`)
  }
  if (snapshot.connector.sourceArmRect?.width < 40 || snapshot.connector.continuationArmRect?.width < 60) {
    throw new Error(`${label} connector horizontal arms collapsed below their required clear spans.`)
  }
  if (!Number.isFinite(snapshot.connector.responseArmElbowGap) || snapshot.connector.responseArmElbowGap > 0 || snapshot.connector.responseArmElbowGap < -16) {
    throw new Error(`${label} orange source arm does not meet its response elbow cleanly.`)
  }
  if (!Number.isFinite(snapshot.connector.continuationArmNodeGap) || snapshot.connector.continuationArmNodeGap > 2 || snapshot.connector.continuationArmNodeGap < -16) {
    throw new Error(`${label} orange continuation arm and first prompt node have an invalid ${snapshot.connector.continuationArmNodeGap}px clearance.`)
  }
  if (
    Math.abs(snapshot.connector.responseElbowCenterY - snapshot.connector.sourceResponseCenter) > 2 ||
    Math.abs(snapshot.connector.continuationElbowCenterY - snapshot.connector.continuationPromptCenter) > 2
  ) {
    throw new Error(`${label} connector elbows do not share the response and first-prompt centers.`)
  }
  const expectedVerticalTop = Math.min(snapshot.connector.sourceResponseCenter, snapshot.connector.continuationPromptCenter)
  const expectedVerticalBottom = Math.max(snapshot.connector.sourceResponseCenter, snapshot.connector.continuationPromptCenter)
  if (
    Math.abs(snapshot.connector.verticalTop - expectedVerticalTop) > 2 ||
    Math.abs(snapshot.connector.verticalBottom - expectedVerticalBottom) > 2
  ) {
    throw new Error(`${label} connector vertical does not span exactly between response and first-prompt centers.`)
  }
  if (Object.values(snapshot.connector.colors).some((color) => color !== 'rgb(232, 122, 44)')) {
    throw new Error(`${label} response-to-prompt socket, arms, vertical, or elbows are not fully orange.`)
  }
  if (!sourceResponse.endsWith(`:step:${expectedSourceNumber}`)) {
    throw new Error(`${label} inherited response identity is ${sourceResponse} instead of response ${expectedSourceNumber}.`)
  }
  const continuationNumbers = snapshot.continuationPrompts.map((prompt) => prompt.stepNumber)
  if (JSON.stringify(continuationNumbers) !== JSON.stringify(expectedContinuationNumbers)) {
    throw new Error(`${label} continuation prompts are ${JSON.stringify(continuationNumbers)} instead of ${JSON.stringify(expectedContinuationNumbers)}.`)
  }
  const pipeline = snapshot.pipeline
  if (
    pipeline?.source?.length !== 2 ||
    pipeline.source.some((segment) => segment.rect?.width < 28 || segment.rect?.height < 40)
  ) {
    throw new Error(`${label} did not render substantial prompt and response source-spine segments.`)
  }
  if (
    pipeline.source.some((segment) => segment.color !== 'rgb(43, 209, 95)') ||
    pipeline.sourceNodeColor !== 'rgb(43, 209, 95)' ||
    pipeline.sourceResponseNodeColor !== 'rgb(43, 209, 95)'
  ) {
    throw new Error(`${label} inherited spine/prompt/response nodes lost the green source-path language.`)
  }
  if (
    !Number.isFinite(pipeline.sourceContinuityGap) ||
    Math.abs(pipeline.sourceContinuityGap) > 1 ||
    !Number.isFinite(pipeline.sourceTerminationDelta) ||
    Math.abs(pipeline.sourceTerminationDelta) > 2
  ) {
    throw new Error(
      `${label} green source spine continuity/termination deltas are ` +
      `${pipeline.sourceContinuityGap}px/${pipeline.sourceTerminationDelta}px.`,
    )
  }
  if (pipeline.continuationPromptNodes.some((node) => node.color !== 'rgb(232, 122, 44)' || node.rect?.width < 44 || node.rect?.height < 52 || !Number.isFinite(node.promptDelta) || node.promptDelta > 2)) {
    throw new Error(`${label} continuation prompt nodes are not orange and prompt-centered.`)
  }
  if (pipeline.continuationResponseNodes.some((node) => node.color !== 'rgb(232, 122, 44)' || node.rect?.width < 44 || node.rect?.height < 52 || !Number.isFinite(node.responseDelta) || node.responseDelta > 2)) {
    throw new Error(`${label} continuation response nodes are not orange and response-centered.`)
  }
  if (
    pipeline.continuationPromptNodes.length !== expectedContinuationNumbers.length ||
    pipeline.continuationResponseNodes.length !== expectedContinuationNumbers.length ||
    snapshot.continuationResponses.length !== expectedContinuationNumbers.length
  ) {
    throw new Error(
      `${label} rendered ${pipeline.continuationPromptNodes.length} prompt nodes and ` +
      `${pipeline.continuationResponseNodes.length} response nodes for ${expectedContinuationNumbers.length} continuation pairs.`,
    )
  }
  const continuationResponseNumbers = snapshot.continuationResponses.map((response) => response.stepNumber)
  if (JSON.stringify(continuationResponseNumbers) !== JSON.stringify(expectedContinuationNumbers)) {
    throw new Error(`${label} continuation responses are ${JSON.stringify(continuationResponseNumbers)} instead of ${JSON.stringify(expectedContinuationNumbers)}.`)
  }
  if (
    pipeline.continuationIncomingArms.length !== 1 ||
    pipeline.continuationIncomingArms[0]?.id !== snapshot.continuationPrompts[0]?.id ||
    pipeline.continuationIncomingArms[0]?.color !== 'rgb(232, 122, 44)'
  ) {
    throw new Error(`${label} must expose exactly one orange incoming arm at the first continuation prompt.`)
  }
  if (
    pipeline.continuationCardArms.length !== expectedContinuationNumbers.length * 2 ||
    pipeline.continuationCardArms.some((arm) => arm.color !== 'rgb(232, 122, 44)' || arm.rect?.width < 36)
  ) {
    throw new Error(`${label} prompt/response card arms are missing, collapsed, or not orange.`)
  }
  for (let index = 0; index < expectedContinuationNumbers.length; index += 1) {
    const promptCenter = pipeline.continuationPromptCenters[index]
    const responseCenter = pipeline.continuationResponseCenters[index]
    const nextPromptCenter = pipeline.continuationPromptCenters[index + 1]
    if (!Number.isFinite(promptCenter) || !Number.isFinite(responseCenter) || promptCenter >= responseCenter) {
      throw new Error(`${label} continuation pair ${expectedContinuationNumbers[index]} does not progress prompt to response.`)
    }
    if (Number.isFinite(nextPromptCenter) && responseCenter >= nextPromptCenter) {
      throw new Error(`${label} continuation response ${expectedContinuationNumbers[index]} does not precede the next prompt.`)
    }
  }
  const segment = pipeline.continuation[0]
  const firstPromptCenter = pipeline.continuationPromptCenters[0]
  const lastResponseCenter = pipeline.continuationResponseCenters.at(-1)
  if (
    pipeline.continuation.length !== 1 ||
    segment?.color !== 'rgb(232, 122, 44)' ||
    segment.rect?.width < 28 ||
    segment.firstStep !== snapshot.continuationPrompts[0]?.id ||
    segment.lastStep !== snapshot.continuationResponses.at(-1)?.id ||
    !Number.isFinite(firstPromptCenter) ||
    !Number.isFinite(lastResponseCenter) ||
    Math.abs(segment.rect?.top - firstPromptCenter) > 2 ||
    Math.abs(segment.rect?.bottom - lastResponseCenter) > 2
  ) {
    throw new Error(`${label} does not render one continuous orange spine exactly from the first prompt center to the last response center.`)
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
  if (!snapshot.connector?.visible) throw new Error(`${label} did not render the response-to-prompt connector.`)
  if (snapshot.authoritative) {
    if (snapshot.generationCount < 2 || snapshot.edgeCount !== snapshot.generationCount - 1) {
      throw new Error(`${label} did not preserve a complete authoritative generation chain.`)
    }
    return
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
      (
        value.authoritative ||
        (
          value.desktopGeometry?.gridColumns?.length === 3 &&
          value.desktopGeometry?.connector?.width >= 64 &&
          value.desktopGeometry?.socket?.width >= 44
        )
      ) &&
      Number.isFinite(value.connector?.sourceResponseDelta) &&
      value.connector.sourceResponseDelta <= 2 &&
      Number.isFinite(value.connector?.continuationPromptDelta) &&
      value.connector.continuationPromptDelta <= 2
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
        '[data-fork-desktop-path] aside [data-fork-source-prompt] details summary'
      );
      if (!summary) return false;
      summary.click();
      return true;
    })()`,
    returnByValue: true,
  }, sessionId)
  if (!expanded.result.value) {
    throw new Error(`${label} did not expose the exact source-prompt disclosure.`)
  }

  const snapshot = await waitForValue(
    client,
    sessionId,
    lineageSnapshotExpression,
    (value) => (
      value?.connector?.visible &&
      Number.isFinite(value.connector?.sourceResponseDelta) &&
      value.connector.sourceResponseDelta <= 2 &&
      Number.isFinite(value.connector?.continuationPromptDelta) &&
      value.connector.continuationPromptDelta <= 2
    ),
    `${label} response connector realignment after source-prompt expansion`,
  )
  if (snapshot.connector.sourceStep !== snapshot.sourceResponses[0]) {
    throw new Error(`${label} connector changed source provenance after prompt disclosure expansion.`)
  }
}

async function verifyParentExistingForkRail(client, sessionId, label) {
  const snapshot = await waitForValue(
    client,
    sessionId,
    `(() => {
      const rail=document.querySelector('[data-fork-existing-branch-origin="response"]');
      const row=rail?.closest('[data-source-run-response-row]');
      const prompt=row?.querySelector('[data-source-run-node="prompt"]');
      const response=row?.querySelector('[data-source-run-node="response"]');
      const responseCard=response?.querySelector('[data-source-run-card="response"]');
      const orangePipe=rail?.querySelector('[data-fork-existing-branch-pipe]');
      const orangeNode=rail?.querySelector('[data-fork-existing-branch-node]');
      const greenPipes=[...document.querySelectorAll('[data-source-run-pipeline]')];
      const greenNode=response?.querySelector('[data-source-run-pipe-node="response"]');
      const socket=rail?.querySelector('[data-response-fork-socket]');
      const rect=(node)=>{
        const value=node?.getBoundingClientRect();
        return value ? { top:value.top, height:value.height, width:value.width } : null;
      };
      const center=(value)=>value ? value.top + value.height / 2 : null;
      const socketRect=rect(socket);
      const responseCardRect=rect(responseCard);
      return {
        found:Boolean(rail && response && responseCard && orangePipe && orangeNode && greenPipes.length > 0 && greenNode),
        railFound:Boolean(rail),
        responseFound:Boolean(response),
        orangePipeFound:Boolean(orangePipe),
        orangeNodeFound:Boolean(orangeNode),
        greenPipeFound:greenPipes.length > 0,
        greenNodeFound:Boolean(greenNode),
        responseRow:response?.getAttribute('data-source-run-node') || '',
        promptInRow:Boolean(prompt),
        step:rail?.getAttribute('data-fork-existing-branch-step') || '',
        responseStep:response?.getAttribute('data-source-run-step-id') || '',
        promptOriginCount:document.querySelectorAll('[data-fork-existing-branch-origin="prompt"]').length,
        orangePipe:orangePipe ? getComputedStyle(orangePipe).backgroundColor : '',
        orangeNode:orangeNode ? getComputedStyle(orangeNode).backgroundColor : '',
        greenPipes:greenPipes.map((node)=>getComputedStyle(node).backgroundColor),
        greenNode:greenNode ? getComputedStyle(greenNode).backgroundColor : '',
        socketResponseCardDelta:socketRect && responseCardRect ? Math.abs(center(socketRect)-center(responseCardRect)) : null,
      };
    })()`,
    (value) => value?.found,
    `${label} response-origin existing-fork rail`,
  )
  if (snapshot.responseRow !== 'response' || snapshot.promptInRow || snapshot.promptOriginCount !== 0) {
    throw new Error(`${label} existing-fork rail is not isolated to the response row.`)
  }
  if (!snapshot.step || snapshot.step !== snapshot.responseStep) {
    throw new Error(`${label} existing-fork rail lost its exact response identity.`)
  }
  if (snapshot.orangePipe !== 'rgb(232, 122, 44)' || snapshot.orangeNode !== 'rgb(232, 122, 44)') {
    throw new Error(`${label} existing-fork branch is not orange.`)
  }
  if (snapshot.greenPipes.some((color) => color !== 'rgb(43, 209, 95)') || snapshot.greenNode !== 'rgb(43, 209, 95)') {
    throw new Error(`${label} main source spine is not green.`)
  }
  if (!Number.isFinite(snapshot.socketResponseCardDelta) || snapshot.socketResponseCardDelta > 2) {
    throw new Error(`${label} existing-fork socket misses the full response-card center by ${snapshot.socketResponseCardDelta}px.`)
  }
}

async function captureElement(client, sessionId, selector, destination) {
  const resetDocumentOriginExpression = `(() => {
    window.scrollTo({ left:0, top:0, behavior:'instant' });
    document.documentElement.scrollLeft=0;
    document.documentElement.scrollTop=0;
    document.body.scrollLeft=0;
    document.body.scrollTop=0;
    return { windowX:window.scrollX, windowY:window.scrollY, documentY:document.documentElement.scrollTop, bodyY:document.body.scrollTop };
  })()`
  await waitForValue(
    client,
    sessionId,
    resetDocumentOriginExpression,
    (value) => value?.windowX === 0 && value.windowY === 0 && value.documentY === 0 && value.bodyY === 0,
    `document origin before screenshot ${selector}`,
  )
  await client.send('Runtime.evaluate', {
    expression: `(async () => {
      await document.fonts.ready;
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      return true;
    })()`,
    returnByValue: true,
    awaitPromise: true,
  }, sessionId)
  await waitForValue(
    client,
    sessionId,
    resetDocumentOriginExpression,
    (value) => value?.windowX === 0 && value.windowY === 0 && value.documentY === 0 && value.bodyY === 0,
    `stable document origin before screenshot ${selector}`,
  )
  const clip = await waitForValue(
    client,
    sessionId,
    `(() => {
      window.scrollTo({ left:0, top:0, behavior:'instant' });
      document.documentElement.scrollLeft=0;
      document.documentElement.scrollTop=0;
      document.body.scrollLeft=0;
      document.body.scrollTop=0;
      document.querySelectorAll('nextjs-portal').forEach((node)=>node.remove());
      const node=document.querySelector(${JSON.stringify(selector)});
      if (!node) return null;
      const rect=node.getBoundingClientRect();
      return {
        x:Math.max(0, rect.left + window.scrollX),
        y:Math.max(0, rect.top + window.scrollY),
        width:Math.ceil(rect.width),
        height:Math.ceil(rect.height),
        scale:1,
      };
    })()`,
    (value) => value?.width > 0 && value?.height > 0,
    `screenshot target ${selector}`,
  )
  const { data } = await client.send('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: true,
    fromSurface: true,
    clip,
  }, sessionId)
  writeFileSync(destination, Buffer.from(data, 'base64'))
}

async function captureViewport(client, sessionId, selector, destination) {
  await client.send('Runtime.evaluate', {
    expression: `(() => {
      document.querySelectorAll('nextjs-portal').forEach((node)=>node.remove());
      const node=document.querySelector(${JSON.stringify(selector)});
      if (node) {
        const top=node.getBoundingClientRect().top+window.scrollY;
        const stickyHeader=[...document.querySelectorAll('header')]
          .find((header)=>{
            const style=getComputedStyle(header);
            return (style.position === 'sticky' || style.position === 'fixed') && Number.parseFloat(style.top) === 0;
          });
        const stickyOffset=(stickyHeader?.getBoundingClientRect().height || 0)+16;
        window.scrollTo({ left:0, top:Math.max(0, top-stickyOffset), behavior:'instant' });
        document.documentElement.scrollLeft=0;
        document.body.scrollLeft=0;
      }
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
      return Boolean(node);
    })()`,
    returnByValue: true,
  }, sessionId)
  await waitForValue(
    client,
    sessionId,
    `({ windowX:window.scrollX, documentX:document.documentElement.scrollLeft, bodyX:document.body.scrollLeft })`,
    (value) => value?.windowX === 0 && value.documentX === 0 && value.bodyX === 0,
    `zero horizontal scroll before screenshot ${selector}`,
  )
  await waitForValue(
    client,
    sessionId,
    `(() => {
      const node=document.querySelector(${JSON.stringify(selector)});
      const stickyHeader=[...document.querySelectorAll('header')]
        .find((header)=>{
          const style=getComputedStyle(header);
          return (style.position === 'sticky' || style.position === 'fixed') && Number.parseFloat(style.top) === 0;
        });
      if (!node) return false;
      if (window.scrollY === 0 || !stickyHeader) return true;
      return node.getBoundingClientRect().top >= stickyHeader.getBoundingClientRect().bottom + 12;
    })()`,
    Boolean,
    `screenshot target below sticky header ${selector}`,
  )
  await client.send('Runtime.evaluate', {
    expression: `(async () => {
      await document.fonts.ready;
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      return true;
    })()`,
    returnByValue: true,
    awaitPromise: true,
  }, sessionId)
  const viewportClip = await waitForValue(
    client,
    sessionId,
    `({
      x:0,
      y:window.scrollY,
      width:window.innerWidth,
      height:window.innerHeight,
      scale:1,
      visualOffsetLeft:window.visualViewport?.offsetLeft || 0,
      visualPageLeft:window.visualViewport?.pageLeft || 0,
    })`,
    (value) => value?.width > 0 && value?.height > 0,
    `viewport screenshot clip ${selector}`,
  )
  if (viewportClip.visualOffsetLeft !== 0 || viewportClip.visualPageLeft !== 0) {
    throw new Error(
      `Viewport was horizontally panned before ${selector} capture: ` +
      `${viewportClip.visualOffsetLeft}px/${viewportClip.visualPageLeft}px.`,
    )
  }
  const { data } = await client.send('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: false,
    fromSurface: true,
  }, sessionId)
  writeFileSync(destination, Buffer.from(data, 'base64'))
}

async function verifyMobileLineage(client, sessionId, mode, label, screenshotPath) {
  const mobile = await waitForValue(
    client,
    sessionId,
    `(() => {
      const root=document.querySelector('[data-project-fork-build-path]');
      const disclosure=root?.querySelector('details[data-fork-inherited-path]');
      const desktopPath=[...root?.querySelectorAll('aside[data-fork-inherited-path]') || []][0];
      const connectorLane=root?.querySelector('[data-fork-connector-lane]');
      const continuationLane=root?.querySelector('[data-fork-continuation-lane]');
      const pipeline=root?.querySelector('[data-fork-continuation-pipeline]');
      const promptNode=root?.querySelector('[data-fork-continuation-prompt-node]');
      const responseNode=root?.querySelector('[data-fork-continuation-response-node]');
      const rootRect=root?.getBoundingClientRect();
      const continuationRect=continuationLane?.getBoundingClientRect();
      const workspace=root?.querySelector('[data-fork-continuation-workspace]');
      const continuationArticles=[...root?.querySelectorAll('[data-fork-continuation]') || []]
        .filter((node)=>getComputedStyle(node).display !== 'none')
        .map((node)=>({
          width:node.getBoundingClientRect().width,
          clientWidth:node.clientWidth,
          scrollWidth:node.scrollWidth,
          trackWidth:node.parentElement?.getBoundingClientRect().width || 0,
          overflowingDescendants:[...node.querySelectorAll('*')]
            .filter((child)=>{
              const childRect=child.getBoundingClientRect();
              const nodeRect=node.getBoundingClientRect();
              return childRect.right > nodeRect.right + 1 || child.scrollWidth > child.clientWidth + 1;
            })
            .slice(0, 8)
            .map((child)=>({
              tag:child.tagName,
              className:typeof child.className === 'string' ? child.className : '',
              clientWidth:child.clientWidth,
              scrollWidth:child.scrollWidth,
              right:child.getBoundingClientRect().right,
            })),
        }));
      return {
        mode:root?.getAttribute('data-project-fork-build-path-mode') || '',
        overflow:document.documentElement.scrollWidth-window.innerWidth,
        visualOffsetLeft:window.visualViewport?.offsetLeft || 0,
        visualPageLeft:window.visualViewport?.pageLeft || 0,
        disclosureVisible:Boolean(disclosure && getComputedStyle(disclosure).display !== 'none'),
        desktopHidden:Boolean(desktopPath && getComputedStyle(desktopPath).display === 'none'),
        connectorHidden:Boolean(connectorLane && getComputedStyle(connectorLane).display === 'none'),
        pipelineHidden:Boolean(!pipeline || getComputedStyle(pipeline).display === 'none'),
        promptNodeHidden:Boolean(promptNode && getComputedStyle(promptNode).display === 'none'),
        responseNodeHidden:Boolean(responseNode && getComputedStyle(responseNode).display === 'none'),
        continuationWidth:continuationRect?.width || 0,
        availableWidth:rootRect?.width || 0,
        rootClientWidth:root?.clientWidth || 0,
        rootScrollWidth:root?.scrollWidth || 0,
        continuationClientWidth:continuationLane?.clientWidth || 0,
        continuationScrollWidth:continuationLane?.scrollWidth || 0,
        workspaceClientWidth:workspace?.clientWidth || 0,
        workspaceScrollWidth:workspace?.scrollWidth || 0,
        continuationArticles,
      };
    })()`,
    (value) => value?.mode === mode && value.disclosureVisible && value.continuationWidth > 0 && value.availableWidth > 0,
    `${label} 390px lineage layout`,
  )
  if (mobile.overflow > 1) throw new Error(`${label} 390px lineage overflows horizontally by ${mobile.overflow}px.`)
  if (mobile.visualOffsetLeft !== 0 || mobile.visualPageLeft !== 0) {
    throw new Error(`${label} 390px visual viewport is horizontally panned by ${mobile.visualOffsetLeft}px/${mobile.visualPageLeft}px.`)
  }
  if (!mobile.desktopHidden || !mobile.connectorHidden || !mobile.pipelineHidden || !mobile.promptNodeHidden || !mobile.responseNodeHidden) {
    throw new Error(`${label} 390px lineage leaked desktop source, connector, or pipeline geometry.`)
  }
  if (mobile.continuationWidth > mobile.availableWidth) {
    throw new Error(`${label} 390px continuation width ${mobile.continuationWidth}px exceeds its ${mobile.availableWidth}px workspace.`)
  }
  if (
    mobile.rootScrollWidth > mobile.rootClientWidth + 1 ||
    mobile.continuationScrollWidth > mobile.continuationClientWidth + 1 ||
    mobile.workspaceScrollWidth > mobile.workspaceClientWidth + 1
  ) {
    throw new Error(
      `${label} 390px internal overflow was masked: root ${mobile.rootClientWidth}/${mobile.rootScrollWidth}, ` +
      `continuation ${mobile.continuationClientWidth}/${mobile.continuationScrollWidth}, ` +
      `workspace ${mobile.workspaceClientWidth}/${mobile.workspaceScrollWidth}, ` +
      `articles ${JSON.stringify(mobile.continuationArticles)}.`,
    )
  }
  const overflowingArticle = mobile.continuationArticles.find((article) => (
    article.width > article.trackWidth + 1 || article.scrollWidth > article.clientWidth + 1
  ))
  if (overflowingArticle) {
    throw new Error(`${label} 390px continuation article escapes its grid track: ${JSON.stringify(overflowingArticle)}.`)
  }
  if (screenshotPath) await captureViewport(client, sessionId, '[data-project-fork-build-path]', screenshotPath)
}

async function verifyMobileFork(client, sessionId, url, label, screenshotPath) {
  await navigate(client, sessionId, url)
  await verifyMobileLineage(client, sessionId, 'child', label, screenshotPath)
}

async function verifyMobileParentRail(
  client,
  sessionId,
  url,
  label,
  screenshotPath,
  navigationOptions,
  evidenceMode = 'element',
) {
  await navigate(client, sessionId, url, navigationOptions)
  const snapshot = await waitForValue(
    client,
    sessionId,
    `(() => {
      const responseRow=document.querySelector('[data-source-run-response-row]:has([data-response-fork-branch-panel])');
      const promptRow=document.querySelector('[data-source-run-prompt-row]:has([data-response-fork-branch-panel])');
      const desktopRail=responseRow?.querySelector('[data-response-fork-hover-rail]');
      return {
        responseRow:Boolean(responseRow),
        responseText:responseRow?.textContent?.trim() || '',
        promptRow:Boolean(promptRow),
        desktopRailHidden:Boolean(desktopRail && getComputedStyle(desktopRail).display === 'none'),
        overflow:document.documentElement.scrollWidth-window.innerWidth,
      };
    })()`,
    (value) => value?.responseRow && value.responseText.includes('Forks from this response'),
    `${label} compact response fork panel`,
  )
  if (snapshot.promptRow || !snapshot.desktopRailHidden || snapshot.overflow > 1) {
    throw new Error(`${label} did not keep its compact fork panel in the response row without horizontal overflow.`)
  }
  if (evidenceMode !== 'element' && evidenceMode !== 'viewport') {
    throw new Error(`${label} uses unsupported mobile rail evidence mode ${evidenceMode}.`)
  }
  if (screenshotPath) {
    const capture = evidenceMode === 'viewport' ? captureViewport : captureElement
    await capture(
      client,
      sessionId,
      '[data-source-run-response-row]:has([data-response-fork-branch-panel])',
      screenshotPath,
    )
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
  const sourceParentUrl = new URL(options.sourceParentRoute, options.baseUrl).href
  const swarmParentUrl = new URL(options.swarmParentRoute, options.baseUrl).href
  const hullParentUrl = new URL(options.hullParentRoute, options.baseUrl).href
  const blackoutChildUrl = new URL(options.blackoutChildRoute, options.baseUrl).href
  const hullChildUrl = new URL(options.hullChildRoute, options.baseUrl).href
  const isLocalEnvironment = ['localhost', '127.0.0.1'].includes(new URL(options.baseUrl).hostname)
  if (options.screenshotDir) mkdirSync(options.screenshotDir, { recursive: true })
  const screenshot = (name) => options.screenshotDir ? path.join(options.screenshotDir, name) : null
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
        const expectedLocalFaviconFailure = isExpectedLocalFaviconFailure(options.baseUrl, entry)
        const expectedLocalVercelFailure = isExpectedLocalVercelScriptFailure(options.baseUrl, entry)
        if (
          !expectedLocalActivationFailure &&
          !expectedLocalFaviconFailure &&
          !expectedLocalVercelFailure
        ) consoleErrors.push(entry.text)
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
      await verifyParentExistingForkRail(client, sessionId, 'HP source parent page')
      if (screenshot('hp-parent-existing-fork-response-row-desktop.png')) {
        await captureElement(
          client,
          sessionId,
          '[data-source-run-response-row]:has([data-fork-existing-branch-origin="response"])',
          screenshot('hp-parent-existing-fork-response-row-desktop.png'),
        )
      }
      await selectOnlyBranch(client, sessionId, 'parent page')
      if (isLocalEnvironment) {
        const localAuthority = await waitForValue(
          client,
          sessionId,
          lineageSnapshotExpression,
          (value) => value?.authoritative === true,
          'local authoritative lineage state',
        )
        if (
          localAuthority.generationCount === 0 &&
          localAuthority.eligibilityReason === 'unavailable'
        ) {
          console.log(
            'Local prepared-route browser corpus skipped after the response-origin parent rail: ' +
            'authoritative lineage reads are unavailable without the production database. ' +
            'Run check:project-fork-depth-10-browser for deterministic production-renderer geometry; ' +
            'rerun this guard against the public host for route/data proof.',
          )
          return
        }
      }
      const parentSnapshot = await waitForLineage(client, sessionId, 'parent', 'parent page')
      assertLineageSnapshot(parentSnapshot, 'parent', 'Parent page')
      assertResponseToPromptPipeline(parentSnapshot, 'Parent page', 2, [3])
      await verifyArtifactDisplay(client, sessionId, parentSnapshot, 'Parent page')
      if (screenshot('hp-school-desk-selected-desktop.png')) {
        await captureElement(client, sessionId, '[data-project-fork-build-path]', screenshot('hp-school-desk-selected-desktop.png'))
      }

      await navigate(client, sessionId, blackoutChildUrl)
      const blackoutSnapshot = await waitForLineage(client, sessionId, 'child', 'Blackout child page')
      assertLineageSnapshot(blackoutSnapshot, 'child', 'Blackout child page')
      assertResponseToPromptPipeline(blackoutSnapshot, 'Blackout child page', 10, [11, 12, 13, 14])
      if (screenshot('airlock-blackout-child-desktop.png')) {
        await captureElement(client, sessionId, '[data-project-fork-build-path]', screenshot('airlock-blackout-child-desktop.png'))
      }

      const hostedParentFixtures = [
        {
          url: sourceParentUrl,
          label: 'Reactor Claude selected Blackout',
          sourceNumber: 10,
          continuationNumbers: [11, 12, 13, 14],
          slug: 'airlock-reactor-claude-blackout',
          mobileRailEvidenceMode: 'viewport',
        },
        {
          url: swarmParentUrl,
          label: 'Reactor GPT selected Swarm Shift',
          sourceNumber: 2,
          continuationNumbers: [3],
          slug: 'airlock-reactor-gpt-swarm',
          navigationOptions: {
            canonicalFallback: {
              url: new URL('/airlock-zero-reactor-run-demo', options.baseUrl).href,
              sourceRunId: '2e526efa-191c-48ea-9ba0-5ff073403770',
              modelIdentity: 'ChatGPT 5.6 Sol · Max',
            },
          },
        },
        {
          url: hullParentUrl,
          label: 'Reactor Gemini selected Hull Breach',
          sourceNumber: 2,
          continuationNumbers: [3, 4, 5, 6, 7, 8, 9],
          slug: 'airlock-reactor-gemini-hull',
        },
      ]

      if (!isLocalEnvironment) {
        for (const fixture of hostedParentFixtures) {
          await navigate(client, sessionId, fixture.url, fixture.navigationOptions)
          await verifyParentExistingForkRail(client, sessionId, `${fixture.label} source parent`)
          if (screenshot(`${fixture.slug}-response-row-desktop.png`)) {
            await captureElement(
              client,
              sessionId,
              '[data-source-run-response-row]:has([data-fork-existing-branch-origin="response"])',
              screenshot(`${fixture.slug}-response-row-desktop.png`),
            )
          }
          await selectOnlyBranch(client, sessionId, fixture.label)
          const selectedSnapshot = await waitForLineage(client, sessionId, 'parent', fixture.label)
          assertLineageSnapshot(selectedSnapshot, 'parent', fixture.label)
          assertResponseToPromptPipeline(
            selectedSnapshot,
            fixture.label,
            fixture.sourceNumber,
            fixture.continuationNumbers,
          )
          if (screenshot(`${fixture.slug}-selected-desktop.png`)) {
            await captureElement(
              client,
              sessionId,
              '[data-project-fork-build-path]',
              screenshot(`${fixture.slug}-selected-desktop.png`),
            )
          }
        }
      }

      await navigate(client, sessionId, childUrl)
      const childSnapshot = await waitForLineage(client, sessionId, 'child', 'child page')
      assertLineageSnapshot(childSnapshot, 'child', 'Child page')
      assertResponseToPromptPipeline(childSnapshot, 'Child page', 2, [3])
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
      if (screenshot('hp-school-desk-child-desktop.png')) {
        await captureElement(client, sessionId, '[data-project-fork-build-path]', screenshot('hp-school-desk-child-desktop.png'))
      }

      await navigate(client, sessionId, nestedChildUrl)
      const swarmSnapshot = await waitForLineage(client, sessionId, 'child', 'Swarm Shift child page')
      assertLineageSnapshot(swarmSnapshot, 'child', 'Swarm Shift child page')
      assertResponseToPromptPipeline(swarmSnapshot, 'Swarm Shift child page', 2, [3])
      if (screenshot('airlock-swarm-child-desktop.png')) {
        await captureElement(client, sessionId, '[data-project-fork-build-path]', screenshot('airlock-swarm-child-desktop.png'))
      }

      await navigate(client, sessionId, hullChildUrl)
      const hullSnapshot = await waitForLineage(client, sessionId, 'child', 'Hull Breach child page')
      assertLineageSnapshot(hullSnapshot, 'child', 'Hull Breach child page')
      assertResponseToPromptPipeline(hullSnapshot, 'Hull Breach child page', 2, [3, 4, 5, 6, 7, 8, 9])
      if (screenshot('airlock-hull-child-desktop.png')) {
        await captureElement(client, sessionId, '[data-project-fork-build-path]', screenshot('airlock-hull-child-desktop.png'))
      }

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
      await verifyMobileParentRail(
        client,
        sessionId,
        parentUrl,
        'HP parent response rail',
        screenshot('hp-parent-existing-fork-response-row-mobile-390.png'),
      )
      await selectOnlyBranch(client, sessionId, 'HP parent mobile')
      await verifyMobileLineage(
        client,
        sessionId,
        'parent',
        'HP selected School Desk',
        screenshot('hp-school-desk-selected-mobile-390.png'),
      )
      await verifyMobileFork(client, sessionId, childUrl, 'School Desk child', screenshot('hp-school-desk-child-mobile-390.png'))
      await verifyMobileFork(client, sessionId, blackoutChildUrl, 'Blackout child', screenshot('airlock-blackout-child-mobile-390.png'))
      await verifyMobileFork(client, sessionId, nestedChildUrl, 'Swarm Shift child', screenshot('airlock-swarm-child-mobile-390.png'))
      if (screenshot('airlock-swarm-prompt-03-lane-mobile-390.png')) {
        await captureElement(
          client,
          sessionId,
          '[data-fork-continuation-lane]',
          screenshot('airlock-swarm-prompt-03-lane-mobile-390.png'),
        )
      }
      await verifyMobileFork(client, sessionId, hullChildUrl, 'Hull Breach child', screenshot('airlock-hull-child-mobile-390.png'))
      if (!isLocalEnvironment) {
        for (const fixture of hostedParentFixtures) {
          await verifyMobileParentRail(
            client,
            sessionId,
            fixture.url,
            `${fixture.label} response rail`,
            screenshot(`${fixture.slug}-response-row-mobile-390.png`),
            fixture.navigationOptions,
            fixture.mobileRailEvidenceMode,
          )
          await selectOnlyBranch(client, sessionId, `${fixture.label} mobile`)
          await verifyMobileLineage(
            client,
            sessionId,
            'parent',
            fixture.label,
            screenshot(`${fixture.slug}-selected-mobile-390.png`),
          )
        }
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
          ? 'Response-to-prompt parent/child/grandchild lineage, four prepared fork shapes, parent response branches, internal mobile containment, artifact display, and three-run isolation passed.'
          : 'Response-to-prompt parent/child/grandchild lineage, four prepared fork shapes, parent response branches, internal mobile containment, and artifact display passed; model-run isolation was not applicable on this route.',
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
