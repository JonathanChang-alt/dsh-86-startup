/* ============================================================================
 * dsh-86-startup — Host half
 * ----------------------------------------------------------------------------
 * 86 -不存在的战区- 主题启动动画。在 React 应用挂载之前接管首屏：
 *
 *   1) 往 index.html 注入关键样式 + 黑幕兜底 + 配置 + 运行时
 *   2) 提供 /dsh-86-startup/{splash.css,splash.js,asset,config} 路由
 *   3) 配置持久化到 ~/.dsh/dsh-86-startup.json（设置页经 /config 读写）
 *
 * 与 dsh-startup-secret 共存时的处理：如果对方已经注入（#dsh-startup-root
 * 且它自己的配置仍是启用状态），本插件直接让位，不叠两层开机动画。
 * ========================================================================== */

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DSH_HOME = process.env.DSH_HOME || path.join(os.homedir(), '.dsh')
const CONFIG_FILE = path.join(DSH_HOME, 'dsh-86-startup.json')
const RIVAL_CONFIG = path.join(DSH_HOME, 'dsh-startup.json')

const NS = 'dsh-86-startup'
const ROUTE_BASE = '/dsh-86-startup'

const PLUGIN_VERSION = (() => {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(PACKAGE_ROOT, 'package.json'), 'utf8'))
    const v = String(pkg.version || '').trim()
    return v || '0.0.0'
  } catch (err) {
    return '0.0.0'
  }
})()

/* 默认配置：字段与 lib/splash.js 的 DEFAULTS 一一对应。 */
const DEFAULTS = {
  enabled: true,
  mode: 'session',          // always | session | daily
  length: 'short',          // short | long
  autoPlay: 'once',         // full=一路到底 / once=点一次进入 / off=前两步都要确认
  speed: 1,
  allowSkip: true,
  sound: true,
  soundVolume: 0.45,
  voice: true,
  voiceVolume: 0.8,
  identity: 'HANDLER 01',
  handlerName: 'VLADILENA MILIZÉ',
  handlerNameZh: '芙拉蒂蕾娜·米利杰',
  clearance: '3',
  unit: 'M1A4 JUGGERNAUT',
  squad: 'SPEARHEAD',
  welcomeName: 'undertaker',
  scene: 'rail',            // rail | flowers | black
  portrait: 3,              // 0..4；-1 = 不显示
  showHud: true,
  showHex: true,
  showGrid: true,
  finaleTitle: '第 86 区',
  finaleSub: '不存在的战区',
  finaleEn: 'THE NONEXISTENT WAR ZONE',
  footer: 'ZONE 86 // PARA-RAID'
}

const TEXT_KEYS = [
  'identity', 'handlerName', 'handlerNameZh', 'clearance', 'unit', 'squad', 'welcomeName',
  'finaleTitle', 'finaleSub', 'finaleEn', 'footer'
]
const ENUMS = {
  mode: ['always', 'session', 'daily'],
  length: ['short', 'long'],
  autoPlay: ['full', 'once', 'off'],
  scene: ['rail', 'flowers', 'black']
}
const BOOL_KEYS = ['enabled', 'allowSkip', 'sound', 'voice', 'showHud', 'showHex', 'showGrid']
const RANGES = {
  speed: [0.35, 3],
  soundVolume: [0, 1],
  voiceVolume: [0, 1]
}

function normalize(input) {
  const out = { ...DEFAULTS }
  const src = input && typeof input === 'object' ? input : {}
  for (const key of Object.keys(DEFAULTS)) {
    if (!(key in src) || src[key] === undefined || src[key] === null) continue
    const value = src[key]
    if (BOOL_KEYS.includes(key)) {
      out[key] = value === true || value === 'true' || value === 1 || value === '1'
    } else if (ENUMS[key]) {
      out[key] = ENUMS[key].includes(value) ? value : DEFAULTS[key]
    } else if (RANGES[key]) {
      const [lo, hi] = RANGES[key]
      const n = Number(value)
      out[key] = Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : DEFAULTS[key]
    } else if (TEXT_KEYS.includes(key)) {
      out[key] = String(value).slice(0, 64)
    } else {
      out[key] = value
    }
  }
  const pi = parseInt(out.portrait, 10)
  out.portrait = Number.isFinite(pi) ? Math.min(4, Math.max(-1, pi)) : DEFAULTS.portrait
  if (!String(out.identity).trim()) out.identity = DEFAULTS.identity
  if (!String(out.handlerName).trim()) out.handlerName = DEFAULTS.handlerName
  if (!String(out.finaleTitle).trim()) out.finaleTitle = DEFAULTS.finaleTitle
  if (!String(out.welcomeName).trim()) out.welcomeName = DEFAULTS.welcomeName
  return out
}

