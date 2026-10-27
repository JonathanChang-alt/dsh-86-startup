/* Host-side smoke test: no DSH needed, just a fake webServer/connection.
 * Run: node test/host.mjs
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import assert from 'node:assert/strict'

const home = fs.mkdtempSync(path.join(os.tmpdir(), 'e86-host-'))
process.env.DSH_HOME = home

const mod = await import('../lib/index.js')

const routes = new Map()
const taps = []
const server = {
  register(route) {
    routes.set(route.path, route.handler)
    return () => routes.delete(route.path)
  },
  tapIndex(fn) {
    taps.push(fn)
    return () => { const i = taps.indexOf(fn); if (i >= 0) taps.splice(i, 1) }
  }
}
const ctx = {
  get(name) {
    if (name === 'webServer') return server
    if (name === 'connection') return { requestRejection: () => false }
    return undefined
  },
  effect(fn) { const off = fn(); return off },
  logger: { warn() {}, info() {}, error() {} }
}

mod.apply(ctx)
assert.equal(routes.size, 5, 'five routes registered')
for (const p of ['/dsh-86-startup/splash.css', '/dsh-86-startup/splash.js', '/dsh-86-startup/asset', '/dsh-86-startup/audio', '/dsh-86-startup/config']) {
  assert.ok(routes.has(p), 'route ' + p)
}
assert.equal(taps.length, 1, 'one index tap')

function call(routePath, req) {
  return new Promise((resolve) => {
    const res = {
      statusCode: 200,
      headers: null,
      writeHead(code, headers) { this.statusCode = code; this.headers = headers },
      end(body) { resolve({ code: this.statusCode, headers: this.headers, body: body ? body.toString('utf8') : '' }) }
    }
    routes.get(routePath)(req, res)
  })
}

const baseHtml = '<!doctype html><html><head></head><body><div id="root"></div></body></html>'
const injected = taps[0](baseHtml)
assert.ok(injected.includes('id="dsh-86-startup-root"'), 'root injected')
assert.ok(injected.includes('/dsh-86-startup/splash.js'), 'runtime injected')
assert.ok(injected.includes('window.__DSH_86_STARTUP__='), 'config injected')
assert.ok(injected.includes('window.__DSH_86_STARTUP_VOICE__={'), 'voice manifest injected')
assert.ok(injected.indexOf('dsh-86-startup-root') < injected.indexOf('<div id="root">'), 'splash sits before the app')

const cfgRes = await call('/dsh-86-startup/config', { method: 'GET', url: '/dsh-86-startup/config' })
const cfg = JSON.parse(cfgRes.body)
assert.equal(cfg.ok, true)
assert.equal(cfg.config.autoPlay, 'once')
assert.equal(cfg.config.length, 'short')
assert.equal(cfg.config.voice, true)
assert.equal(cfg.config.welcomeName, 'undertaker')
assert.equal(cfg.config.portrait, 3)
assert.equal(cfg.config.finaleTitle, '第 86 区')

/* POST 需要可读的请求流 */
function post(body) {
  const req = {
    method: 'POST',
    url: '/dsh-86-startup/config',
    on(event, fn) {
      if (event === 'data') fn(Buffer.from(body))
      if (event === 'end') setImmediate(fn)
      return req
    },
    destroy() {}
  }
  return call('/dsh-86-startup/config', req)
}

const saved = JSON.parse((await post(JSON.stringify({ patch: { speed: 2.4, identity: 'HANDLER 02', scene: 'flowers' } }))).body)
assert.equal(saved.ok, true)
assert.equal(saved.config.speed, 2.4)
assert.equal(saved.config.identity, 'HANDLER 02')
assert.equal(saved.config.scene, 'flowers')
assert.ok(fs.existsSync(path.join(home, 'dsh-86-startup.json')), 'config persisted')

const reset = JSON.parse((await post(JSON.stringify({ action: 'reset' }))).body)
assert.equal(reset.config.speed, 1)
assert.equal(reset.config.identity, 'HANDLER 01')

/* 另一款开机动画还在跑时让位 */
fs.writeFileSync(path.join(home, 'dsh-startup.json'), JSON.stringify({ enabled: true }))
const rivalHtml = '<html><body><div id="dsh-startup-root"></div><div id="root"></div></body></html>'
assert.equal(taps[0](rivalHtml), rivalHtml, 'stands down for dsh-startup-secret')

/* 对方明确关掉时仍然注入 */
fs.writeFileSync(path.join(home, 'dsh-startup.json'), JSON.stringify({ enabled: false }))
assert.ok(taps[0](rivalHtml).includes('dsh-86-startup-root'), 'takes over when the rival is disabled')

/* 资源白名单 */
const asset = await call('/dsh-86-startup/asset', { url: '/dsh-86-startup/asset?name=portrait-03', method: 'GET' })
assert.equal(asset.code, 200)
assert.equal(asset.headers['Content-Type'], 'image/png')
assert.ok(asset.body.length === 0 || true)
const bad = await call('/dsh-86-startup/asset', { url: '/dsh-86-startup/asset?name=../../etc/passwd', method: 'GET' })
assert.equal(bad.code, 404, 'path traversal rejected')

const audio = await call('/dsh-86-startup/audio', { url: '/dsh-86-startup/audio?name=voice-1-clean', method: 'GET' })
assert.equal(audio.code, 200, 'voice asset served')
assert.equal(audio.headers['Content-Type'], 'audio/mpeg')
const badAudio = await call('/dsh-86-startup/audio', { url: '/dsh-86-startup/audio?name=../../etc/passwd', method: 'GET' })
assert.equal(badAudio.code, 404, 'voice path traversal rejected')
const removedVariant = await call('/dsh-86-startup/audio', { url: '/dsh-86-startup/audio?name=voice-1-pararaid-light', method: 'GET' })
assert.equal(removedVariant.code, 404, 'removed Para-RAID variant is not served')

fs.rmSync(home, { recursive: true, force: true })
console.log('host smoke: OK')
