#!/usr/bin/env node

import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const DEFAULT_VIEWPORTS = [
  { name: 'mobile', width: 390, height: 844, mobile: true },
  { name: 'desktop', width: 1440, height: 1000, mobile: false },
]

export function chromeExecutable() {
  const candidates = [
    process.env.CHROME_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ].filter(Boolean)
  return candidates.find((candidate) => existsSync(candidate)) ?? null
}

function parseArgs(argv) {
  const files = []
  let json = false
  let screenshotsDir = ''
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--json') json = true
    else if (arg === '--screenshots-dir') {
      const value = argv[++index]
      if (!value) throw new Error('--screenshots-dir requires a directory path.')
      screenshotsDir = path.resolve(value)
    }
    else if (arg.startsWith('--')) throw new Error(`Unknown option: ${arg}`)
    else files.push(path.resolve(arg))
  }
  if (files.length === 0) {
    throw new Error('Usage: node scripts/measure-html-artifacts.mjs [--json] <artifact.html> [...]')
  }
  for (const file of files) {
    if (!existsSync(file)) throw new Error(`Missing artifact: ${file}`)
    if (!/<!doctype\s+html/i.test(readFileSync(file, 'utf8'))) {
      throw new Error(`Artifact is not a complete HTML document: ${file}`)
    }
  }
  if (screenshotsDir) mkdirSync(screenshotsDir, { recursive: true })
  return { files, json, screenshotsDir }
}

export function waitForWebSocketUrl(child) {
  return new Promise((resolve, reject) => {
    let stderr = ''
    const timeout = setTimeout(() => reject(new Error(`Chrome DevTools startup timed out. ${stderr}`)), 15_000)
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString()
      const match = stderr.match(/DevTools listening on (ws:\/\/[^\s]+)/)
      if (!match) return
      clearTimeout(timeout)
      resolve(match[1])
    })
    child.once('exit', (code) => {
      clearTimeout(timeout)
      reject(new Error(`Chrome exited before DevTools was ready (code ${code}). ${stderr}`))
    })
  })
}

export class CdpClient {
  constructor(url) {
    this.nextId = 1
    this.pending = new Map()
    this.listeners = new Set()
    this.socket = new WebSocket(url)
  }

  async ready() {
    if (this.socket.readyState === WebSocket.OPEN) return
    await new Promise((resolve, reject) => {
      this.socket.addEventListener('open', resolve, { once: true })
      this.socket.addEventListener('error', reject, { once: true })
    })
    this.socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data)
      if (message.id) {
        const pending = this.pending.get(message.id)
        if (!pending) return
        this.pending.delete(message.id)
        if (message.error) pending.reject(new Error(message.error.message))
        else pending.resolve(message.result)
        return
      }
      for (const listener of this.listeners) listener(message)
    })
  }

  send(method, params = {}, sessionId) {
    const id = this.nextId++
    const payload = { id, method, params, ...(sessionId ? { sessionId } : {}) }
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
      this.socket.send(JSON.stringify(payload))
    })
  }

  waitFor(method, sessionId, timeoutMs = 10_000) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.listeners.delete(listener)
        reject(new Error(`Timed out waiting for ${method}.`))
      }, timeoutMs)
      const listener = (message) => {
        if (message.method !== method || message.sessionId !== sessionId) return
        clearTimeout(timeout)
        this.listeners.delete(listener)
        resolve(message.params)
      }
      this.listeners.add(listener)
    })
  }

  close() {
    this.socket.close()
  }
}

async function measure(client, file, viewport, screenshotsDir) {
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
        width: viewport.width,
        height: viewport.height,
        deviceScaleFactor: 1,
        mobile: viewport.mobile,
      }, sessionId),
    ])
    const loaded = client.waitFor('Page.loadEventFired', sessionId)
    await client.send('Page.navigate', { url: pathToFileURL(file).href }, sessionId)
    await loaded
    await new Promise((resolve) => setTimeout(resolve, 350))
    const { result } = await client.send('Runtime.evaluate', {
      expression: `(() => {
        const root = document.documentElement
        const body = document.body
        const viewportWidth = root.clientWidth
        const scrollWidth = Math.max(root.scrollWidth, body?.scrollWidth ?? 0)
        const viewportHeight = root.clientHeight
        const scrollHeight = Math.max(root.scrollHeight, body?.scrollHeight ?? 0)
        const overflowingElements = [...document.querySelectorAll('*')]
          .map((element) => {
            const rect = element.getBoundingClientRect()
            return {
              tag: element.tagName.toLowerCase(),
              id: element.id || null,
              className: typeof element.className === 'string' ? element.className.slice(0, 100) : null,
              left: Math.round(rect.left),
              right: Math.round(rect.right),
              width: Math.round(rect.width),
            }
          })
          .filter((entry) => entry.right > viewportWidth + 1 || entry.left < -1)
          .sort((left, right) => right.right - left.right)
          .slice(0, 8)
        return {
          title: document.title,
          viewportWidth,
          viewportHeight,
          scrollWidth,
          scrollHeight,
          horizontalOverflowPx: Math.max(0, Math.round(scrollWidth - viewportWidth)),
          overflowingElements,
        }
      })()`,
      returnByValue: true,
      awaitPromise: true,
    }, sessionId)
    let screenshot = null
    if (screenshotsDir) {
      const capture = await client.send('Page.captureScreenshot', {
        format: 'png',
        captureBeyondViewport: false,
      }, sessionId)
      screenshot = path.join(
        screenshotsDir,
        `${path.basename(file, path.extname(file))}-${viewport.name}.png`,
      )
      writeFileSync(screenshot, Buffer.from(capture.data, 'base64'))
    }
    return {
      file,
      viewport: viewport.name,
      width: viewport.width,
      height: viewport.height,
      ...result.value,
      consoleErrors: [...new Set(consoleErrors)],
      screenshot,
    }
  } finally {
    client.listeners.delete(listener)
    await client.send('Target.closeTarget', { targetId })
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const executable = chromeExecutable()
  if (!executable) throw new Error('Chrome was not found. Set CHROME_PATH to a Chrome or Chromium executable.')
  if (typeof WebSocket === 'undefined') throw new Error('This verifier requires a Node runtime with WebSocket support.')

  const profile = mkdtempSync(path.join(tmpdir(), 'pathforge-artifact-measure-'))
  const child = spawn(executable, [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--allow-file-access-from-files',
    '--remote-debugging-port=0',
    `--user-data-dir=${profile}`,
    'about:blank',
  ], { stdio: ['ignore', 'ignore', 'pipe'] })

  let client
  try {
    client = new CdpClient(await waitForWebSocketUrl(child))
    await client.ready()
    const results = []
    for (const file of args.files) {
      for (const viewport of DEFAULT_VIEWPORTS) {
        results.push(await measure(client, file, viewport, args.screenshotsDir))
      }
    }
    if (args.json) console.log(JSON.stringify(results, null, 2))
    else {
      for (const result of results) {
        console.log(
          `${path.relative(process.cwd(), result.file)} ${result.viewport}: ` +
          `overflow=${result.horizontalOverflowPx}px consoleErrors=${result.consoleErrors.length}`,
        )
      }
    }
    if (results.some((result) => result.horizontalOverflowPx > 0 || result.consoleErrors.length > 0)) {
      process.exitCode = 1
    }
  } finally {
    client?.close()
    child.kill('SIGTERM')
    rmSync(profile, { recursive: true, force: true, maxRetries: 8, retryDelay: 125 })
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  })
}
