#!/usr/bin/env node

import { spawn } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import vm from 'node:vm'
import { fileURLToPath, pathToFileURL } from 'node:url'
import {
  CdpClient,
  chromeExecutable,
  waitForWebSocketUrl,
} from './measure-html-artifacts.mjs'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DEFAULT_ARTIFACT_DIR = path.join(REPO_ROOT, 'public', 'artifacts')
const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 1000, mobile: false },
  { name: 'mobile', width: 390, height: 844, mobile: true },
]

let lastDebugContext = ''
let currentVerifierPhase = 'startup'

function debug(...values) {
  lastDebugContext = values.map((value) => String(value)).join(' ')
  if (process.env.DEBUG_AIRLOCK_VERIFY === '1') console.error('[airlock-verify]', ...values)
}

function parseArgs(argv) {
  const files = []
  let json = false
  for (const arg of argv) {
    if (arg === '--json') json = true
    else if (arg.startsWith('--')) throw new Error(`Unknown option: ${arg}`)
    else files.push(path.resolve(arg))
  }

  const resolvedFiles = files.length > 0
    ? files
    : readdirSync(DEFAULT_ARTIFACT_DIR)
      .filter((name) => /^airlock-zero.*\.html$/i.test(name))
      .sort((left, right) => left.localeCompare(right))
      .map((name) => path.join(DEFAULT_ARTIFACT_DIR, name))

  if (resolvedFiles.length === 0) {
    throw new Error('No Airlock Zero artifacts were found. Pass one or more HTML files explicitly.')
  }
  for (const file of resolvedFiles) {
    if (!existsSync(file)) throw new Error(`Missing artifact: ${file}`)
  }
  return { files: resolvedFiles, json }
}

function unique(values) {
  return [...new Set(values.filter(Boolean))]
}

function compact(value, limit = 240) {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim()
  return text.length > limit ? `${text.slice(0, limit - 1)}…` : text
}

const STARTUP_TIMEOUT_TEXT = /Chrome DevTools startup timed out/
const BROWSER_TIMEOUT = /(?:\b(?:Chrome DevTools connection|(?:Runtime|Input|Page|Target|Log|Network|Fetch|Emulation)\.[A-Za-z]+) exceeded \d+ms\b|Chrome DevTools startup timed out|Timed out waiting for Page\.loadEventFired)/
const MAX_TRANSIENT_VIEWPORT_ATTEMPTS = 4
let encounteredBrowserTimeout = false

function isRetryableBrowserTimeout(error) {
  const message = error instanceof Error ? error.message : String(error)
  return (error?.verifierPhase === 'startup' && BROWSER_TIMEOUT.test(message)) || STARTUP_TIMEOUT_TEXT.test(message)
}

function assertRetryClassifierContract() {
  const startupError = new Error('Emulation.setDeviceMetricsOverride exceeded 5000ms; browser startup busy.')
  startupError.verifierPhase = 'startup'
  if (!isRetryableBrowserTimeout(startupError)) {
    throw new Error('Airlock verifier retry classifier no longer recognizes startup timeouts.')
  }
  const gameplayError = new Error('Runtime.evaluate exceeded 8000ms; gameplay renderer busy.')
  gameplayError.verifierPhase = 'gameplay'
  if (isRetryableBrowserTimeout(gameplayError)) {
    throw new Error('Airlock verifier retry classifier must not retry gameplay-phase timeouts.')
  }
}

function createCheckCollector() {
  const checks = []
  return {
    add(id, passed, detail) {
      checks.push({ id, passed: Boolean(passed), detail: compact(detail) })
    },
    checks,
  }
}

function regexEvidence(source, expressions) {
  return expressions.some((expression) => expression.test(source))
}