function readConfig() {
  try {
    return normalize(JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')))
  } catch (err) {
    return { ...DEFAULTS }
  }
}

function writeConfig(next) {
  const cfg = normalize(next)
  fs.mkdirSync(path.dirname(CONFIG_FILE), { recursive: true })
  const tmp = CONFIG_FILE + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(cfg, null, 2), 'utf8')
  fs.renameSync(tmp, CONFIG_FILE)
  return cfg
}

/** 静态文件按 mtime 缓存，改完插件刷新页面即生效。 */
function makeReader(rel) {
  let cache = null
  return function read() {
    const file = path.join(PACKAGE_ROOT, rel)
    try {
      const st = fs.statSync(file)
      if (!cache || cache.mtimeMs !== st.mtimeMs) {
        cache = { mtimeMs: st.mtimeMs, text: fs.readFileSync(file, 'utf8') }
      }
      return cache.text
    } catch (err) {
      return ''
    }
  }
}

const readSplashCss = makeReader('lib/splash.css')
const readSplashJs = makeReader('lib/splash.js')

const VOICE_DIR = path.join(PACKAGE_ROOT, 'assets/voice')
const VOICE_NAME = /^voice-[1-6]-clean$/

/** 配音清单由 tools/build_voice_assets.py 生成；没有就静音。 */
function readVoiceManifest() {
  try {
    const raw = fs.readFileSync(path.join(VOICE_DIR, 'manifest.json'), 'utf8')
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch (err) {
    return null
  }
}

/* 图片资源白名单：只允许这几张，不接受任意路径。 */
const ASSETS = {
  'background-rail': { file: 'assets/background.jpg', type: 'image/jpeg' },
  'background-flowers': { file: 'assets/background-flowers.jpg', type: 'image/jpeg' },
  lycoris: { file: 'assets/lycoris.png', type: 'image/png' },
  'portrait-00': { file: 'assets/portraits/00.png', type: 'image/png' },
  'portrait-01': { file: 'assets/portraits/01.png', type: 'image/png' },
  'portrait-02': { file: 'assets/portraits/02.png', type: 'image/png' },
  'portrait-03': { file: 'assets/portraits/03.png', type: 'image/png' },
  'portrait-04': { file: 'assets/portraits/04.png', type: 'image/png' }
}

/** 内联脚本里绝对不能出现 `</script>`。 */
function safeJson(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c').replace(/\u2028|\u2029/g, '')
}

const CRITICAL_CSS = [
  'html.e86b-lock,html.e86b-lock body{overflow:hidden!important}',
  '#dsh-86-startup-root.e86b-boot{position:fixed;inset:0;z-index:2147483600;background:#02060c}'
].join('')

const BOOTSTRAP_JS = `(function(){try{
var c=window.__DSH_86_STARTUP__||{};
var root=document.getElementById('dsh-86-startup-root');
var off=!c.enabled;
if(!off&&c.mode==='session'&&sessionStorage.getItem('dsh-86-startup:shown')==='1')off=true;
if(!off&&c.mode==='daily'&&localStorage.getItem('dsh-86-startup:day')===new Date().toISOString().slice(0,10))off=true;
if(off){window.__DSH_86_STARTUP_SKIP__=true;if(root&&root.parentNode)root.parentNode.removeChild(root);}
else{document.documentElement.classList.add('e86b-lock');setTimeout(function(){try{var r=document.getElementById('dsh-86-startup-root');if(r&&r.className&&r.className.indexOf('e86b-boot')!==-1){if(r.parentNode)r.parentNode.removeChild(r);document.documentElement.classList.remove('e86b-lock');if(document.body)document.body.style.overflow='';window.__DSH_86_STARTUP_FAILED__=true;}}catch(e){}},12000);}
}catch(e){} })()`

const name = NS
const inject = ['webServer', 'connection']

function resolveWebServer(ctx) {
  try {
    const viaGet = typeof ctx.get === 'function' ? ctx.get('webServer') : undefined
    if (viaGet) return viaGet
  } catch (err) { /* 取不到就当没有 */ }
  return ctx.webServer
}

function hasRoutes(server) {
  return !!server && typeof server.register === 'function' && typeof server.tapIndex === 'function'
}

/** 另一款开机动画（dsh-startup-secret）是否仍在工作。
 *  两个都开着会叠两层黑幕，所以宁可让位，也不抢。 */
function rivalSplashActive(html) {
  if (!html || html.indexOf('id="dsh-startup-root"') === -1) return false
  try {
    const rival = JSON.parse(fs.readFileSync(RIVAL_CONFIG, 'utf8'))
    return rival.enabled !== false
  } catch (err) {
    /* 有 root 却读不到配置：保守当成在跑 */
    return true
  }
}

function apply(ctx) {
  const disposers = []
  const webServer = resolveWebServer(ctx)

  if (!hasRoutes(webServer)) {
    try {
      ctx.logger?.warn?.(
        '[' + NS + '] 当前 profile 没有可用的 webServer；Host 半侧跳过注入，' +
        '改由浏览器半侧自举（lib/client.js 的 selfBoot）。'
      )
    } catch (err) { /* noop */ }
    return
  }

  function rejected(req, res) {
    try {
      const conn = (typeof ctx.get === 'function' ? ctx.get('connection') : undefined) || ctx.connection
      if (!conn || typeof conn.requestRejection !== 'function') return false
      const code = conn.requestRejection(req)
      if (code === undefined || code === null || code === false) return false
      res.statusCode = typeof code === 'number' ? code : 403
      res.end()
      return true
    } catch (err) {
      return false
    }
  }

  function registerRoute(route) {
    const inner = route && route.handler
    const wrapped = Object.assign({}, route, {
      handler: async (req, res) => {
        if (rejected(req, res)) return
        return inner(req, res)
      }
    })
    return webServer.register(wrapped)
  }

  function sendJson(res, code, payload) {
    const body = Buffer.from(JSON.stringify(payload), 'utf8')
    res.writeHead(code, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'Content-Length': String(body.length)
    })
    res.end(body)
  }

  function readBody(req, limit = 64 * 1024) {
    return new Promise((resolve) => {
      let size = 0
      const chunks = []
      req.on('data', (c) => {
        size += c.length
        if (size > limit) {
          req.destroy()
          resolve('')
          return
        }
        chunks.push(c)
      })
      req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
      req.on('error', () => resolve(''))
    })
  }

  function sendText(res, type, text) {
    const body = Buffer.from(text, 'utf8')
    res.writeHead(200, {
      'Content-Type': type,
      'Cache-Control': 'no-store',
      'Content-Length': String(body.length)
    })
    res.end(body)
  }

  disposers.push(registerRoute({
    kind: 'exact',
    path: ROUTE_BASE + '/splash.css',
    handler: (req, res) => sendText(res, 'text/css; charset=utf-8', readSplashCss())
  }))

  disposers.push(registerRoute({
    kind: 'exact',
    path: ROUTE_BASE + '/splash.js',
    handler: (req, res) => sendText(res, 'application/javascript; charset=utf-8', readSplashJs())
  }))

  disposers.push(registerRoute({
    kind: 'exact',
    path: ROUTE_BASE + '/asset',
    handler: (req, res) => {
      const raw = String(req.url || '')
      const mark = raw.indexOf('?')
      let key = ''
      if (mark >= 0) {
        for (const pair of raw.slice(mark + 1).split('#')[0].split('&')) {
          const eq = pair.indexOf('=')
          if ((eq === -1 ? pair : pair.slice(0, eq)) === 'name') {
            key = decodeURIComponent(eq === -1 ? '' : pair.slice(eq + 1))
            break
          }
        }
      }
      const asset = ASSETS[key]
      if (!asset) { sendJson(res, 404, { ok: false, error: 'unknown asset' }); return }
      try {
        const file = path.join(PACKAGE_ROOT, asset.file)
        const body = fs.readFileSync(file)
        res.writeHead(200, {
          'Content-Type': asset.type,
          'Cache-Control': 'public, max-age=3600',
          'Content-Length': String(body.length)
        })
        res.end(body)
      } catch (err) {
        sendJson(res, 404, { ok: false, error: 'missing asset' })
      }
    }
  }))

  disposers.push(registerRoute({
    kind: 'exact',
    path: ROUTE_BASE + '/audio',
    handler: (req, res) => {
      const raw = String(req.url || '')
      const mark = raw.indexOf('?')
      let key = ''
      if (mark >= 0) {
        for (const pair of raw.slice(mark + 1).split('#')[0].split('&')) {
          const eq = pair.indexOf('=')
          if ((eq === -1 ? pair : pair.slice(0, eq)) === 'name') {
            key = decodeURIComponent(eq === -1 ? '' : pair.slice(eq + 1))
            break
          }
        }
      }
      if (!VOICE_NAME.test(key)) { sendJson(res, 404, { ok: false, error: 'unknown voice' }); return }
      try {
        const body = fs.readFileSync(path.join(VOICE_DIR, key + '.mp3'))
        res.writeHead(200, {
          'Content-Type': 'audio/mpeg',
          'Cache-Control': 'no-store',
          'Content-Length': String(body.length)
        })
        res.end(body)
      } catch (err) {
        sendJson(res, 404, { ok: false, error: 'missing voice' })
      }
    }
  }))

  disposers.push(registerRoute({
    kind: 'exact',
    path: ROUTE_BASE + '/config',
    handler: async (req, res) => {
      const method = (req.method || 'GET').toUpperCase()
      if (method === 'GET') {
        sendJson(res, 200, {
          ok: true, version: PLUGIN_VERSION, config: readConfig(), defaults: DEFAULTS, file: CONFIG_FILE
        })
        return
      }
      if (method !== 'POST') {
        sendJson(res, 405, { ok: false, error: 'method not allowed' })
        return
      }
      const text = await readBody(req)
      let payload = {}
      try {
        payload = text ? JSON.parse(text) : {}
      } catch (err) {
        sendJson(res, 400, { ok: false, error: 'invalid json' })
        return
      }
      try {
        if (payload && payload.action === 'reset') {
          const cfgNow = writeConfig(DEFAULTS)
          sendJson(res, 200, { ok: true, version: PLUGIN_VERSION, config: cfgNow, defaults: DEFAULTS })
          return
        }
        const current = readConfig()
        const patch = payload && typeof payload.patch === 'object' && payload.patch ? payload.patch : payload
        const cfgNow = writeConfig({ ...current, ...patch })
        sendJson(res, 200, { ok: true, version: PLUGIN_VERSION, config: cfgNow, defaults: DEFAULTS })
      } catch (err) {
        sendJson(res, 500, { ok: false, error: String((err && err.message) || err) })
      }
    }
  }))

  disposers.push(webServer.tapIndex((html) => {
    if (!html || html.includes(ROUTE_BASE + '/splash.js')) return html
    /* 已经有一层开机动画在跑：让位，绝不叠两层。 */
    if (rivalSplashActive(html)) {
      try {
        ctx.logger?.warn?.(
          '[' + NS + '] 检测到 dsh-startup-secret 仍在启用，本次让位（不注入第二层黑幕）。' +
          '想用第 86 区开机动画，请把它从 dsh.profile.bundles 里移出，或在其设置里关掉。'
        )
      } catch (err) { /* noop */ }
      return html
    }
    const cfg = readConfig()
    const head =
      '<link rel="stylesheet" href="' + ROUTE_BASE + '/splash.css">' +
      '<style id="dsh-86-startup-critical">' + CRITICAL_CSS + '</style>'
    const body =
      '<div id="dsh-86-startup-root" class="e86b-root e86b-boot"></div>' +
      '<script>window.__DSH_86_STARTUP_BOOT__="index";' +
      'window.__DSH_86_STARTUP_VERSION__=' + safeJson(PLUGIN_VERSION) + ';' +
      'window.__DSH_86_STARTUP_CONFIG_URL__=' + safeJson(ROUTE_BASE + '/config') + ';' +
      'window.__DSH_86_STARTUP_VOICE__=' + safeJson(readVoiceManifest()) + ';' +
      'window.__DSH_86_STARTUP__=' + safeJson(cfg) + ';' + BOOTSTRAP_JS + '</script>' +
      '<script defer src="' + ROUTE_BASE + '/splash.js"></script>'

    let out = html
    if (out.includes('</head>')) out = out.replace('</head>', head + '</head>')
    else out = head + out
    if (out.includes('<body>')) out = out.replace('<body>', '<body>' + body)
    else if (out.includes('</body>')) out = out.replace('</body>', body + '</body>')
    else out = out + body
    return out
  }))

  ctx.effect(() => () => {
    for (const dispose of disposers) {
      try { dispose() } catch (err) { /* noop */ }
    }
  })
}

export { apply, inject, name }
