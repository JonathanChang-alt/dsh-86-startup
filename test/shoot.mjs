/* Headless screenshot helper (real time, not virtual time).
 * Usage:
 *   node test/shoot.mjs "file:///.../preview/index.html?auto=full&ui=0" "[2000,6000,10000]"
 * Outputs /tmp/e86-shot-<ms>.png by default.
 */
import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'

const EDGE = process.env.EDGE || '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'
const url = process.argv[2]
const times = JSON.parse(process.argv[3] || '[3000, 8000]')
const outPrefix = process.argv[4] || '/tmp/e86-shot'
const width = Number(process.env.W || 1600)
const height = Number(process.env.H || 1000)
const port = Number(process.env.PORT || 9333)

if (!url) {
  console.error('usage: node test/shoot.mjs <url> "[ms,...]" [outPrefix]')
  process.exit(1)
}

const profile = `/tmp/e86-cdp-${process.pid}`
const child = spawn(EDGE, [
  '--headless=new',
  '--disable-gpu',
  '--hide-scrollbars',
  '--no-first-run',
  '--no-default-browser-check',
  `--window-size=${width},${height}`,
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${profile}`,
  'about:blank'
], { stdio: 'ignore' })

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)) }

async function waitForDevtools() {
  for (let i = 0; i < 100; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/json/list`)
      const list = await r.json()
      const page = list.find((t) => t.type === 'page' && t.webSocketDebuggerUrl)
      if (page) return page.webSocketDebuggerUrl
    } catch (e) { /* not up yet */ }
    await sleep(150)
  }
  throw new Error('devtools did not start')
}

async function main() {
  const wsUrl = await waitForDevtools()
  const ws = new WebSocket(wsUrl)
  let nextId = 1
  const pending = new Map()
  await new Promise((resolve, reject) => {
    ws.onopen = resolve
    ws.onerror = reject
  })
  ws.onmessage = (ev) => {
    let msg
    try { msg = JSON.parse(ev.data) } catch (e) { return }
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg)
      pending.delete(msg.id)
    }
  }
  function send(method, params = {}) {
    const id = nextId++
    ws.send(JSON.stringify({ id, method, params }))
    return new Promise((resolve) => pending.set(id, resolve))
  }

  await send('Page.enable')
  await send('Runtime.enable')
  await send('Page.addScriptToEvaluateOnNewDocument', {
    source: "window.__e86errors=[];addEventListener('error',function(e){window.__e86errors.push(String(e.message))});addEventListener('unhandledrejection',function(e){window.__e86errors.push('rejection:'+e.reason)});"
  })
  await send('Emulation.setDeviceMetricsOverride', {
    width, height, deviceScaleFactor: 1, mobile: false
  })

  /* Navigate after the CDP session is up, so the capture clock and the page
     clock start together (launching with the URL loses 0.5-1 s to startup). */
  await send('Page.navigate', { url })
  await sleep(350)

  const start = Date.now()
  for (const t of times) {
    const left = t - (Date.now() - start)
    if (left > 0) await sleep(left)
    const res = await send('Page.captureScreenshot', { format: 'png', fromSurface: true })
    if (!res.result || !res.result.data) {
      console.error('capture failed at', t, res.error)
      continue
    }
    const file = `${outPrefix}-${t}.png`
    await fs.writeFile(file, Buffer.from(res.result.data, 'base64'))
    console.log('saved', file)
  }

  if (process.env.EVAL) {
    const r = await send('Runtime.evaluate', { expression: process.env.EVAL, returnByValue: true })
    console.log('EVAL', JSON.stringify(r.result && r.result.result && r.result.result.value))
  }

  ws.close()
  child.kill('SIGKILL')
  await fs.rm(profile, { recursive: true, force: true }).catch(() => {})
}

main().catch(async (err) => {
  console.error(err)
  child.kill('SIGKILL')
  process.exit(1)
})