function extractInlineScripts(html) {
  const scripts = []
  const pattern = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi
  let match
  while ((match = pattern.exec(html))) {
    const attributes = match[1]
    const type = attributes.match(/\btype\s*=\s*(["'])(.*?)\1/i)?.[2]?.toLowerCase() ?? ''
    const src = attributes.match(/\bsrc\s*=\s*(["'])(.*?)\1/i)?.[2] ?? ''
    scripts.push({ attributes, type, src, code: match[2] })
  }
  return scripts
}

function externalDependencyEvidence(html) {
  const findings = []
  const tagPattern = /<(script|link|img|iframe|audio|video|source|object|embed)\b([^>]*)>/gi
  let tagMatch
  while ((tagMatch = tagPattern.exec(html))) {
    const [, tag, attributes] = tagMatch
    const relevantAttribute = tag.toLowerCase() === 'object' ? 'data' : tag.toLowerCase() === 'link' ? 'href' : 'src'
    const value = attributes.match(new RegExp(`\\b${relevantAttribute}\\s*=\\s*(["'])(.*?)\\1`, 'i'))?.[2]?.trim()
    if (!value || value.startsWith('data:') || value.startsWith('blob:') || value.startsWith('#')) continue
    findings.push(`<${tag.toLowerCase()}> ${relevantAttribute}=${value}`)
  }

  const cssUrlPattern = /\b(?:url|@import)\s*\(?(?:\s*)(["']?)([^\s"')]+)\1\)?/gi
  let cssMatch
  while ((cssMatch = cssUrlPattern.exec(html))) {
    const value = cssMatch[2]
    if (!value || value.startsWith('data:') || value.startsWith('blob:') || value.startsWith('#')) continue
    findings.push(`CSS URL ${value}`)
  }

  const networkApis = unique([
    /\bfetch\s*\(/.test(html) ? 'fetch()' : '',
    /\bXMLHttpRequest\b/.test(html) ? 'XMLHttpRequest' : '',
    /\bnew\s+WebSocket\s*\(/.test(html) ? 'WebSocket' : '',
    /\bnew\s+EventSource\s*\(/.test(html) ? 'EventSource' : '',
    /\bnavigator\.sendBeacon\s*\(/.test(html) ? 'sendBeacon()' : '',
    /\bimportScripts\s*\(/.test(html) ? 'importScripts()' : '',
  ])
  findings.push(...networkApis.map((name) => `network API ${name}`))
  if (/\bWH\.createApp\b/.test(html)) findings.push('Gemini-hosted WH.createApp runtime')
  if (/<link\b[^>]*\brel\s*=\s*(["'])[^"']*(?:stylesheet|preload|font)[^"']*\1/i.test(html)) {
    const links = [...html.matchAll(/<link\b[^>]*>/gi)].map((match) => compact(match[0], 120))
    findings.push(...links.map((link) => `external link element ${link}`))
  }
  return unique(findings)
}

function keyPattern(key) {
  const upper = key.toUpperCase()
  const lower = key.toLowerCase()
  const keyCodes = { W: 87, A: 65, S: 83, D: 68, Q: 81, E: 69 }
  return new RegExp(
    `(?:Key${upper}\\b|(?:keys?|pressed|input)\\s*(?:\\.has\\s*\\(\\s*|\\[\\s*)["'](?:Key${upper}|${lower})["']|(?:e|event)\\.key\\s*={2,3}\\s*["'](?:${lower}|${upper})["']|\\bkeyCode\\s*={2,3}\\s*${keyCodes[upper]})`,
    'i',
  )
}

function inspectNestedMapExitReachability(html) {
  const mapMatch = html.match(/\b(?:const|let|var)\s+(worldMap|map)\s*=\s*(\[[\s\S]*?\])\s*;/)
  if (!mapMatch || !/\[\s*\[/.test(mapMatch[2])) {
    return { applicable: false, passed: true, detail: 'No flat or nested numeric map was statically analyzable.' }
  }

  let rows
  try {
    const literal = mapMatch[2]
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '')
    rows = vm.runInNewContext(literal, Object.create(null), { timeout: 100 })
  } catch {
    return { applicable: false, passed: true, detail: 'Nested map literal could not be safely parsed.' }
  }
  if (!Array.isArray(rows) || rows.length === 0 || !rows.every((row) => Array.isArray(row) && row.every(Number.isFinite))) {
    return { applicable: false, passed: true, detail: 'Nested map was not a rectangular numeric tile matrix.' }
  }

  const mapName = mapMatch[1]
  const passableValues = [...new Set(
    [...html.matchAll(new RegExp(
      `if\\s*\\(\\s*${mapName}\\s*\\[[^\\]]+\\]\\s*\\[[^\\]]+\\]\\s*={2,3}\\s*(-?\\d+)\\s*\\)\\s*player\\.[xy]\\s*=`,
      'g',
    ))].map((match) => Number(match[1])),
  )]
  if (passableValues.length === 0) {
    return { applicable: false, passed: true, detail: 'Nested map had no analyzable exact player passability comparison.' }
  }

  const exitCoordinates = []
  for (const match of html.matchAll(/Math\.floor\(player\.y\)\s*={2,3}\s*(\d+)[\s\S]{0,180}?Math\.floor\(player\.x\)\s*={2,3}\s*(\d+)/g)) {
    exitCoordinates.push({ y: Number(match[1]), x: Number(match[2]) })
  }
  for (const match of html.matchAll(/Math\.floor\(player\.x\)\s*={2,3}\s*(\d+)[\s\S]{0,180}?Math\.floor\(player\.y\)\s*={2,3}\s*(\d+)/g)) {
    exitCoordinates.push({ x: Number(match[1]), y: Number(match[2]) })
  }
  const uniqueExits = [...new Map(exitCoordinates.map((exit) => [`${exit.x}/${exit.y}`, exit])).values()]
  if (uniqueExits.length === 0) {
    return { applicable: false, passed: true, detail: 'Nested map had no literal player exit-coordinate condition.' }
  }

  const exits = uniqueExits.map((exit) => {
    const initialValue = rows[exit.y]?.[exit.x]
    const assignmentPattern = new RegExp(
      `${mapName}\\s*\\[\\s*${exit.y}\\s*\\]\\s*\\[\\s*${exit.x}\\s*\\]\\s*=\\s*(-?\\d+)`,
      'g',
    )
    const assignedValues = [...html.matchAll(assignmentPattern)].map((match) => Number(match[1]))
    const possibleValues = [...new Set([initialValue, ...assignedValues].filter(Number.isFinite))]
    return {
      ...exit,
      initialValue,
      assignedValues,
      possibleValues,
      reachable: possibleValues.some((value) => passableValues.includes(value)),
    }
  })
  const blocked = exits.filter((exit) => !exit.reachable)
  return {
    applicable: true,
    passed: blocked.length === 0,
    detail: blocked.length === 0
      ? `${mapName} exit ${exits.map((exit) => `${exit.x},${exit.y} values=${exit.possibleValues.join('/')}`).join('; ')}; movement accepts=${passableValues.join('/')}.`
      : `${mapName} blocked exit ${blocked.map((exit) => `${exit.x},${exit.y} starts=${exit.initialValue}, assigned=${exit.assignedValues.join('/') || 'none'}`).join('; ')}; movement accepts only ${passableValues.join('/')}.`,
  }
}

function inspectNumericExitReachability(html) {
  const widthMatch = html.match(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*(?:WIDTH|Width|width|SIZE|Size|size)[A-Za-z0-9_$]*)\s*=\s*(\d+)\s*;/)
  const mapMatch = html.match(/\b(?:const|let|var)\s+(map|worldMap)\s*=\s*\[([\s\S]*?)\]\s*;/)
  if (!widthMatch || !mapMatch) return inspectNestedMapExitReachability(html)

  const widthName = widthMatch[1]
  const width = Number(widthMatch[2])
  const mapName = mapMatch[1]
  const mapSource = mapMatch[2]
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '')
  const tiles = [...mapSource.matchAll(/-?\d+(?:\.\d+)?/g)].map((match) => Number(match[0]))
  if (!Number.isInteger(width) || width <= 0 || tiles.length < width) {
    return { applicable: false, passed: true, detail: 'Numeric map was present but could not be safely indexed.' }
  }

  let passableValues = [...new Set(
    [...html.matchAll(new RegExp(
      `if\\s*\\(\\s*${mapName}\\s*\\[[\\s\\S]{0,320}?\\]\\s*={2,3}\\s*(-?\\d+)\\s*\\)\\s*(?:player\\.[xy]|player[XY])\\s*=`,
      'g',
    ))]
      .map((match) => Number(match[1])),
  )]
  if (passableValues.length === 0) {
    for (const match of html.matchAll(/\bfunction\s+([A-Za-z_$][\w$]*(?:walk|pass|travers)[A-Za-z0-9_$]*)\s*\([^)]*\)\s*\{([\s\S]{0,800}?)\n\}/gi)) {
      const name = match[1]
      if (!new RegExp(`if\\s*\\(\\s*${name}\\s*\\([^)]*\\)\\s*\\)\\s*player\\.[xy]\\s*=`).test(html)) continue
      const values = [...match[2].matchAll(/={2,3}\s*(-?\d+)/g)].map((value) => Number(value[1]))
      passableValues = [...new Set([...passableValues, ...values])]
    }
  }
  const conditionalPassable = []
  if (passableValues.length === 0) {
    const collisionHelper = html.match(/\bfunction\s+([A-Za-z_$][\w$]*(?:collision|blocked|wall)[A-Za-z0-9_$]*)\s*\(/i)?.[1]
    const helperUsedForPlayerMovement = collisionHelper && new RegExp(`if\\s*\\(\\s*!${collisionHelper}\\s*\\(`).test(html)
    if (helperUsedForPlayerMovement) {
      if (new RegExp(`return\\s+${mapName}\\s*\\[[^;]+\\]\\s*>\\s*0\\s*;`).test(html)) {
        passableValues = [0]
      } else {
        const tileVariable = html.match(new RegExp(`\\b(?:const|let|var)\\s+([A-Za-z_$][\\w$]*)\\s*=\\s*${mapName}\\s*\\[`))?.[1]
        if (tileVariable && new RegExp(`return\\s+${tileVariable}\\s*>\\s*0\\s*;`).test(html)) {
          passableValues = [0]
          const conditional = html.match(new RegExp(
            `if\\s*\\(\\s*${tileVariable}\\s*={2,3}\\s*(-?\\d+)\\s*\\)\\s*\\{?[\\s\\S]{0,180}?return\\s+([A-Za-z_$][\\w$]*)\\s*<\\s*(\\d+)\\s*;`,
          ))
          if (conditional) {
            conditionalPassable.push({
              tile: Number(conditional[1]),
              counter: conditional[2],
              threshold: Number(conditional[3]),
            })
          }
        }
      }
    }
  }
  if (passableValues.length === 0) {
    return { applicable: false, passed: true, detail: 'No exact numeric player-tile passability comparison was statically analyzable.' }
  }

  const exits = []
  for (const match of html.matchAll(/\b(?:const|let|var)\s+([A-Z][A-Z0-9_]*)_X\s*=\s*(\d+)\s*;/g)) {
    const base = match[1]
    if (!/(?:EXIT|AIRLOCK)/.test(base)) continue
    const x = Number(match[2])
    const yMatch = html.match(new RegExp(`\\b(?:const|let|var)\\s+${base}_Y\\s*=\\s*(\\d+)\\s*;`))
    if (!yMatch) continue
    const y = Number(yMatch[1])
    const initialValue = tiles[y * width + x]
    const assignmentPattern = new RegExp(
      `${mapName}\\s*\\[[^\\]]*${base}_Y[^\\]]*${widthName}[^\\]]*${base}_X[^\\]]*\\]\\s*=\\s*(-?\\d+)`,
      'g',
    )
    const assignedValues = [...html.matchAll(assignmentPattern)].map((assignment) => Number(assignment[1]))
    const possibleValues = [...new Set([initialValue, ...assignedValues].filter(Number.isFinite))]
    const conditionalUnlock = conditionalPassable.find((entry) => possibleValues.includes(entry.tile)) ?? null
    const reachable = possibleValues.some((value) => passableValues.includes(value)) || Boolean(conditionalUnlock)
    exits.push({ base, x, y, initialValue, assignedValues, possibleValues, conditionalUnlock, reachable })
  }

  const collisionBuffer = Number(html.match(/\b(?:const|let|var)\s+(?:buffer|PLAYER_RADIUS|playerRadius)\s*=\s*(\d+(?:\.\d+)?)\s*;/i)?.[1])
  for (const match of html.matchAll(/Math\.hypot\(\s*(?:player\.x|playerX)\s*-\s*(-?\d+(?:\.\d+)?)\s*,\s*(?:player\.y|playerY)\s*-\s*(-?\d+(?:\.\d+)?)\s*\)/g)) {
    const exactX = Number(match[1])
    const exactY = Number(match[2])
    const x = Math.floor(exactX)
    const y = Math.floor(exactY)
    const base = 'DISTANCE_EXIT'
    if (exits.some((exit) => exit.x === x && exit.y === y)) continue
    const initialValue = tiles[y * width + x]
    const assignmentPattern = new RegExp(
      `${mapName}\\s*\\[\\s*${y}\\s*\\*\\s*${widthName}\\s*\\+\\s*${x}\\s*\\]\\s*=\\s*(-?\\d+)`,
      'g',
    )
    const assignedValues = [...html.matchAll(assignmentPattern)].map((assignment) => Number(assignment[1]))
    const possibleValues = [...new Set([initialValue, ...assignedValues].filter(Number.isFinite))]
    const nearbySource = html.slice(Math.max(0, (match.index ?? 0) - 80), (match.index ?? 0) + match[0].length + 320)
    const distanceVariable = nearbySource.match(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*Math\.hypot\s*\(/)?.[1]
    const distanceThreshold = Number(
      distanceVariable
        ? nearbySource.match(new RegExp(`\\b${distanceVariable}\\s*<\\s*(\\d+(?:\\.\\d+)?)`))?.[1]
        : nearbySource.match(/Math\.hypot[\s\S]{0,220}?<\s*(\d+(?:\.\d+)?)/)?.[1],
    )
    const adjacentTiles = [
      tiles[y * width + (x - 1)],
      tiles[y * width + (x + 1)],
      tiles[(y - 1) * width + x],
      tiles[(y + 1) * width + x],
    ].filter(Number.isFinite)
    const proximityReachable = (
      Number.isFinite(collisionBuffer) &&
      Number.isFinite(distanceThreshold) &&
      distanceThreshold > 0.5 + collisionBuffer &&
      adjacentTiles.some((value) => passableValues.includes(value))
    )
    const conditionalUnlock = conditionalPassable.find((entry) => possibleValues.includes(entry.tile)) ?? null
    exits.push({
      base,
      x,
      y,
      exactX,
      exactY,
      initialValue,
      assignedValues,
      possibleValues,
      collisionBuffer: Number.isFinite(collisionBuffer) ? collisionBuffer : null,
      distanceThreshold: Number.isFinite(distanceThreshold) ? distanceThreshold : null,
      proximityReachable,
      conditionalUnlock,
      reachable: possibleValues.some((value) => passableValues.includes(value)) || proximityReachable || Boolean(conditionalUnlock),
    })
  }

  if (exits.length === 0) return inspectNestedMapExitReachability(html)
  const blocked = exits.filter((exit) => !exit.reachable)
  return {
    applicable: true,
    passed: blocked.length === 0,
    detail: blocked.length === 0
      ? `${exits.map((exit) => (
        `${exit.base}@${exit.x},${exit.y} values=${exit.possibleValues.join('/')}` +
        (exit.proximityReachable ? `, proximity threshold=${exit.distanceThreshold}, collision buffer=${exit.collisionBuffer}` : '') +
        (exit.conditionalUnlock ? `, tile ${exit.conditionalUnlock.tile} unlocks when ${exit.conditionalUnlock.counter}>=${exit.conditionalUnlock.threshold}` : '')
      )).join('; ')}; movement accepts=${passableValues.join('/')}.`
      : `${blocked.map((exit) => `${exit.base}@${exit.x},${exit.y} starts=${exit.initialValue}, assigned=${exit.assignedValues.join('/') || 'none'}`).join('; ')}; player movement accepts only ${passableValues.join('/')}. The win tile cannot be entered.`,
  }
}

function staticInspection(file, html) {
  const collector = createCheckCollector()
  const scripts = extractInlineScripts(html)
  const dependencyFindings = externalDependencyEvidence(html)
  const syntaxErrors = []
  scripts.forEach((script, index) => {
    if (script.src || /^(?:application\/(?:ld\+)?json|importmap)$/i.test(script.type)) return
    if (script.type === 'module') return // Browser parsing is the authoritative module check below.
    try {
      new vm.Script(script.code, { filename: `${file}:inline-script-${index + 1}` })
    } catch (error) {
      syntaxErrors.push(error instanceof Error ? error.message : String(error))
    }
  })

  const keyboardListener = /(?:addEventListener\s*\(\s*["']keydown["']|\.onkeydown\s*=)/i.test(html)
  const movementKeys = ['W', 'A', 'S', 'D'].every((key) => keyPattern(key).test(html))
  const qeTurning = keyPattern('Q').test(html) && keyPattern('E').test(html)
  const arrowTurning = /\bArrowLeft\b/.test(html) && /\bArrowRight\b/.test(html)
  const fireKey = /\b(?:Space|Spacebar)\b/.test(html) || /\bkeyCode\s*={2,3}\s*32\b/.test(html)
  const touchEvents = /(?:addEventListener\s*\(\s*["']touch(?:start|move|end)["']|\bonpointer(?:down|move|up)\s*=|addEventListener\s*\(\s*["']pointer(?:down|move|up)["'])/i.test(html)
  const mouseAimEvents = /(?:addEventListener\s*\(\s*["'](?:pointermove|mousemove)["']|\bonpointermove\s*=|\bonmousemove\s*=|\bmovementX\b)/i.test(html)
  const mouseAimRotation = /(?:\b(?:angle|yaw)\s*(?:\+=|-=|=)[^;\n]*(?:movementX|clientX|drag|delta)|\b(?:dirX|dirY|planeX|planeY)\s*(?:\+=|-=|=)[^;\n]*(?:mouse|pointer|drag|delta|angle))/i.test(html)
  const mouseAimFunctionNames = unique(
    [...html.matchAll(/\bfunction\s+([A-Za-z_$][\w$]*)\s*\(/g)]
      .map((match) => match[1])
      .filter((name) => /(?:rotate|turn|look|aim)/i.test(name)),
  )

  const pauseEvidence = regexEvidence(html, [/\bpause(?:d|Overlay|Button|Game)?\b/i, /\bresume(?:d|Button|Game)?\b/i])
  const pauseKey = /\bKeyP\b/.test(html) ? 'KeyP' : /\bEscape\b/.test(html) ? 'Escape' : 'KeyP'
  const muteEvidence = /\b(?:mute|unmute|soundButton|audioMuted|isMuted)\b/i.test(html)
  const restartEvidence = /\b(?:restart|replay|run again|re-initialize|reinitialize)\b/i.test(html)
  const healthEvidence = /\b(?:health|integrity|vitality|suit vitals)\b/i.test(html)
  const oxygenEvidence = /\b(?:oxygen|O2|life support)\b/i.test(html)
  const objectiveEvidence = /\b(?:reactor (?:cell|core)|cells? (?:found|collected|recovered|secured)|cores? recovered|airlock)\b/i.test(html)
  const winEvidence = regexEvidence(html, [
    /\b(?:victory|mission accomplished|extraction successful|reactor run complete|airlock sealed|launch successful|containment stabilized)\b/i,
    /\b(?:triggerWin|winGame)\s*\(/i,
    /\b(?:finishRun|triggerEndgame|endGame)\s*\(\s*true\b/i,
  ])
  const lossEvidence = regexEvidence(html, [
    /\b(?:game over|station lost|mission failed|system core failure|oxygen reserves fully expired)\b/i,
    /\b(?:finishRun|triggerEndgame|endGame)\s*\(\s*false\b/i,
  ])
  const allAttributeNames = unique(
    [...html.matchAll(/\b(?:id|class)\s*=\s*(["'])(.*?)\1/gi)]
      .flatMap((match) => match[2].split(/\s+/)),
  )
  const namedScoreContainer = /\b(?:score-table|result-grid|mission evaluation|scorecard)\b/i.test(html)
  const terminalWinContainer = /\bid\s*=\s*(["'])(?:screenWin|winScreen|screenResult|resultScreen|endScreen)\1/i.test(html)
  const scoreContainer = namedScoreContainer || terminalWinContainer
  const scoreMetricNames = allAttributeNames.filter((name) => (
    /(?:score|result|final)/i.test(name) ||
    (terminalWinContainer && /(?:time|elapsed|duration|health|integrity|vitality|oxygen|o2|cell|core|objective|drone|enemy|kill|disabled)/i.test(name))
  ))
  const scoreMetricCategories = [
    /(?:time|elapsed|duration)/i,
    /(?:health|integrity|vitality|oxygen|o2)/i,
    /(?:cell|core|objective)/i,
    /(?:drone|enemy|kill|disabled)/i,
  ].filter((pattern) => scoreMetricNames.some((name) => pattern.test(name))).length
  const scoreLabelCategories = [
    /\b(?:elapsed|run|mission|completion)\s*time\b/i,
    /\b(?:remaining\s+)?(?:health|integrity|vitality|oxygen|O2)\b/i,
    /\b(?:cells?|cores?|objectives?)\s*(?:found|collected|recovered|secured|complete)?\b/i,
    /\b(?:drones?|enemies?)\s*(?:disabled|destroyed|terminated|pulsed|defeated)?\b/i,
  ].filter((pattern) => pattern.test(html)).length
  const scoreCategories = Math.max(
    scoreMetricCategories,
    scoreContainer ? scoreLabelCategories : 0,
  )
  const raycastEvidence = regexEvidence(html, [
    /\bray(?:cast|Dir|Angle|Distance)\b/i,
    /\b(?:zBuffer|perpWallDist|deltaDistX|sideDistX|DDA)\b/,
  ])
  const collisionEvidence = regexEvidence(html, [
    /\b(?:collision|wallAt|moveEntity|canMove|isWall|solid)\b/i,
    /map\s*\[[^\]]*(?:Math\.floor|floor)/,
  ])
  const movementEvidence = regexEvidence(html, [
    /\b(?:moveSpeed|forward|strafe|player\.x|player\.y)\b/i,
    /\b(?:Math\.cos|Math\.sin)\s*\([^)]*(?:angle|dir)/i,
  ])
  const combatEvidence = regexEvidence(html, [
    /\b(?:firePulse|triggerWeaponPulse|shoot|fire|pulse)\b/i,
  ]) && regexEvidence(html, [
    /\b(?:damage|hitTarget|health\s*[-+]=|integrity\s*[-+]=|projectile)\b/i,
  ])
  const spriteLoopRanges = []
  for (const match of html.matchAll(/for\s*\([^;]*=\s*(drawStartX|startX)\s*;[^;]*(?:<|<=)\s*(drawEndX|endX)\s*;/g)) {
    const startName = match[1]
    const endName = match[2]
    const startClamped = new RegExp(`${startName}\\s*=\\s*Math\\.max\\s*\\(\\s*0\\b`).test(html)
    const endClamped = new RegExp(`${endName}\\s*=\\s*Math\\.min\\s*\\(`).test(html)
    spriteLoopRanges.push({ startName, endName, bounded: startClamped && endClamped })
  }
  const unboundedSpriteLoops = spriteLoopRanges.filter((range) => !range.bounded)
  const objectiveIncrementCounts = new Map()
  for (const match of html.matchAll(/\b([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\s*(?:\+\+|\+=\s*1)\s*;?/g)) {
    const name = match[1]
    if (!/(?:cell|core|objective)/i.test(name)) continue
    objectiveIncrementCounts.set(name, (objectiveIncrementCounts.get(name) ?? 0) + 1)
  }
  const duplicateObjectiveIncrements = [...objectiveIncrementCounts.entries()].filter(([, count]) => count > 1)
  const exitReachability = inspectNumericExitReachability(html)

  collector.add('complete-html-document', /<!doctype\s+html/i.test(html) && /<html\b/i.test(html) && /<\/html\s*>/i.test(html), 'Complete doctype, html root, and closing document are required.')
  collector.add('single-file-offline', dependencyFindings.length === 0, dependencyFindings.length ? dependencyFindings.join('; ') : 'No external asset references, hosted runtime, or network APIs found.')
  collector.add('inline-script-syntax', syntaxErrors.length === 0, syntaxErrors.length ? syntaxErrors.join(' | ') : `${scripts.length} inline script block(s) parsed or deferred to browser module parsing.`)
  collector.add('keyboard-movement-fallback', keyboardListener && movementKeys, `keydown=${keyboardListener}; W/A/S/D=${movementKeys}`)
  collector.add('keyboard-turn-fallback', qeTurning || arrowTurning, `Q/E=${qeTurning}; ArrowLeft/ArrowRight=${arrowTurning}; pointer lock may be optional but cannot be the only turn path.`)
  collector.add('keyboard-fire-fallback', fireKey, `Space fire mapping=${fireKey}`)
  collector.add('touch-input-implementation', touchEvents, `Touch or pointer handlers=${touchEvents}`)
  collector.add('mouse-aim-implementation', mouseAimEvents && mouseAimRotation, `mouse/pointer move handler=${mouseAimEvents}; rotation update=${mouseAimRotation}`)
  collector.add('pause-mute-restart-implementation', pauseEvidence && muteEvidence && restartEvidence, `pause=${pauseEvidence}; mute=${muteEvidence}; restart=${restartEvidence}`)
  collector.add('mission-state-signals', healthEvidence && oxygenEvidence && objectiveEvidence && winEvidence && lossEvidence, `health=${healthEvidence}; oxygen=${oxygenEvidence}; objective=${objectiveEvidence}; win=${winEvidence}; loss=${lossEvidence}`)
  collector.add('end-score-signals', scoreCategories >= 3, `${scoreCategories}/4 dedicated end-score metric categories found; score container=${scoreContainer}.`)
  collector.add('playable-fps-engine-signals', raycastEvidence && collisionEvidence && movementEvidence && combatEvidence, `raycast=${raycastEvidence}; collision=${collisionEvidence}; movement=${movementEvidence}; combat/damage=${combatEvidence}`)
  collector.add('bounded-sprite-render-work', unboundedSpriteLoops.length === 0, unboundedSpriteLoops.length === 0
    ? `${spriteLoopRanges.length} sprite stripe loop(s) found; all detected screen ranges are viewport-clamped.`
    : `Unbounded sprite stripe range(s): ${unboundedSpriteLoops.map((range) => `${range.startName}→${range.endName}`).join(', ')}. Clamp start to 0 and end to the render width before iterating.`)
  collector.add('single-objective-increment-path', duplicateObjectiveIncrements.length === 0, duplicateObjectiveIncrements.length === 0
    ? `Objective counters: ${[...objectiveIncrementCounts.entries()].map(([name, count]) => `${name}×${count}`).join(', ') || 'none found'}.`
    : `Duplicate increment paths: ${duplicateObjectiveIncrements.map(([name, count]) => `${name}×${count}`).join(', ')}.`)
  collector.add('reachable-exit-tile', exitReachability.passed, exitReachability.detail)

  const declaredNames = unique(
    [...html.matchAll(/\b(?:let|const|var)\s+([A-Za-z_$][\w$]*)/g)].map((match) => match[1]),
  ).filter((name) => /(?:player|game|state|oxygen|o2|health|integrity|cell|core|drone|enemy|score|elapsed|time|fire|shot|angle|yaw|dirX|dirY|planeX|planeY|rotation)/i.test(name)).slice(0, 64)

  const terminalFunctions = []
  for (const match of html.matchAll(/\bfunction\s+([A-Za-z_$][\w$]*)\s*\(([^)]*)\)/g)) {
    const name = match[1]
    const params = match[2].split(',').map((param) => param.trim()).filter(Boolean)
    if (!/(?:end|finish|complete|victor|win|lose|gameOver|mission)/i.test(name)) continue
    if (!params[0] || !/(?:win|victor|success|complete|passed|result)/i.test(params[0])) continue
    terminalFunctions.push({ name, params })
  }

  return {
    checks: collector.checks,
    dependencyFindings,
    syntaxErrors,
    declaredNames,
    terminalFunctions,
    pauseKey,
    staticPassed: collector.checks.every((check) => check.passed),
    evidence: {
      raycastEvidence,
      collisionEvidence,
      movementEvidence,
      combatEvidence,
      pointerLockRequested: /\brequestPointerLock\s*\(/.test(html),
      mouseAimImplementation: mouseAimEvents && mouseAimRotation,
      mouseAimFunctionNames,
      scoreCategories,
    },
  }
}

async function withDeadline(promise, timeoutMs, label) {
  let timeout
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timeout = setTimeout(
          () => reject(new Error(
            `${label} exceeded ${timeoutMs}ms; the verifier could not confirm browser responsiveness within the release limit.`,
          )),
          timeoutMs,
        )
      }),
    ])
  } catch (error) {
    const phase = lastDebugContext
    const message = error instanceof Error ? error.message : String(error)
    const wrapped = new Error(phase ? `${message} Failing verifier phase: ${phase}.` : message)
    wrapped.verifierPhase = currentVerifierPhase
    throw wrapped
  } finally {
    clearTimeout(timeout)
  }
}

async function sendBounded(client, method, params, sessionId, timeoutMs = 5_000) {
  return withDeadline(client.send(method, params, sessionId), timeoutMs, method)
}

async function evaluate(client, sessionId, expression) {
  const response = await withDeadline(client.send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
  }, sessionId), 8_000, 'Runtime.evaluate')
  if (response.exceptionDetails) {
    const message = response.exceptionDetails.exception?.description ?? response.exceptionDetails.text ?? 'Runtime evaluation failed.'
    throw new Error(message)
  }
  return response.result.value
}

const pageSnapshotExpression = (semanticNames) => `(() => {
  const visible=(element)=>{
    if (!(element instanceof Element)) return false;
    const style=getComputedStyle(element);
    const rect=element.getBoundingClientRect();
    return !element.hidden && style.display!=='none' && style.visibility!=='hidden' && Number(style.opacity || 1)>0.01 && rect.width>1 && rect.height>1;
  };
  const label=(element)=>(element.getAttribute('aria-label') || element.getAttribute('title') || element.value || element.textContent || element.id || '').replace(/\\s+/g,' ').trim();
  const controls=[...document.querySelectorAll('button,input[type="button"],input[type="submit"],[role="button"]')];
  const controlRows=controls.map((element,controlIndex)=>{
    const rect=element.getBoundingClientRect();
    return { label:label(element), id:element.id || '', controlIndex, visible:visible(element), x:rect.left+rect.width/2, y:rect.top+rect.height/2 };
  });
  const startRows=controlRows
    .filter((row)=>row.visible && /(?:start|begin|launch|play|enter|mission|reactor run)/i.test(row.label+' '+row.id) && !/(?:restart|replay|resume|again|pause)/i.test(row.label+' '+row.id))
    .map((row)=>({
      ...row,
      score:/(?:start mission|begin reactor run|begin mission|launch mission)/i.test(row.label) ? 100 : /(?:start|begin)/i.test(row.label) ? 80 : 50,
    }))
    .sort((left,right)=>right.score-left.score);
  const semantic={};
  for (const name of ${JSON.stringify(semanticNames)}) {
    try {
      const value=eval(name);
      if (['string','number','boolean'].includes(typeof value)) semantic[name]=value;
      else if (value && typeof value==='object') {
        const row={};
        for (const [key,item] of Object.entries(value)) {
          if (!/(?:x|y|angle|dir|health|integrity|cell|core|drone|enemy|score|fire|shot|state|time|oxygen)/i.test(key)) continue;
          if (['string','number','boolean'].includes(typeof item)) row[key]=item;
        }
        if (Object.keys(row).length) semantic[name]=row;
      }
    } catch {}
  }
  const canvasRows=[...document.querySelectorAll('canvas')].map((canvas)=>{
    const rect=canvas.getBoundingClientRect();
    let hash=2166136261;
    let nonTransparent=0;
    let colorBuckets=0;
    try {
      const sample=document.createElement('canvas');
      sample.width=64; sample.height=64;
      const context=sample.getContext('2d',{willReadFrequently:true});
      context.drawImage(canvas,0,0,64,64);
      const data=context.getImageData(0,0,64,64).data;
      const buckets=new Set();
      for (let index=0; index<data.length; index+=16) {
        const red=data[index], green=data[index+1], blue=data[index+2], alpha=data[index+3];
        if (alpha>0) nonTransparent++;
        // Preserve low-light contrast. Four-bit RGB buckets collapse an
        // intentionally dark corridor renderer into one color even while its
        // pixel hash and visible geometry are changing. Six-bit RGB buckets
        // still reject a truly blank canvas but can distinguish subtle wall,
        // floor, and flashlight shading below channel value 16.
        buckets.add((red>>2)+'/'+(green>>2)+'/'+(blue>>2)+'/'+(alpha>>4));
        hash^=red; hash=Math.imul(hash,16777619);
        hash^=green; hash=Math.imul(hash,16777619);
        hash^=blue; hash=Math.imul(hash,16777619);
        hash^=alpha; hash=Math.imul(hash,16777619);
      }
      colorBuckets=buckets.size;
    } catch {}
    return { id:canvas.id || '', visible:visible(canvas), x:rect.left+rect.width/2, y:rect.top+rect.height/2, width:Math.round(rect.width), height:Math.round(rect.height), area:Math.round(rect.width*rect.height), hash:hash>>>0, nonTransparent, colorBuckets };
  }).sort((left,right)=>right.area-left.area);
  const visibleText=(document.body.innerText || '').replace(/\\s+/g,' ').trim().slice(0,12000);
  const root=document.documentElement;
  const body=document.body;
  return {
    title:document.title,
    visibleText,
    controls:controlRows,
    start:startRows[0] || null,
    semantic,
    canvases:canvasRows,
    overflow:Math.max(0,Math.round(Math.max(root.scrollWidth,body?.scrollWidth || 0)-root.clientWidth)),
    viewport:{ width:root.clientWidth, height:root.clientHeight },
  };
})()`

const controlSnapshotExpression = `(() => {
  const visible=(element)=>{
    if (!(element instanceof Element)) return false;
    const style=getComputedStyle(element);
    const rect=element.getBoundingClientRect();
    return !element.hidden && style.display!=='none' && style.visibility!=='hidden' && Number(style.opacity || 1)>0.01 && rect.width>1 && rect.height>1;
  };
  const label=(element)=>(element.getAttribute('aria-label') || element.getAttribute('title') || element.value || element.textContent || element.id || '').replace(/\\s+/g,' ').trim();
  return {
    pointerLocked:Boolean(document.pointerLockElement),
    controls:[...document.querySelectorAll('button,input[type="button"],input[type="submit"],[role="button"]')].map((element,controlIndex)=>{
      const rect=element.getBoundingClientRect();
      return {
        label:label(element), text:(element.textContent || '').replace(/\\s+/g,' ').trim(), id:element.id || '', controlIndex, visible:visible(element),
        state:element.getAttribute('aria-pressed') || element.getAttribute('data-state') || (typeof element.className==='string' ? element.className : ''),
        ariaPressed:element.getAttribute('aria-pressed') || '', dataState:element.getAttribute('data-state') || '',
        x:rect.left+rect.width/2, y:rect.top+rect.height/2,
      };
    }),
  };
})()`

const interactionSnapshotExpression = (semanticNames) => `(() => {
  const visible=(element)=>{
    if (!(element instanceof Element)) return false;
    const style=getComputedStyle(element);
    const rect=element.getBoundingClientRect();
    return !element.hidden && style.display!=='none' && style.visibility!=='hidden' && Number(style.opacity || 1)>0.01 && rect.width>1 && rect.height>1;
  };
  const semantic={};
  for (const name of ${JSON.stringify(semanticNames)}) {
    try {
      const value=eval(name);
      if (['string','number','boolean'].includes(typeof value)) semantic[name]=value;
      else if (value && typeof value==='object') {
        const row={};
        for (const [key,item] of Object.entries(value)) {
          if (!/(?:x|y|angle|dir|health|integrity|cell|core|drone|enemy|score|fire|shot|state|time|oxygen)/i.test(key)) continue;
          if (['string','number','boolean'].includes(typeof item)) row[key]=item;
        }
        if (Object.keys(row).length) semantic[name]=row;
      }
    } catch {}
  }
  const canvas=[...document.querySelectorAll('canvas')]
    .map((element)=>{const rect=element.getBoundingClientRect(); return {element,rect,area:rect.width*rect.height};})
    .filter((row)=>visible(row.element) && row.area>1000)
    .sort((left,right)=>right.area-left.area)[0];
  const canvases=[];
  if (canvas) {
    let hash=2166136261;
    let nonTransparent=0;
    let colorBuckets=0;
    try {
      const sample=document.createElement('canvas');
      sample.width=32; sample.height=32;
      const context=sample.getContext('2d',{willReadFrequently:true});
      context.drawImage(canvas.element,0,0,32,32);
      const data=context.getImageData(0,0,32,32).data;
      const buckets=new Set();
      for (let index=0; index<data.length; index+=16) {
        const red=data[index], green=data[index+1], blue=data[index+2], alpha=data[index+3];
        if (alpha>0) nonTransparent++;
        buckets.add((red>>2)+'/'+(green>>2)+'/'+(blue>>2)+'/'+(alpha>>4));
        hash^=red; hash=Math.imul(hash,16777619);
        hash^=green; hash=Math.imul(hash,16777619);
        hash^=blue; hash=Math.imul(hash,16777619);
        hash^=alpha; hash=Math.imul(hash,16777619);
      }
      colorBuckets=buckets.size;
    } catch {}
    canvases.push({
      id:canvas.element.id || '', visible:true,
      x:canvas.rect.left+canvas.rect.width/2, y:canvas.rect.top+canvas.rect.height/2,
      width:Math.round(canvas.rect.width), height:Math.round(canvas.rect.height),
      area:Math.round(canvas.area), hash:hash>>>0, nonTransparent, colorBuckets,
    });
  }
  return {
    visibleText:(document.body.innerText || '').replace(/\\s+/g,' ').trim().slice(0,12000),
    semantic,
    canvases,
  };
})()`

function snapshotChanged(before, after) {
  if (!before || !after) return false
  if (before.visibleText !== after.visibleText) return true
  if (JSON.stringify(before.semantic) !== JSON.stringify(after.semantic)) return true
  return before.canvases.some((canvas, index) => canvas.hash !== after.canvases[index]?.hash)
}

function gameplayProgressSignature(snapshot) {
  const isFrameBookkeeping = (name) => /(?:timestamp|frame(?:time)?|renderTime|animationTime|lastTime|deltaTime|^dt$)/i.test(name)
  const semantic = {}
  for (const [name, value] of Object.entries(snapshot?.semantic || {})) {
    if (isFrameBookkeeping(name)) continue
    if (value && typeof value === 'object') {
      semantic[name] = Object.fromEntries(
        Object.entries(value).filter(([key]) => !isFrameBookkeeping(key)),
      )
    } else {
      semantic[name] = value
    }
  }
  return JSON.stringify({
    visibleText: snapshot?.visibleText || '',
    semantic,
  })
}

function orientationState(snapshot) {
  const orientation = {}
  for (const [name, value] of Object.entries(snapshot?.semantic ?? {})) {
    if (typeof value === 'number' && /(?:angle|yaw|dirX|dirY|planeX|planeY|rotation)/i.test(name)) {
      orientation[name] = value
      continue
    }
    if (!value || typeof value !== 'object') continue
    const fields = Object.fromEntries(
      Object.entries(value).filter(([key, entry]) => (
        /(?:angle|yaw|dirX|dirY|planeX|planeY|rotation)/i.test(key) &&
        typeof entry === 'number'
      )),
    )
    if (Object.keys(fields).length > 0) orientation[name] = fields
  }
  return orientation
}

function visibleControl(snapshot, pattern) {
  return snapshot.controls.find((control) => control.visible && pattern.test(`${control.label} ${control.text || ''} ${control.id}`)) ?? null
}

function anyControl(snapshot, pattern) {
  return snapshot.controls.find((control) => pattern.test(`${control.label} ${control.text || ''} ${control.id}`)) ?? null
}

function muteControlState(control) {
  if (!control) return { polarity: '', ariaPressed: '', dataState: '' }
  const text = `${control.label || ''} ${control.text || ''} ${control.id || ''}`
  const polarity = /(?:\bunmute\b|\bmuted\b|\benable sound\b|\bturn sound on\b|\bsound off\b|\baudio off\b|🔇|(?:^|\s)×(?:\s|$))/i.test(text)
    ? 'muted'
    : /(?:\bmute\b|\bdisable sound\b|\bturn sound off\b|\bsound on\b|\baudio on\b|🔊|◖\)\))/i.test(text)
      ? 'unmuted'
      : ''
  return {
    polarity,
    ariaPressed: control.ariaPressed || '',
    dataState: control.dataState || '',
  }
}

function muteControlChanged(before, after) {
  const left = muteControlState(before)
  const right = muteControlState(after)
  return Boolean(
    (left.polarity && right.polarity && left.polarity !== right.polarity) ||
    (left.ariaPressed && right.ariaPressed && left.ariaPressed !== right.ariaPressed) ||
    (left.dataState && right.dataState && left.dataState !== right.dataState)
  )
}

async function clickPoint(client, sessionId, point, { nonBlockingRelease = false } = {}) {
  if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return false
  await sendBounded(client, 'Input.dispatchMouseEvent', { type: 'mouseMoved', x: point.x, y: point.y }, sessionId)
  await sendBounded(client, 'Input.dispatchMouseEvent', { type: 'mousePressed', x: point.x, y: point.y, button: 'left', clickCount: 1 }, sessionId)
  const released = sendBounded(client, 'Input.dispatchMouseEvent', { type: 'mouseReleased', x: point.x, y: point.y, button: 'left', clickCount: 1 }, sessionId)
  if (nonBlockingRelease) void released.catch(() => {})
  else await released
  return true
}

async function hitTestVisibleControl(client, sessionId, control) {
  if (!control || (!control.id && !Number.isInteger(control.controlIndex))) return null
  return evaluate(client, sessionId, `(() => {
    const controls=[...document.querySelectorAll('button,input[type="button"],input[type="submit"],[role="button"]')];
    const element=${control.id
      ? `document.getElementById(${JSON.stringify(control.id)})`
      : `controls[${JSON.stringify(control.controlIndex)}]`};
    if (!element) return {hit:false,reason:'missing'};
    element.scrollIntoView({block:'center',inline:'center'});
    const style=getComputedStyle(element);
    const rect=element.getBoundingClientRect();
    if (element.hidden || style.display==='none' || style.visibility==='hidden' || rect.width<=1 || rect.height<=1) {
      return {hit:false,reason:'not-visible'};
    }
    const point={x:rect.left+rect.width/2,y:rect.top+rect.height/2};
    const hit=document.elementFromPoint(point.x,point.y);
    if (!hit || (hit!==element && !element.contains(hit))) {
      return {hit:false,reason:'obscured',target:hit?.id || hit?.tagName || ''};
    }
    return {hit:true,point};
  })()`)
}

async function clickVisibleControlWithPointer(client, sessionId, control) {
  const hitTest = await hitTestVisibleControl(client, sessionId, control)
  if (!hitTest?.hit) return { activated: false, reason: hitTest?.reason || 'not-hit-tested' }
  await clickPoint(client, sessionId, hitTest.point)
  return { activated: true, method: 'center-hit-tested-pointer' }
}

async function activateVisibleControlWithPointer(client, sessionId, control, { nonBlockingRelease = false } = {}) {
  const hitTest = await hitTestVisibleControl(client, sessionId, control)
  if (!hitTest?.hit) return { activated: false, reason: hitTest?.reason || 'not-hit-tested' }
  await clickPoint(client, sessionId, hitTest.point, { nonBlockingRelease })
  await new Promise((resolve) => setTimeout(resolve, 160))
  const snapshot = await evaluate(client, sessionId, controlSnapshotExpression)
  const after = snapshot.controls.find((candidate) => (
    control.id ? candidate.id === control.id : candidate.controlIndex === control.controlIndex
  )) ?? null
  return {
    activated: true,
    method: nonBlockingRelease ? 'center-hit-tested-pointer-state-confirmed' : 'center-hit-tested-pointer',
    before: control,
    after,
    snapshot,
  }
}

async function pressKey(client, sessionId, { code, key, virtualKeyCode }, holdMs = 60) {
  const base = { code, key, windowsVirtualKeyCode: virtualKeyCode, nativeVirtualKeyCode: virtualKeyCode }
  await sendBounded(client, 'Input.dispatchKeyEvent', { type: 'keyDown', ...base }, sessionId)
  await new Promise((resolve) => setTimeout(resolve, holdMs))
  await sendBounded(client, 'Input.dispatchKeyEvent', { type: 'keyUp', ...base }, sessionId)
}

async function readPointerLockState(client, sessionId) {
  return evaluate(client, sessionId, `({
    locked:Boolean(document.pointerLockElement),
    requests:window.__pathforgePointerLockRequests || 0,
  })`)
}

async function releasePointerLockAndWait(client, sessionId) {
  const before = await readPointerLockState(client, sessionId)
  if (!before.locked) return { ...before, released: true }
  await evaluate(client, sessionId, `(() => {
    document.exitPointerLock?.();
    return true;
  })()`)
  for (let attempt = 0; attempt < 20; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 50))
    const state = await readPointerLockState(client, sessionId)
    if (!state.locked) return { ...state, released: true }
  }
  const state = await readPointerLockState(client, sessionId)
  return { ...state, released: false }
}

function staticBriefingScore(text) {
  const patterns = [
    /\b(?:mission|objective|reactor run)\b/i,
    /\b(?:oxygen|O2|life support)\b/i,
    /\b(?:cell|core|airlock)\b/i,
    /\b(?:drone|enemy|security)\b/i,
    /\b(?:move|WASD|W A S D)\b/i,
    /\b(?:fire|pulse|shoot|spacebar|space)\b/i,
    /\b(?:turn|look|aim|arrow)\b/i,
  ]
  return patterns.filter((pattern) => pattern.test(text)).length
}

async function verifyViewport(client, file, viewport, staticResult) {
  currentVerifierPhase = 'startup'
  debug(path.basename(file), viewport.name, 'target-start')
  const { targetId } = await withDeadline(
    client.send('Target.createTarget', { url: 'about:blank' }),
    5_000,
    'Target.createTarget',
  )
  const { sessionId } = await withDeadline(
    client.send('Target.attachToTarget', { targetId, flatten: true }),
    5_000,
    'Target.attachToTarget',
  )
  const consoleErrors = []
  const attemptedNetwork = []
  const listener = (message) => {
    if (message.sessionId !== sessionId) return
    if (message.method === 'Runtime.exceptionThrown') {
      consoleErrors.push(message.params.exceptionDetails?.exception?.description ?? message.params.exceptionDetails?.text ?? 'Uncaught runtime exception')
    }
    if (message.method === 'Log.entryAdded' && message.params.entry?.level === 'error') {
      consoleErrors.push(message.params.entry.text)
    }
    if (message.method === 'Network.requestWillBeSent') {
      const url = message.params.request?.url ?? ''
      if (/^https?:/i.test(url)) attemptedNetwork.push(url)
    }
    if (message.method === 'Fetch.requestPaused') {
      const url = message.params.request?.url ?? ''
      attemptedNetwork.push(url)
      void client.send('Fetch.failRequest', {
        requestId: message.params.requestId,
        errorReason: 'BlockedByClient',
      }, sessionId).catch(() => {})
    }
  }
  client.listeners.add(listener)

  try {
    await Promise.all([
      sendBounded(client, 'Page.enable', {}, sessionId, 5_000),
      sendBounded(client, 'Runtime.enable', {}, sessionId, 5_000),
      sendBounded(client, 'Log.enable', {}, sessionId, 5_000),
      sendBounded(client, 'Network.enable', {}, sessionId, 5_000),
      sendBounded(client, 'Fetch.enable', {
        patterns: [
          { urlPattern: 'http://*/*', requestStage: 'Request' },
          { urlPattern: 'https://*/*', requestStage: 'Request' },
        ],
      }, sessionId, 5_000),
      sendBounded(client, 'Emulation.setDeviceMetricsOverride', {
        width: viewport.width,
        height: viewport.height,
        deviceScaleFactor: 1,
        mobile: viewport.mobile,
      }, sessionId, 5_000),
      sendBounded(client, 'Emulation.setTouchEmulationEnabled', {
        enabled: viewport.mobile,
        maxTouchPoints: viewport.mobile ? 5 : 1,
      }, sessionId, 5_000),
    ])

    await sendBounded(client, 'Page.addScriptToEvaluateOnNewDocument', {
      source: `(() => {
        window.__pathforgePointerLockRequests=0;
        window.__pathforgePointerLockRequestsBlockedAfterAim=0;
        window.__pathforgeBlockPointerLockAfterAim=false;
        window.__pathforgeMouseAimHandlers={registered:0,calls:0,nonZeroMovement:0,returned:0};
        const prototypes=[HTMLCanvasElement.prototype,HTMLElement.prototype,Element.prototype];
        const owner=prototypes.find((prototype)=>Object.prototype.hasOwnProperty.call(prototype,'requestPointerLock')) || Element.prototype;
        try {
          const original=owner.requestPointerLock;
          if (typeof original!=='function') throw new Error('requestPointerLock is unavailable');
          Object.defineProperty(owner,'requestPointerLock',{
            configurable:true,
            writable:true,
            value:function(...args){
              window.__pathforgePointerLockRequests++;
              if (window.__pathforgeBlockPointerLockAfterAim) {
                window.__pathforgePointerLockRequestsBlockedAfterAim++;
                return Promise.resolve();
              }
              return original.apply(this,args);
            },
          });
          window.__pathforgePointerLockInstrumentationInstalled=true;
        } catch (error) {
          window.__pathforgePointerLockInstrumentationInstalled=false;
          window.__pathforgePointerLockInstrumentationError=String(error?.stack || error);
        }

        const originalAdd=EventTarget.prototype.addEventListener;
        const originalRemove=EventTarget.prototype.removeEventListener;
        const wrappedListeners=new WeakMap();
        Object.defineProperty(EventTarget.prototype,'addEventListener',{
          configurable:true,
          writable:true,
          value:function(type,listener,options){
            const eventType=String(type);
            const supportedListener=typeof listener==='function' || (listener && typeof listener==='object');
            if (!/^(?:mouse|pointer)move$/i.test(eventType) || !supportedListener) {
              return originalAdd.call(this,type,listener,options);
            }
            const capture=typeof options==='boolean' ? options : Boolean(options?.capture);
            const entries=wrappedListeners.get(listener) || [];
            let entry=entries.find((candidate)=>candidate.target===this && candidate.type===eventType && candidate.capture===capture);
            if (!entry) {
              window.__pathforgeMouseAimHandlers.registered++;
              const wrapped=typeof listener==='function'
                ? function(event){
                    const record=window.__pathforgeMouseAimHandlers;
                    record.calls++;
                    if (Math.abs(Number(event.movementX) || 0)>0) record.nonZeroMovement++;
                    window.__pathforgeMouseAimHandlerActive=true;
                    try {
                      const result=listener.call(this,event);
                      record.returned++;
                      return result;
                    } finally {
                      window.__pathforgeMouseAimHandlerActive=false;
                    }
                  }
                : {handleEvent(event){
                    const record=window.__pathforgeMouseAimHandlers;
                    record.calls++;
                    if (Math.abs(Number(event.movementX) || 0)>0) record.nonZeroMovement++;
                    window.__pathforgeMouseAimHandlerActive=true;
                    try {
                      const result=listener.handleEvent.call(listener,event);
                      record.returned++;
                      return result;
                    } finally {
                      window.__pathforgeMouseAimHandlerActive=false;
                    }
                  }};
              entry={target:this,type:eventType,capture,wrapped};
              entries.push(entry);
              wrappedListeners.set(listener,entries);
            }
            return originalAdd.call(this,type,entry.wrapped,options);
          },
        });
        Object.defineProperty(EventTarget.prototype,'removeEventListener',{
          configurable:true,
          writable:true,
          value:function(type,listener,options){
            const eventType=String(type);
            const capture=typeof options==='boolean' ? options : Boolean(options?.capture);
            const entries=(listener && (typeof listener==='function' || typeof listener==='object'))
              ? wrappedListeners.get(listener) || []
              : [];
            const wrapped=/^(?:mouse|pointer)move$/i.test(eventType)
              ? entries.find((candidate)=>candidate.target===this && candidate.type===eventType && candidate.capture===capture)?.wrapped || listener
              : listener;
            return originalRemove.call(this,type,wrapped,options);
          },
        });
      })()`,
    }, sessionId, 5_000)

    currentVerifierPhase = 'gameplay'
    const loaded = client.waitFor('Page.loadEventFired', sessionId)
    await sendBounded(client, 'Page.navigate', { url: pathToFileURL(file).href }, sessionId, 8_000)
    await loaded
    await new Promise((resolve) => setTimeout(resolve, 450))
    const pointerLockInstrumentation = await evaluate(client, sessionId, `(() => ({
        installed:window.__pathforgePointerLockInstrumentationInstalled===true,
        error:window.__pathforgePointerLockInstrumentationError || '',
        requests:window.__pathforgePointerLockRequests || 0,
        blockedAfterAim:0,
        entered:false,
        released:false,
      }))()`)
    if (!pointerLockInstrumentation.installed) {
      throw new Error(`Pointer-lock verifier instrumentation was not installed: ${pointerLockInstrumentation.error || 'unknown error'}.`)
    }
    debug(path.basename(file), viewport.name, 'loaded')

    const expression = pageSnapshotExpression(staticResult.declaredNames)
    const interactionExpression = interactionSnapshotExpression(staticResult.declaredNames)
    const before = await evaluate(client, sessionId, expression)
    const briefingScore = staticBriefingScore(before.visibleText)
    let after = before
    let finalSnapshot = before
    let startTransition = false
    const startActions = []
    let touchControlsVisible = 0
    let pauseRuntime = false
    let muteRuntime = false
    let terminalProbe = staticResult.staticPassed
      ? { status: 'not-observable', detail: 'No safely callable terminal-state hook was exposed.' }
      : { status: 'skipped', detail: 'Terminal-state probing was skipped because a static hard gate had already rejected this artifact.' }
    let inputEvidence = {
      canvasChanged: false,
      semanticChanged: false,
      timerChanged: false,
      pausedProgressStable: false,
      resumedProgressChanged: false,
      touchActionChanged: false,
      mouseAimChanged: false,
    }

    if (before.start) {
      let current = before
      for (let attempt = 0; attempt < 3 && current.start; attempt += 1) {
        const action = current.start
        startActions.push(action.label || action.id || `start-${attempt + 1}`)
        const activation = await clickVisibleControlWithPointer(client, sessionId, action)
        if (!activation.activated) {
          throw new Error(`Start control ${action.label || action.id || '(unnamed)'} was not operable: ${activation.reason}.`)
        }
        await new Promise((resolve) => setTimeout(resolve, 500))
        const next = await evaluate(client, sessionId, expression)
        after = next
        finalSnapshot = next
        const sameAction = next.start && `${next.start.id}/${next.start.label}` === `${action.id}/${action.label}`
        if (sameAction && !snapshotChanged(current, next)) break
        current = next
      }
      startTransition = startActions.length > 0 && snapshotChanged(before, after) && !after.start
      debug(path.basename(file), viewport.name, 'started', startActions.join(' -> '), JSON.stringify(after.canvases))
    }

    const mainCanvas = after.canvases.find((canvas) => canvas.visible && canvas.area > 10_000) ?? after.canvases[0]

    if (viewport.mobile) {
      touchControlsVisible = after.controls.filter((control) => control.visible && /(?:touch|move|turn|look|aim|fire|pulse|shoot|joystick|sprint)/i.test(`${control.label} ${control.id}`)).length
      const touchElements = await evaluate(client, sessionId, `(() => {
        const visible=(element)=>{const style=getComputedStyle(element); const rect=element.getBoundingClientRect(); return !element.hidden && style.display!=='none' && style.visibility!=='hidden' && rect.width>8 && rect.height>8;};
        return [...document.querySelectorAll('[id*="touch" i],[id*="move" i],[id*="look" i],[id*="turn" i],[id*="fire" i],[class*="touch" i],[aria-label*="touch" i],[aria-label*="move" i],[aria-label*="look" i]')]
          .filter(visible).map((element)=>{const rect=element.getBoundingClientRect(); return { id:element.id || '', label:element.getAttribute('aria-label') || element.textContent?.trim() || '', x:rect.left+rect.width/2, y:rect.top+rect.height/2, width:rect.width, height:rect.height };})
          .filter((row,index,rows)=>rows.findIndex((candidate)=>candidate.x===row.x && candidate.y===row.y)===index)
          .slice(0,12);
      })()`)
      touchControlsVisible = Math.max(touchControlsVisible, touchElements.length)
      const touchTarget = touchElements.find((row) => /(?:fire|pulse|shoot)/i.test(`${row.id} ${row.label}`)) ?? touchElements[0]
      if (touchTarget) {
        const beforeTouch = await evaluate(client, sessionId, interactionExpression)
        const point = { x: touchTarget.x, y: touchTarget.y, radiusX: 3, radiusY: 3, force: 1, id: 1 }
        await sendBounded(client, 'Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] }, sessionId)
        await new Promise((resolve) => setTimeout(resolve, 100))
        await sendBounded(client, 'Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }, sessionId)
        await new Promise((resolve) => setTimeout(resolve, 180))
        const afterTouch = await evaluate(client, sessionId, interactionExpression)
        inputEvidence.touchActionChanged = snapshotChanged(beforeTouch, afterTouch)
      }
    } else if (before.start) {
      const actionBefore = await evaluate(client, sessionId, interactionExpression)
      if (mainCanvas?.x && mainCanvas?.y) {
        const mouseBefore = orientationState(actionBefore)
        await evaluate(client, sessionId, `(() => {
          const state=window.__pathforgeMouseAimProbe={rotationCalls:0,rotationCallsInsideHandler:0,originals:{}};
          for (const name of ${JSON.stringify(staticResult.evidence.mouseAimFunctionNames)}) {
            try {
              const original=eval(name);
              if (typeof original!=='function') continue;
              state.originals[name]=original;
              eval(name+'=function(...args){const probe=window.__pathforgeMouseAimProbe; probe.rotationCalls++; if(window.__pathforgeMouseAimHandlerActive) probe.rotationCallsInsideHandler++; return original.apply(this,args)}');
            } catch {}
          }
        })()`)
        await sendBounded(client, 'Input.dispatchMouseEvent', {
          type: 'mouseMoved',
          x: mainCanvas.x - 70,
          y: mainCanvas.y,
        }, sessionId)
        await sendBounded(client, 'Input.dispatchMouseEvent', {
          type: 'mousePressed',
          x: mainCanvas.x - 70,
          y: mainCanvas.y,
          button: 'left',
          buttons: 1,
          clickCount: 1,
        }, sessionId)
        await new Promise((resolve) => setTimeout(resolve, 140))
        const pointerStateDuringAim = await readPointerLockState(client, sessionId)
        pointerLockInstrumentation.requests = pointerStateDuringAim.requests
        pointerLockInstrumentation.entered = pointerLockInstrumentation.entered || pointerStateDuringAim.locked
        await sendBounded(client, 'Input.dispatchMouseEvent', {
          type: 'mouseMoved',
          x: mainCanvas.x,
          y: mainCanvas.y,
          button: 'left',
          buttons: 1,
        }, sessionId)
        await sendBounded(client, 'Input.dispatchMouseEvent', {
          type: 'mouseMoved',
          x: mainCanvas.x + 70,
          y: mainCanvas.y,
          button: 'left',
          buttons: 1,
        }, sessionId)
        await sendBounded(client, 'Input.dispatchMouseEvent', {
          type: 'mouseReleased',
          x: mainCanvas.x + 70,
          y: mainCanvas.y,
          button: 'left',
          buttons: 0,
          clickCount: 1,
        }, sessionId)
        await new Promise((resolve) => setTimeout(resolve, 180))
        const mouseAfterSnapshot = await evaluate(client, sessionId, interactionExpression)
        const mouseAfter = orientationState(mouseAfterSnapshot)
        const mouseProbe = await evaluate(
          client,
          sessionId,
          `({
            verifier:window.__pathforgeMouseAimProbe || {rotationCalls:0,rotationCallsInsideHandler:0},
            artifactHandlers:window.__pathforgeMouseAimHandlers || {registered:0,calls:0,nonZeroMovement:0,returned:0},
          })`,
        )
        await evaluate(client, sessionId, `(() => {
          const state=window.__pathforgeMouseAimProbe;
          for (const [name,original] of Object.entries(state?.originals || {})) {
            try { eval(name+'=original'); } catch {}
          }
          return true;
        })()`)
        const orientationChanged = JSON.stringify(mouseBefore) !== JSON.stringify(mouseAfter)
        const renderedViewChanged = actionBefore.canvases.some(
          (canvas, index) => canvas.hash !== mouseAfterSnapshot.canvases[index]?.hash,
        )
        inputEvidence.mouseAimChanged =
          orientationChanged ||
          mouseProbe.verifier.rotationCallsInsideHandler > 0 ||
          (
            staticResult.evidence.mouseAimImplementation &&
            mouseProbe.artifactHandlers.returned > 0 &&
            mouseProbe.artifactHandlers.nonZeroMovement > 0 &&
            renderedViewChanged &&
            pointerLockInstrumentation.entered
          )
        debug(path.basename(file), viewport.name, 'mouse-aim', JSON.stringify({
          canvas: { x: mainCanvas.x, y: mainCanvas.y },
          before: mouseBefore,
          after: mouseAfter,
          renderedViewChanged,
          probe: mouseProbe,
        }))
      }
      await pressKey(client, sessionId, { code: 'KeyW', key: 'w', virtualKeyCode: 87 }, 420)
      await pressKey(client, sessionId, { code: 'ArrowRight', key: 'ArrowRight', virtualKeyCode: 39 }, 180)
      await pressKey(client, sessionId, { code: 'Space', key: ' ', virtualKeyCode: 32 }, 80)
      await new Promise((resolve) => setTimeout(resolve, 240))
      const actionAfter = await evaluate(client, sessionId, interactionExpression)
      inputEvidence.canvasChanged = actionBefore.canvases.some((canvas, index) => canvas.hash !== actionAfter.canvases[index]?.hash)
      inputEvidence.semanticChanged = JSON.stringify(actionBefore.semantic) !== JSON.stringify(actionAfter.semantic)

      await new Promise((resolve) => setTimeout(resolve, 900))
      const timerAfter = await evaluate(client, sessionId, interactionExpression)
      inputEvidence.timerChanged = actionAfter.visibleText !== timerAfter.visibleText || JSON.stringify(actionAfter.semantic) !== JSON.stringify(timerAfter.semantic)
      debug(path.basename(file), viewport.name, 'input-tested')

      const pointerRelease = await releasePointerLockAndWait(client, sessionId)
      pointerLockInstrumentation.requests = pointerRelease.requests
      pointerLockInstrumentation.released = pointerRelease.released
      if (!pointerRelease.released) {
        throw new Error('Pointer lock did not release before pause-control verification.')
      }
      const lockBlockState = await evaluate(client, sessionId, `(() => {
        window.__pathforgeBlockPointerLockAfterAim=true;
        return {
          requests:window.__pathforgePointerLockRequests || 0,
          blockedAfterAim:window.__pathforgePointerLockRequestsBlockedAfterAim || 0,
        };
      })()`)
      pointerLockInstrumentation.requests = lockBlockState.requests
      pointerLockInstrumentation.blockedAfterAim = lockBlockState.blockedAfterAim
      await new Promise((resolve) => setTimeout(resolve, 160))

      let controlState = await evaluate(client, sessionId, controlSnapshotExpression)
      if (controlState.pointerLocked) {
        throw new Error('Synthetic mouse-aim probe unexpectedly entered pointer lock.')
      }
      debug(path.basename(file), viewport.name, 'post-input-controls', JSON.stringify(controlState.controls.filter((control) => control.visible)))

      const pauseKey = staticResult.pauseKey === 'Escape'
        ? { code: 'Escape', key: 'Escape', virtualKeyCode: 27 }
        : { code: 'KeyP', key: 'p', virtualKeyCode: 80 }
      const alternatePauseKey = staticResult.pauseKey === 'Escape'
        ? { code: 'KeyP', key: 'p', virtualKeyCode: 80 }
        : { code: 'Escape', key: 'Escape', virtualKeyCode: 27 }
      const pausePattern = /(?:\bpause\b|⏸|Ⅱ)/i
      const resumePattern = /\b(?:paused|resume|unpause)\b/i
      const mutePattern = /(?:mute|unmute|sound|audio)/i

      // Require a fresh visible-HUD running -> paused -> running sequence.
      // Generic help text never counts as state evidence.
      const pauseKeys = [pauseKey, alternatePauseKey]
      let resumeControl = visibleControl(controlState, resumePattern)
      if (resumeControl) {
        const activation = await activateVisibleControlWithPointer(client, sessionId, resumeControl, { nonBlockingRelease: true })
        if (!activation?.activated || visibleControl(activation.snapshot, resumePattern)) {
          throw new Error(`Visible Resume control ${resumeControl.label || resumeControl.id} did not restore the running state.`)
        }
        controlState = activation.snapshot
      }
      debug(path.basename(file), viewport.name, 'pause-normalized-controls', JSON.stringify(controlState.controls.filter((control) => control.visible)))

      // Exercise mute from the normalized running state. This uses a
      // center-hit-tested pointer path and also prevents Web Audio alert
      // synthesis from becoming the thing the pause verifier benchmarks.
      const runningMuteControl = visibleControl(controlState, mutePattern)
      if (runningMuteControl) {
        const activation = await activateVisibleControlWithPointer(client, sessionId, runningMuteControl)
        if (activation?.activated) {
          muteRuntime = muteControlChanged(activation.before, activation.after)
          controlState = activation.snapshot
        }
        debug(path.basename(file), viewport.name, 'pre-pause-mute-controls', JSON.stringify(activation))
      }

      const runningStateObserved =
        !visibleControl(controlState, resumePattern) &&
        (inputEvidence.timerChanged || inputEvidence.canvasChanged || inputEvidence.semanticChanged)
      let pausedState = controlState
      let pauseToggleKey = null
      const runningPauseControl = visibleControl(controlState, pausePattern)
      if (runningPauseControl) {
        debug(path.basename(file), viewport.name, 'pause-hit-test-start', runningPauseControl.id || runningPauseControl.label)
        const activation = await activateVisibleControlWithPointer(client, sessionId, runningPauseControl)
        debug(path.basename(file), viewport.name, 'pause-hit-test-finish', JSON.stringify(activation))
        if (activation?.activated) {
          const candidate = activation.snapshot
          if (visibleControl(candidate, resumePattern)) {
            pausedState = candidate
            pauseToggleKey = { code: 'VisiblePauseControl' }
          }
        }
        if (!pauseToggleKey) {
          throw new Error(`Visible Pause control ${runningPauseControl.label || runningPauseControl.id} did not enter the paused state.`)
        }
      } else {
        for (const key of pauseKeys) {
          await pressKey(client, sessionId, key)
          await new Promise((resolve) => setTimeout(resolve, 160))
          const candidate = await evaluate(client, sessionId, controlSnapshotExpression)
          if (visibleControl(candidate, resumePattern)) {
            pausedState = candidate
            pauseToggleKey = key
            break
          }
        }
      }
      const enteredPausedState = Boolean(pauseToggleKey && visibleControl(pausedState, resumePattern))
      debug(path.basename(file), viewport.name, 'paused-controls', JSON.stringify(pausedState.controls.filter((control) => control.visible)))

      const muteBefore = pausedState
      const muteControl = visibleControl(muteBefore, mutePattern)
      if (!muteRuntime && muteControl) {
        const activation = await activateVisibleControlWithPointer(client, sessionId, muteControl)
        if (activation?.activated) {
          muteRuntime = muteControlChanged(activation.before, activation.after)
          pausedState = activation.snapshot
        }
        if (!visibleControl(pausedState, resumePattern)) {
          throw new Error(`Mute control ${muteControl.label || muteControl.id} exited the paused state.`)
        }
        debug(path.basename(file), viewport.name, 'mute-controls', JSON.stringify(activation))
      }

      debug(path.basename(file), viewport.name, 'paused-progress-snapshot-start')
      const pausedProgressBefore = await evaluate(client, sessionId, interactionExpression)
      debug(path.basename(file), viewport.name, 'paused-progress-snapshot-first-finish')
      await new Promise((resolve) => setTimeout(resolve, 900))
      debug(path.basename(file), viewport.name, 'paused-progress-snapshot-second-start')
      const pausedProgressAfter = await evaluate(client, sessionId, interactionExpression)
      debug(path.basename(file), viewport.name, 'paused-progress-snapshot-second-finish')
      inputEvidence.pausedProgressStable =
        gameplayProgressSignature(pausedProgressBefore) === gameplayProgressSignature(pausedProgressAfter)

      let resumedState = pausedState
      if (pauseToggleKey) {
        resumeControl = visibleControl(pausedState, resumePattern)
        if (resumeControl) {
          const activation = await activateVisibleControlWithPointer(client, sessionId, resumeControl, { nonBlockingRelease: true })
          if (!activation?.activated || visibleControl(activation.snapshot, resumePattern)) {
            throw new Error(`Visible Resume control ${resumeControl.label || resumeControl.id} did not restore the running state.`)
          }
          resumedState = activation.snapshot
        } else if (pauseToggleKey.code !== 'VisiblePauseControl') {
          await pressKey(client, sessionId, pauseToggleKey)
          await new Promise((resolve) => setTimeout(resolve, 160))
          resumedState = await evaluate(client, sessionId, controlSnapshotExpression)
        }
      }
      const resumeAfter = visibleControl(resumedState, resumePattern)
      const restoredRunningControl = runningPauseControl
        ? Boolean(visibleControl(resumedState, pausePattern))
        : !resumeAfter
      if (!resumeAfter) {
        const resumedProgressBefore = await evaluate(client, sessionId, interactionExpression)
        await new Promise((resolve) => setTimeout(resolve, 900))
        const resumedProgressAfter = await evaluate(client, sessionId, interactionExpression)
        inputEvidence.resumedProgressChanged =
          gameplayProgressSignature(resumedProgressBefore) !== gameplayProgressSignature(resumedProgressAfter)
      }
      pauseRuntime =
        runningStateObserved &&
        enteredPausedState &&
        inputEvidence.pausedProgressStable &&
        !resumeAfter &&
        restoredRunningControl &&
        inputEvidence.resumedProgressChanged
      debug(path.basename(file), viewport.name, 'resumed-controls', JSON.stringify(resumedState.controls.filter((control) => control.visible)))
      debug(path.basename(file), viewport.name, 'pause-mute-tested')
      pointerLockInstrumentation.blockedAfterAim = await evaluate(
        client,
        sessionId,
        'window.__pathforgePointerLockRequestsBlockedAfterAim || 0',
      )

      // Terminal hooks are only exercised after every static hard gate passes.
      // A rejected artifact should fail quickly, and calling generated end-game
      // code cannot add useful acceptance evidence to an already blocked file.
      for (const terminalFunction of staticResult.staticPassed ? staticResult.terminalFunctions : []) {
        debug(path.basename(file), viewport.name, 'terminal-callable-start', terminalFunction.name)
        const callable = await evaluate(client, sessionId, `typeof ${terminalFunction.name} === 'function'`)
        debug(path.basename(file), viewport.name, 'terminal-callable-finish', terminalFunction.name, callable)
        if (!callable) continue
        debug(path.basename(file), viewport.name, 'terminal-failure-probe-start', terminalFunction.name)
        const probe = await evaluate(client, sessionId, `(() => {
          try {
            ${terminalFunction.name}(false, 'Verification terminal-state probe');
            return { ok:true };
          } catch (error) {
            return { ok:false, error:String(error?.stack || error) };
          }
        })()`)
        debug(path.basename(file), viewport.name, 'terminal-failure-probe-finish', terminalFunction.name, JSON.stringify(probe))
        await new Promise((resolve) => setTimeout(resolve, 180))
        debug(path.basename(file), viewport.name, 'terminal-failure-snapshot-start', terminalFunction.name)
        const terminal = await evaluate(client, sessionId, expression)
        debug(path.basename(file), viewport.name, 'terminal-failure-snapshot-finish', terminalFunction.name)
        finalSnapshot = terminal
        const visibleTerminal = /(?:station lost|mission failed|game over|run ended|hull (?:collapse|breach|fatality)|score|mission evaluation|re-?initialize|run again|replay)/i.test(terminal.visibleText)
        terminalProbe = {
          status: probe.ok && visibleTerminal ? 'observed' : 'failed',
          detail: probe.ok
            ? `${terminalFunction.name}(false, …) was callable; terminal UI visible=${visibleTerminal}.`
            : `${terminalFunction.name} threw: ${compact(probe.error)}`,
        }

        if (probe.ok && visibleTerminal) {
          const restart = visibleControl(terminal, /(?:restart|replay|run again|re-initialize|reinitialize)/i)
          terminalProbe.restartControlVisible = Boolean(restart)
          terminalProbe.restartObserved = false
          terminalProbe.winObserved = false
        }
        break
      }
      debug(path.basename(file), viewport.name, 'terminal-probed')
    }

    debug(path.basename(file), viewport.name, 'snapshot-final', JSON.stringify(finalSnapshot.canvases))
    return {
      viewport: viewport.name,
      before,
      after,
      finalSnapshot,
      briefingScore,
      startTransition,
      startActions,
      mainCanvas,
      touchControlsVisible,
      pauseRuntime,
      muteRuntime,
      terminalProbe,
      pointerLockInstrumentation,
      inputEvidence,
      attemptedNetwork: unique(attemptedNetwork),
      consoleErrors: unique(consoleErrors),
      restartControl: anyControl(after, /(?:restart|replay|run again|re-initialize|reinitialize)/i),
      pauseControl: anyControl(after, /(?:pause|resume|Ⅱ)/i),
      muteControl: anyControl(after, /(?:mute|unmute|sound|audio)/i),
    }
  } finally {
    client.listeners.delete(listener)
    // Do not let generated requestAnimationFrame loops make teardown wait on a
    // renderer's main thread. Target.closeTarget is sent through the browser
    // session, and the verifier proceeds even if Chrome is slow to acknowledge.
    await Promise.race([
      client.send('Target.closeTarget', { targetId }).catch(() => {}),
      new Promise((resolve) => setTimeout(resolve, 1_000)),
    ])
    debug(path.basename(file), viewport.name, 'target-closed')
  }
}

function runtimeChecks(desktop, mobile) {
  const collector = createCheckCollector()
  const runtimeErrors = unique([...desktop.consoleErrors, ...mobile.consoleErrors])
  const networkAttempts = unique([...desktop.attemptedNetwork, ...mobile.attemptedNetwork])
  // A game's first post-launch snapshot can land between the state transition
  // and its next animation frame. Accept the richest large visible canvas from
  // either that snapshot or the later, interaction-tested snapshot rather
  // than freezing the rendering verdict on a transient black first frame.
  const renderedCanvasEvidence = [
    ...(desktop.after?.canvases ?? []),
    ...(desktop.finalSnapshot?.canvases ?? []),
  ]
    .filter((canvas) => canvas.visible && canvas.area > 10_000)
    .sort((left, right) => right.area - left.area || right.colorBuckets - left.colorBuckets)[0] ?? null
  const renderedCanvas = Boolean(renderedCanvasEvidence && renderedCanvasEvidence.colorBuckets >= 4)

  collector.add('browser-runtime-clean', runtimeErrors.length === 0, runtimeErrors.length ? runtimeErrors.join(' | ') : 'No uncaught exceptions or browser log errors across desktop and mobile runs.')
  collector.add('runtime-offline', networkAttempts.length === 0, networkAttempts.length ? `Blocked network attempts: ${networkAttempts.join(', ')}` : 'No HTTP(S) requests attempted while network fetches were blocked.')
  collector.add('responsive-no-overflow', desktop.before.overflow <= 1 && desktop.finalSnapshot.overflow <= 1 && mobile.before.overflow <= 1 && mobile.finalSnapshot.overflow <= 1, `desktop=${Math.max(desktop.before.overflow, desktop.finalSnapshot.overflow)}px; 390px=${Math.max(mobile.before.overflow, mobile.finalSnapshot.overflow)}px`)
  collector.add('understandable-start-screen', desktop.briefingScore >= 5 && Boolean(desktop.before.start), `briefing signals=${desktop.briefingScore}/7; start action=${desktop.before.start?.label || '(missing)'}`)
  collector.add('start-state-transition', desktop.startTransition && mobile.startTransition, `desktop=${desktop.startTransition}; mobile=${mobile.startTransition}`)
  collector.add('rendered-first-person-surface', renderedCanvas, renderedCanvasEvidence ? `canvas=${renderedCanvasEvidence.width}×${renderedCanvasEvidence.height}; color buckets=${renderedCanvasEvidence.colorBuckets}` : 'No large visible rendered canvas found after Start.')
  collector.add('runtime-mouse-aim', desktop.inputEvidence.mouseAimChanged, `horizontal pointer drag changed exposed player orientation=${desktop.inputEvidence.mouseAimChanged}`)
  collector.add('runtime-pause-resume', desktop.pauseRuntime && Boolean(desktop.pauseControl), `pause control=${desktop.pauseControl?.label || '(missing)'}; running→stable pause→running progression=${desktop.pauseRuntime}`)
  collector.add('runtime-mute-toggle', desktop.muteRuntime && Boolean(desktop.muteControl), `mute/sound control=${desktop.muteControl?.label || '(missing)'}; center-hit-tested pointer toggle=${desktop.muteRuntime}`)
  collector.add('restart-control-present', Boolean(desktop.restartControl), `restart/replay control=${desktop.restartControl?.label || '(missing)'}`)
  collector.add('mobile-touch-surface', mobile.touchControlsVisible >= 2, `${mobile.touchControlsVisible} visible touch/control region(s) found after Start at 390px.`)
  return collector.checks
}

function humanReviewEvidence(staticResult, desktop, mobile) {
  const inputObserved = desktop.inputEvidence.semanticChanged || desktop.inputEvidence.canvasChanged
  const touchObserved = mobile.inputEvidence.touchActionChanged
  return [
    {
      id: 'movement-turn-fire-response',
      status: inputObserved ? 'automated-evidence' : 'manual-review',
      detail: inputObserved
        ? `W, ArrowRight, and Space changed runtime state/canvas (semantic=${desktop.inputEvidence.semanticChanged}; canvas=${desktop.inputEvidence.canvasChanged}).`
        : 'Static handlers passed, but the generated engine did not expose a reliable generic runtime delta. Play the mission manually.',
    },
    {
      id: 'oxygen-clock-progress',
      status: desktop.inputEvidence.timerChanged ? 'automated-evidence' : 'manual-review',
      detail: desktop.inputEvidence.timerChanged
        ? 'Visible or safely readable mission state changed over an additional 0.9 seconds of play.'
        : 'The timer is canvas- or closure-only; manually confirm oxygen starts after Start and decreases at one second per second.',
    },
    {
      id: 'touch-response',
      status: touchObserved ? 'automated-evidence' : 'manual-review',
      detail: touchObserved
        ? 'A visible 390px touch control accepted a synthetic touch and changed runtime state/canvas.'
        : 'Touch controls and handlers exist, but generic touch automation could not attribute a state delta. Test on a real touch device.',
    },
    {
      id: 'terminal-state-and-restart',
      status: desktop.terminalProbe.status === 'observed' && desktop.terminalProbe.restartObserved && desktop.terminalProbe.winObserved ? 'automated-evidence' : 'manual-review',
      detail: desktop.terminalProbe.status === 'observed'
        ? `${desktop.terminalProbe.detail} restart control visible=${Boolean(desktop.terminalProbe.restartControlVisible)}; activation remains a manual hit-testing check.`
        : `${desktop.terminalProbe.detail} Play both endings manually before publication.`,
    },
    {
      id: 'combat-and-mission-quality',
      status: 'manual-review',
      detail: `Engine evidence: raycast=${staticResult.evidence.raycastEvidence}; collision=${staticResult.evidence.collisionEvidence}; movement=${staticResult.evidence.movementEvidence}; combat/damage=${staticResult.evidence.combatEvidence}. Human review must still judge 15-second clarity, aiming feel, drone feedback, route readability, and whether the loop is genuinely A+ fun.`,
    },
  ]
}

async function verifyViewportIsolated(executable, file, viewport, staticResult) {
  currentVerifierPhase = 'startup'
  const profile = mkdtempSync(path.join(tmpdir(), `pathforge-airlock-zero-${viewport.name}-`))
  const child = spawn(executable, [
    '--headless=new',
    '--disable-gpu',
    '--disable-extensions',
    '--no-sandbox',
    '--mute-audio',
    '--allow-file-access-from-files',
    '--autoplay-policy=no-user-gesture-required',
    '--remote-debugging-port=0',
    `--user-data-dir=${profile}`,
    'about:blank',
  ], { stdio: ['ignore', 'ignore', 'pipe'] })

  let client
  try {
    client = new CdpClient(await waitForWebSocketUrl(child))
    await withDeadline(client.ready(), 5_000, 'Chrome DevTools connection')
    return await verifyViewport(client, file, viewport, staticResult)
  } finally {
    client?.close()
    await stopChrome(child)
    rmSync(profile, { recursive: true, force: true, maxRetries: 8, retryDelay: 125 })
  }
}

function viewportConfirmationPassed(result) {
  const overflow = Math.max(result.before?.overflow ?? 0, result.finalSnapshot?.overflow ?? 0)
  const shared =
    result.startTransition &&
    overflow <= 1 &&
    result.consoleErrors.length === 0 &&
    result.attemptedNetwork.length === 0
  if (!shared) return false
  if (result.viewport === 'mobile') return result.touchControlsVisible >= 2
  const renderedCanvasEvidence = [
    ...(result.after?.canvases ?? []),
    ...(result.finalSnapshot?.canvases ?? []),
  ]
    .filter((canvas) => canvas.visible && canvas.area > 10_000)
    .sort((left, right) => right.area - left.area || right.colorBuckets - left.colorBuckets)[0] ?? null
  const renderedCanvas = Boolean(renderedCanvasEvidence && renderedCanvasEvidence.colorBuckets >= 4)
  return Boolean(
    result.briefingScore >= 5 &&
    renderedCanvas &&
    result.inputEvidence.mouseAimChanged &&
    result.pauseRuntime &&
    result.pauseControl &&
    result.muteRuntime &&
    result.muteControl &&
    result.restartControl
  )
}

async function verifyViewportWithTransientRetry(executable, file, viewport, staticResult) {
  let runtimeTimeoutSeen = false
  let consecutiveConfirmedRuns = 0
  const attemptHistory = []
  for (let attempt = 1; attempt <= MAX_TRANSIENT_VIEWPORT_ATTEMPTS; attempt += 1) {
    try {
      const result = await verifyViewportIsolated(executable, file, viewport, staticResult)
      const confirmationPassed = viewportConfirmationPassed(result)
      attemptHistory.push({ attempt, status: confirmationPassed ? 'passed' : 'completed-with-failed-evidence' })
      if (!runtimeTimeoutSeen) {
        return {
          ...result,
          verifierAttempts: attempt,
          verifierStability: attempt > 1 ? 'startup-retry' : 'clean',
          verifierAttemptHistory: attemptHistory,
        }
      }
      if (!confirmationPassed) {
        consecutiveConfirmedRuns = 0
        if (attempt === MAX_TRANSIENT_VIEWPORT_ATTEMPTS) {
          const error = new Error(
            `Airlock verifier could not obtain two consecutive valid ${viewport.name} confirmations after a gameplay-phase timeout.`,
          )
          error.verifierAttempts = attempt
          error.verifierAttemptHistory = attemptHistory
          throw error
        }
        console.warn(
          `[airlock-verify] ${path.basename(file)} ${viewport.name} completed after a gameplay-phase timeout ` +
          'but its viewport evidence was not valid; the consecutive-confirmation count was reset.',
        )
        continue
      }
      consecutiveConfirmedRuns += 1
      if (consecutiveConfirmedRuns >= 2) {
        return {
          ...result,
          verifierAttempts: attempt,
          verifierStability: 'two-clean-runs-after-runtime-timeout',
          verifierAttemptHistory: attemptHistory,
        }
      }
      console.warn(
        `[airlock-verify] ${path.basename(file)} ${viewport.name} completed after a gameplay-phase timeout; ` +
        'one additional fresh-browser confirmation is required.',
      )
    } catch (error) {
      if (error?.verifierAttemptHistory) throw error
      const message = error instanceof Error ? error.message : String(error)
      if (BROWSER_TIMEOUT.test(message)) encounteredBrowserTimeout = true
      const startupTimeout = isRetryableBrowserTimeout(error)
      const gameplayTimeout = BROWSER_TIMEOUT.test(message) && !startupTimeout
      attemptHistory.push({
        attempt,
        status: 'failed',
        kind: startupTimeout ? 'startup-timeout' : gameplayTimeout ? 'gameplay-timeout' : 'non-retryable',
        detail: compact(message, 360),
      })
      if (runtimeTimeoutSeen) consecutiveConfirmedRuns = 0
      if (attempt === MAX_TRANSIENT_VIEWPORT_ATTEMPTS || (!startupTimeout && !gameplayTimeout)) {
        if (error && typeof error === 'object') {
          error.verifierAttempts = attempt
          error.verifierAttemptHistory = attemptHistory
        }
        throw error
      }
      if (gameplayTimeout) {
        runtimeTimeoutSeen = true
        consecutiveConfirmedRuns = 0
        console.warn(
          `[airlock-verify] ${path.basename(file)} ${viewport.name} hit a gameplay-phase browser timeout; ` +
          'two consecutive fresh-browser confirmations are now required. ' +
          `(attempt ${attempt + 1}/${MAX_TRANSIENT_VIEWPORT_ATTEMPTS}). ${compact(message, 360)}`,
        )
      } else {
        console.warn(
          `[airlock-verify] ${path.basename(file)} ${viewport.name} hit a transient browser-startup timeout; ` +
          `retrying in a fresh isolated Chrome process ` +
          `(attempt ${attempt + 1}/${MAX_TRANSIENT_VIEWPORT_ATTEMPTS}). ${compact(message, 360)}`,
        )
      }
      debug(path.basename(file), viewport.name, 'transient-timeout-retry')
      await new Promise((resolve) => setTimeout(resolve, 500 * attempt))
    }
  }
  const error = new Error(
    runtimeTimeoutSeen
      ? 'Airlock verifier could not obtain two consecutive clean runs after a gameplay-phase timeout.'
      : 'Airlock verifier retry loop exited unexpectedly.',
  )
  error.verifierAttempts = MAX_TRANSIENT_VIEWPORT_ATTEMPTS
  error.verifierAttemptHistory = attemptHistory
  throw error
}

async function inspectArtifact(executable, file) {
  debug(path.basename(file), 'artifact-start')
  const html = readFileSync(file, 'utf8')
  const staticResult = staticInspection(file, html)
  const viewports = []
  for (const viewport of VIEWPORTS) {
    try {
      viewports.push(await verifyViewportWithTransientRetry(executable, file, viewport, staticResult))
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      viewports.push({
        viewport: viewport.name,
        fatalError: lastDebugContext ? `${message} Last verifier phase: ${lastDebugContext}.` : message,
        verifierAttempts: error?.verifierAttempts ?? 1,
        verifierAttemptHistory: error?.verifierAttemptHistory ?? [],
        consoleErrors: [],
        attemptedNetwork: [],
      })
    }
  }

  const desktop = viewports.find((result) => result.viewport === 'desktop')
  const mobile = viewports.find((result) => result.viewport === 'mobile')
  let browserChecks = []
  let humanReview = []
  if (!desktop?.fatalError && !mobile?.fatalError) {
    browserChecks = runtimeChecks(desktop, mobile)
    humanReview = humanReviewEvidence(staticResult, desktop, mobile)
  } else {
    browserChecks = [
      {
        id: 'browser-verification-completed',
        passed: false,
        detail: compact([desktop?.fatalError, mobile?.fatalError].filter(Boolean).join(' | ')),
      },
    ]
    humanReview = [{
      id: 'browser-evidence-unavailable',
      status: 'manual-review',
      detail: 'Browser verification did not complete, so no runtime quality claim is safe.',
    }]
  }

  const hardChecks = [...staticResult.checks, ...browserChecks]
  return {
    file,
    passed: hardChecks.every((check) => check.passed),
    hardChecks,
    humanReview,
    runtime: {
      desktop: desktop?.fatalError ? {
        fatalError: desktop.fatalError,
        verifierAttempts: desktop.verifierAttempts ?? 1,
        verifierAttemptHistory: desktop.verifierAttemptHistory ?? [],
      } : {
        verifierAttempts: desktop.verifierAttempts ?? 1,
        verifierStability: desktop.verifierStability ?? 'clean',
        verifierAttemptHistory: desktop.verifierAttemptHistory ?? [],
        startAction: desktop.before.start?.label ?? '',
        briefingScore: desktop.briefingScore,
        canvas: desktop.mainCanvas,
        inputEvidence: desktop.inputEvidence,
        pointerLockInstrumentation: desktop.pointerLockInstrumentation,
        terminalProbe: desktop.terminalProbe,
      },
      mobile: mobile?.fatalError ? {
        fatalError: mobile.fatalError,
        verifierAttempts: mobile.verifierAttempts ?? 1,
        verifierAttemptHistory: mobile.verifierAttemptHistory ?? [],
      } : {
        verifierAttempts: mobile.verifierAttempts ?? 1,
        verifierStability: mobile.verifierStability ?? 'clean',
        verifierAttemptHistory: mobile.verifierAttemptHistory ?? [],
        overflow: Math.max(mobile.before.overflow, mobile.finalSnapshot.overflow),
        touchControlsVisible: mobile.touchControlsVisible,
        inputEvidence: mobile.inputEvidence,
        pointerLockInstrumentation: mobile.pointerLockInstrumentation,
      },
    },
  }
}

async function stopChrome(child) {
  if (child.exitCode !== null || child.signalCode !== null) return
  const exited = new Promise((resolve) => child.once('exit', resolve))
  child.kill('SIGTERM')
  await Promise.race([
    exited,
    new Promise((resolve) => setTimeout(resolve, 1_000)),
  ])
  if (child.exitCode === null && child.signalCode === null) {
    child.kill('SIGKILL')
    await Promise.race([
      exited,
      new Promise((resolve) => setTimeout(resolve, 1_000)),
    ])
  }
}

function printResult(result) {
  const relative = path.relative(REPO_ROOT, result.file)
  const passedChecks = result.hardChecks.filter((check) => check.passed).length
  console.log(`${result.passed ? 'PASS' : 'FAIL'} ${relative} — hard gates ${passedChecks}/${result.hardChecks.length}`)
  for (const check of result.hardChecks) {
    console.log(`  ${check.passed ? '✓' : '✗'} ${check.id}: ${check.detail}`)
  }
  const retryRows = ['desktop', 'mobile']
    .map((viewport) => ({
      viewport,
      attempts: result.runtime?.[viewport]?.verifierAttempts ?? 1,
      stability: result.runtime?.[viewport]?.verifierStability ?? 'clean',
    }))
    .filter((row) => row.attempts > 1)
  for (const retry of retryRows) {
    console.log(`  ! ${retry.viewport} verifier required ${retry.attempts} isolated attempts (${retry.stability}).`)
    const history = result.runtime?.[retry.viewport]?.verifierAttemptHistory ?? []
    if (history.length > 0) {
      console.log(`    Attempts: ${history.map((row) => `${row.attempt}:${row.status}${row.kind ? `/${row.kind}` : ''}`).join(', ')}.`)
    }
  }
  console.log('  Human-review evidence (never promoted to a hard pass):')
  for (const evidence of result.humanReview) {
    const marker = evidence.status === 'automated-evidence' ? 'evidence' : 'review'
    console.log(`    - ${marker} ${evidence.id}: ${evidence.detail}`)
  }
}

async function main() {
  assertRetryClassifierContract()
  const args = parseArgs(process.argv.slice(2))
  const executable = chromeExecutable()
  if (!executable) throw new Error('Chrome was not found. Set CHROME_PATH to Chrome or Chromium.')
  if (typeof WebSocket === 'undefined') throw new Error('This verifier requires a Node runtime with WebSocket support.')

  const results = []
  for (const file of args.files) results.push(await inspectArtifact(executable, file))
  if (args.json) console.log(JSON.stringify(results, null, 2))
  else {
    for (const result of results) printResult(result)
    const failures = results.filter((result) => !result.passed)
    console.log(
      failures.length === 0
        ? `Airlock Zero automated guard passed for ${results.length} artifact(s); human review evidence remains explicitly listed.`
        : `Airlock Zero automated guard rejected ${failures.length}/${results.length} artifact(s).`,
    )
  }
  const exitCode = results.some((result) => !result.passed) ? 1 : 0
  process.exitCode = exitCode
  if (encounteredBrowserTimeout) {
    // A timed-out CDP command can leave Node's WebSocket implementation in a
    // closing state after Chrome has already exited. Drain output first, then
    // arm a conditional watchdog only for that known cleanup edge case.
    await Promise.all([
      new Promise((resolve) => process.stdout.write('', resolve)),
      new Promise((resolve) => process.stderr.write('', resolve)),
    ])
    setTimeout(() => process.exit(exitCode), 1_000).unref()
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
