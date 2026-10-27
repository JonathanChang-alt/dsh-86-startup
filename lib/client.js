/**
 * dsh-86-startup — 浏览器半侧（设置页「启动动画 · 第 86 区」）
 * ----------------------------------------------------------------------------
 * 以 dsh.client bundle 格式加载（手写 ModuleLoader bundle，无需构建）：
 * 在 DSH 设置里注册一个 `settings.section`，用来改开机序列的身份、文案、
 * 背景、肖像、速度与声音。
 *
 * 数据不走 settings 命名空间，而是走 Host 半侧自带的 HTTP API
 * （GET/POST /dsh-86-startup/config），少受 dsh-settings 版本变更影响。
 * 注册 id 必须等于 loader entry 名（dsh-86-startup）。
 */
window.__ModuleLoader__.load({
  id: 'dsh-86-startup',
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })

    var react = require('react')
    var h = react.createElement

    var API = '/dsh-86-startup/config'
    var ROOT_ID = 'dsh-86-startup-root'
    var ROUTE = '/dsh-86-startup'

    var VERSION = (() => {
      try { return String(window.__DSH_86_STARTUP_VERSION__ || '0.0.0') } catch (e) { return '0.0.0' }
    })()

    /* ── CSS ─────────────────────────────────────────────────────────────── */
    var CSS = [
      '.__x86_root{max-width:660px;display:flex;flex-direction:column;gap:14px;font-size:13px;color:var(--dsw-alias-label-primary)}',
      '.__x86_head{display:flex;align-items:center;gap:12px;padding-bottom:12px;border-bottom:1px solid var(--dsw-alias-border-l2)}',
      '.__x86_mark{font-family:"Arial Black","Helvetica Neue",sans-serif;font-size:26px;line-height:.85;letter-spacing:-.05em;color:#59e0ff;text-shadow:0 0 18px rgba(89,224,255,.45)}',
      '.__x86_headText{display:flex;flex-direction:column;gap:2px}',
      '.__x86_title{font-size:13px;font-weight:600;letter-spacing:.08em}',
      '.__x86_sub{font-family:ui-monospace,Consolas,monospace;font-size:10px;letter-spacing:.14em;color:var(--dsw-alias-label-tertiary)}',
      '.__x86_version{margin-left:auto;font-family:ui-monospace,Consolas,monospace;font-size:11px;letter-spacing:.06em;color:var(--dsw-alias-label-tertiary)}',
      '.__x86_group{border:1px solid var(--dsw-alias-border-l2);border-radius:10px;padding:12px 14px;display:flex;flex-direction:column;gap:12px}',
      '.__x86_groupTitle{font-family:ui-monospace,Consolas,monospace;font-size:10px;font-weight:600;letter-spacing:.18em;color:#3fb6ff;text-transform:uppercase;display:flex;align-items:center;gap:8px}',
      '.__x86_groupTitle::after{content:"";flex:1;height:1px;background:linear-gradient(90deg,rgba(63,182,255,.35),transparent)}',
      '.__x86_field{display:flex;flex-direction:column;gap:5px}',
      '.__x86_label{font-size:12px;font-weight:600;color:var(--dsw-alias-label-primary)}',
      '.__x86_hint{font-size:11px;line-height:1.6;color:var(--dsw-alias-label-tertiary)}',
      '.__x86_row{display:flex;align-items:center;gap:10px;flex-wrap:wrap}',
      '.__x86_input{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);font:inherit;color:var(--dsw-alias-label-primary);border-radius:8px;padding:6px 10px;font-size:13px;box-sizing:border-box;width:100%;outline:none}',
      '.__x86_input:focus{border-color:#3fb6ff;box-shadow:0 0 0 2px rgba(63,182,255,.16)}',
      '.__x86_mono{font-family:ui-monospace,Consolas,monospace;font-size:12px;letter-spacing:.06em}',
      '.__x86_select{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-primary);border-radius:8px;padding:6px 8px;font:inherit;font-size:13px;min-width:180px}',
      '.__x86_check{display:flex;align-items:flex-start;gap:8px;cursor:pointer}',
      '.__x86_check input{margin-top:2px;accent-color:#3fb6ff}',
      '.__x86_checkText{display:flex;flex-direction:column;gap:2px}',
      '.__x86_two{display:grid;grid-template-columns:1fr 1fr;gap:10px}',
      '.__x86_three{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px}',
      '.__x86_range{display:flex;align-items:center;gap:10px}',
      '.__x86_range input[type=range]{flex:1;accent-color:#3fb6ff}',
      '.__x86_val{font-family:ui-monospace,Consolas,monospace;font-size:11px;min-width:44px;text-align:right;color:var(--dsw-alias-label-tertiary)}',
      '.__x86_actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:2px}',
      '.__x86_btn{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-primary);border-radius:8px;padding:6px 14px;font:inherit;font-size:13px;cursor:pointer}',
      '.__x86_btn:hover:not(:disabled){border-color:#3fb6ff}',
      '.__x86_btn:disabled{opacity:.5;cursor:default}',
      '.__x86_btnPrimary{border-color:#2a86c4;background:linear-gradient(180deg,#2f8fd0,#1d6fa8);color:#fff;box-shadow:0 0 18px rgba(63,182,255,.22)}',
      '.__x86_btnPrimary:hover:not(:disabled){border-color:#59e0ff;box-shadow:0 0 26px rgba(89,224,255,.4)}',
      '.__x86_status{font-size:12px;color:var(--dsw-alias-label-tertiary)}',
      '.__x86_ok{font-size:12px;color:#3fb6ff}',
      '.__x86_err{font-size:12px;color:var(--dsw-alias-state-error-primary,#f85149)}',
      '.__x86_preview{margin-top:2px;border:1px dashed var(--dsw-alias-border-l2);border-radius:10px;padding:10px 12px;display:flex;align-items:center;justify-content:space-between;gap:12px}',
      '.__x86_previewText{font-size:12px;color:var(--dsw-alias-label-tertiary);line-height:1.55}',
      '.__x86_file{font-family:ui-monospace,Consolas,monospace;font-size:10px;letter-spacing:.03em;margin-top:4px;opacity:.7;word-break:break-all}',
      '.__x86_note{font-size:11px;line-height:1.65;color:var(--dsw-alias-label-tertiary);border-left:2px solid rgba(63,182,255,.5);padding-left:10px}'
    ].join('')

    var tagId = 'dsh-86-startup/settings.css'
    if (typeof document !== 'undefined' && document.querySelector('style[data-plugin-css="' + tagId + '"]') === null) {
      var tag = document.createElement('style')
      tag.dataset.plugin = 'dsh-86-startup'
      tag.dataset.pluginCss = tagId
      tag.textContent = CSS
      document.head.appendChild(tag)
    }

    /* ── 表单原子 ────────────────────────────────────────────────────────── */
    function Field(props) {
      return h('div', { className: '__x86_field' },
        h('label', { className: '__x86_label' }, props.label),
        props.children,
        props.hint ? h('div', { className: '__x86_hint' }, props.hint) : null
      )
    }

    function TextInput(props) {
      return h('input', {
        className: '__x86_input' + (props.mono ? ' __x86_mono' : ''),
        type: props.type || 'text',
        value: props.value == null ? '' : String(props.value),
        placeholder: props.placeholder || '',
        maxLength: props.maxLength || 64,
        spellCheck: false,
        onChange: (e) => props.onChange(e.target.value)
      })
    }

    function Select(props) {
      return h('select', {
        className: '__x86_select',
        value: props.value,
        onChange: (e) => props.onChange(e.target.value)
      }, props.options.map((o) => h('option', { key: String(o[0]), value: String(o[0]) }, o[1])))
    }

    function Check(props) {
      return h('label', { className: '__x86_check' },
        h('input', {
          type: 'checkbox',
          checked: !!props.checked,
          onChange: (e) => props.onChange(e.target.checked)
        }),
        h('span', { className: '__x86_checkText' },
          h('span', null, props.label),
          props.hint ? h('span', { className: '__x86_hint' }, props.hint) : null
        )
      )
    }

    function Range(props) {
      return h('div', { className: '__x86_range' },
        h('input', {
          type: 'range',
          min: props.min,
          max: props.max,
          step: props.step,
          value: props.value,
          onChange: (e) => props.onChange(Number(e.target.value))
        }),
        h('span', { className: '__x86_val' }, props.display == null ? props.value : props.display)
      )
    }

    /* ── 选择集 ──────────────────────────────────────────────────────────── */
    var MODES = [
      ['session', '每次会话一次'],
      ['always', '每次刷新都播'],
      ['daily', '每天一次']
    ]
    var AUTOPLAY = [
      ['full', '完全自动播放'],
      ['once', '点击一次进入'],
      ['off', '前两步都要确认']
    ]
    var LENGTHS = [
      ['short', '短版 · 约 19 秒'],
      ['long', '长版 · 约 37 秒']
    ]
    var SCENES = [
      ['rail', '铁轨夜景'],
      ['flowers', '花海'],
      ['black', '纯黑']
    ]
    var PORTRAITS = [
      [-1, '不显示'],
      [0, '00 · 原图'],
      [1, '01 · 素颜'],
      [2, '02 · 特写'],
      [3, '03 · 军帽'],
      [4, '04 · 侧光']
    ]

    /* ── 设置面板 ────────────────────────────────────────────────────────── */
    function Panel() {
      var [draft, setDraft] = react.useState(null)
      var [defaults, setDefaults] = react.useState(null)
      var [file, setFile] = react.useState('')
      var [version, setVersion] = react.useState(VERSION)
      var [error, setError] = react.useState(null)
      var [notice, setNotice] = react.useState(null)
      var [busy, setBusy] = react.useState(false)

      function set(key, value) {
        setDraft((prev) => (prev ? Object.assign({}, prev, { [key]: value }) : prev))
      }

      function load() {
        setError(null)
        return fetch(API, { headers: { Accept: 'application/json' }, cache: 'no-store' })
          .then((r) => r.json())
          .then((j) => {
            if (!j || j.ok !== true) throw new Error((j && j.error) || '配置读取失败')
            setDraft(j.config)
            setDefaults(j.defaults)
            setFile(j.file || '')
            if (j.version) setVersion(String(j.version))
          })
          .catch((e) => setError('读取配置失败：' + e.message))
      }

      react.useEffect(() => { load() }, [])

      function save() {
        if (!draft || busy) return Promise.resolve(false)
        setBusy(true)
        setError(null)
        setNotice(null)
        return fetch(API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ patch: draft })
        })
          .then((r) => r.json())
          .then((j) => {
            if (!j || j.ok !== true) throw new Error((j && j.error) || '保存失败')
            setDraft(j.config)
            setNotice('已保存')
            return true
          })
          .catch((e) => {
            setError('保存失败：' + e.message)
            return false
          })
          .finally(() => setBusy(false))
      }

      function reset() {
        if (busy) return
        setBusy(true)
        setError(null)
        setNotice(null)
        fetch(API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ action: 'reset' })
        })
          .then((r) => r.json())
          .then((j) => {
            if (!j || j.ok !== true) throw new Error((j && j.error) || '重置失败')
            setDraft(j.config)
            setNotice('已恢复默认')
          })
          .catch((e) => setError('重置失败：' + e.message))
          .finally(() => setBusy(false))
      }

      function preview() {
        if (busy) return
        setBusy(true)
        save().then((ok) => {
          setBusy(false)
          if (!ok) return
          /* 先清掉「本会话已播 / 今天已播」，否则刚打开的开关会被旧标记吃掉 */
          try {
            window.sessionStorage.removeItem('dsh-86-startup:shown')
            window.localStorage.removeItem('dsh-86-startup:day')
          } catch (e) { /* 隐私模式 */ }
          try {
            if (window.__DSH_86_STARTUP_API__ && window.__DSH_86_STARTUP_API__.replay) {
              window.__DSH_86_STARTUP_API__.replay()
              return
            }
          } catch (e) { /* 继续走刷新 */ }
          try { window.location.reload() } catch (e) { /* noop */ }
        })
      }

      if (!draft) {
        return h('div', { className: '__x86_root' },
          h('div', { className: '__x86_head' },
            h('div', { className: '__x86_mark' }, '86'),
            h('div', { className: '__x86_headText' },
              h('div', { className: '__x86_title' }, '启动动画 · 第 86 区'),
              h('div', { className: '__x86_sub' }, 'PARA-RAID BOOT SEQUENCE')
            )
          ),
          error
            ? h('div', { className: '__x86_err' }, error)
            : h('div', { className: '__x86_status' }, '正在读取配置…')
        )
      }

      return h('div', { className: '__x86_root' },
        h('div', { className: '__x86_head' },
          h('div', { className: '__x86_mark' }, '86'),
          h('div', { className: '__x86_headText' },
            h('div', { className: '__x86_title' }, '启动动画 · 第 86 区'),
            h('div', { className: '__x86_sub' }, 'PARA-RAID BOOT SEQUENCE')
          ),
          h('div', { className: '__x86_version' }, 'v' + version)
        ),

        h('div', { className: '__x86_note' },
          '冷启动时接管首屏：86 锁标 → 过曝洗白 → 战术底板 → 六步接入序列 → 彼岸花终幕。' +
          '六步里的「接入请求 / 身份核验」是否停下来等你确认，由下面的「自动播放」决定。'
        ),

        /* 播放 */
        h('div', { className: '__x86_group' },
          h('div', { className: '__x86_groupTitle' }, 'PLAYBACK / 播放'),
          h(Check, {
            label: '启用启动动画',
            hint: '关掉后冷启动直接进主界面；设置页仍保留，随时可以再打开。',
            checked: draft.enabled,
            onChange: (v) => set('enabled', v)
          }),
          h('div', { className: '__x86_two' },
            h(Field, { label: '显示模式' },
              h(Select, { value: draft.mode, options: MODES, onChange: (v) => set('mode', v) })),
            h(Field, { label: '自动播放' },
              h(Select, { value: draft.autoPlay, options: AUTOPLAY, onChange: (v) => set('autoPlay', v) }))
          ),
          h(Field, { label: '时长版本', hint: '短版只留 接入 / 神经同步 / 欢迎回来 三幕；长版保留全部六幕。' },
            h(Select, { value: draft.length || 'short', options: LENGTHS, onChange: (v) => set('length', v) })
          ),
          h(Field, { label: '速度', hint: '整段序列的快慢；有 AI 配音时每一步会等它念完，配音最多 1.35×。0.35× 适合录屏。' },
            h(Range, {
              min: 0.35, max: 3, step: 0.05,
              value: draft.speed,
              display: Number(draft.speed).toFixed(2) + '×',
              onChange: (v) => set('speed', v)
            })
          ),
          h(Check, {
            label: '允许跳过',
            hint: '右上角显示 SKIP，Esc 也可以直接揭幕。',
            checked: draft.allowSkip,
            onChange: (v) => set('allowSkip', v)
          })
        ),

        /* 声音 */
        h('div', { className: '__x86_group' },
          h('div', { className: '__x86_groupTitle' }, 'AUDIO / 声音'),
          h(Check, {
            label: '界面音效',
            hint: 'WebAudio 现场合成（提示音、洗白噪声、终幕钟声），不加载任何音频文件。',
            checked: draft.sound,
            onChange: (v) => set('sound', v)
          }),
          h(Field, { label: '音效音量' },
            h(Range, {
              min: 0, max: 1, step: 0.01,
              value: draft.soundVolume,
              display: Math.round(Number(draft.soundVolume) * 100) + '%',
              onChange: (v) => set('soundVolume', v)
            })
          ),
          h(Check, {
            label: '语音播报',
            hint: '播放蕾娜 AI 配音（日语，原始音）；音频加载失败时静音。浏览器首次出声通常需要一次点击。',
            checked: draft.voice,
            onChange: (v) => set('voice', v)
          }),
          h(Field, { label: '语音音量' },
            h(Range, {
              min: 0, max: 1, step: 0.01,
              value: draft.voiceVolume,
              display: Math.round(Number(draft.voiceVolume) * 100) + '%',
              onChange: (v) => set('voiceVolume', v)
            })
          )
        ),

        /* 身份 */
        h('div', { className: '__x86_group' },
          h('div', { className: '__x86_groupTitle' }, 'IDENTITY / 身份'),
          h('div', { className: '__x86_two' },
            h(Field, { label: '呼号 / HANDLER', hint: '顶栏、ID 卡与终幕都用它。' },
              h(TextInput, { mono: true, value: draft.identity, onChange: (v) => set('identity', v) })),
            h(Field, { label: '权限等级' },
              h(TextInput, { mono: true, value: draft.clearance, onChange: (v) => set('clearance', v) }))
          ),
          h(Field, { label: '管制官姓名（英）' },
            h(TextInput, { mono: true, value: draft.handlerName, onChange: (v) => set('handlerName', v) })),
          h(Field, { label: '管制官姓名（中）' },
            h(TextInput, { value: draft.handlerNameZh, onChange: (v) => set('handlerNameZh', v) })),
          h(Field, { label: '终幕称呼', hint: '第 6 步与终幕里「欢迎回来，___」的称呼；身份/呼号仍用上面的 HANDLER。' },
            h(TextInput, { mono: true, value: draft.welcomeName, onChange: (v) => set('welcomeName', v) })),
          h('div', { className: '__x86_two' },
            h(Field, { label: '机体型号' },
              h(TextInput, { mono: true, value: draft.unit, onChange: (v) => set('unit', v) })),
            h(Field, { label: '战队' },
              h(TextInput, { mono: true, value: draft.squad, onChange: (v) => set('squad', v) }))
          )
        ),

        /* 画面 */
        h('div', { className: '__x86_group' },
          h('div', { className: '__x86_groupTitle' }, 'VISUAL / 画面'),
          h('div', { className: '__x86_two' },
            h(Field, { label: '背景场景', hint: '两张图都来自第 86 区皮肤。' },
              h(Select, {
                value: draft.scene,
                options: SCENES.map((s) => [s[0], s[1]]),
                onChange: (v) => set('scene', v)
              })),
            h(Field, { label: '右上 HUD 肖像' },
              h(Select, {
                value: String(draft.portrait),
                options: PORTRAITS.map((p) => [String(p[0]), p[1]]),
                onChange: (v) => set('portrait', Number(v))
              }))
          ),
          h(Check, { label: '显示 HUD 肖像', checked: draft.showHud, onChange: (v) => set('showHud', v) }),
          h(Check, { label: 'Hex 数据雨', checked: draft.showHex, onChange: (v) => set('showHex', v) }),
          h(Check, { label: '技术网格', checked: draft.showGrid, onChange: (v) => set('showGrid', v) })
        ),

        /* 文案 */
        h('div', { className: '__x86_group' },
          h('div', { className: '__x86_groupTitle' }, 'COPY / 终幕文案'),
          h('div', { className: '__x86_two' },
            h(Field, { label: '终幕标题' },
              h(TextInput, { value: draft.finaleTitle, onChange: (v) => set('finaleTitle', v) })),
            h(Field, { label: '终幕副标题' },
              h(TextInput, { value: draft.finaleSub, onChange: (v) => set('finaleSub', v) }))
          ),
          h(Field, { label: '终幕英文' },
            h(TextInput, { mono: true, value: draft.finaleEn, onChange: (v) => set('finaleEn', v) })),
          h(Field, { label: '页脚' },
            h(TextInput, { mono: true, value: draft.footer, onChange: (v) => set('footer', v) }))
        ),

        /* 预览 + 操作 */
        h('div', { className: '__x86_preview' },
          h('div', { className: '__x86_previewText' },
            '「立即预览」会先保存，再清掉本轮会话的已播标记并刷新页面——刷新后就能看到完整的 86 开机序列。',
            file ? h('div', { className: '__x86_file' }, '配置文件：' + file) : null
          ),
          h('button', { className: '__x86_btn', onClick: preview, disabled: busy }, '立即预览')
        ),

        h('div', { className: '__x86_actions' },
          h('button', { className: '__x86_btn __x86_btnPrimary', onClick: save, disabled: busy },
            busy ? '处理中…' : '保存'),
          h('button', { className: '__x86_btn', onClick: reset, disabled: busy }, '恢复默认'),
          h('button', { className: '__x86_btn', onClick: load, disabled: busy }, '放弃修改'),
          notice ? h('span', { className: '__x86_ok' }, notice) : null,
          error ? h('span', { className: '__x86_err' }, error) : null
        )
      )
    }

    /* ── 桌面端自举 ──────────────────────────────────────────────────────── */
    /* Host 半侧靠 ctx.webServer.tapIndex 往 index.html 注入。web profile 一定
       走这条路；Electron 也可能用 file:// + IPC 下发前端，那时注入不生效，
       由这里自己建根节点 + 拉 splash.css/splash.js。 */
    function readFlag(store, key) {
      try {
        var s = window[store]
        return s ? s.getItem(key) : null
      } catch (e) { return null }
    }

    function writeFlag(store, key, value) {
      try {
        var s = window[store]
        if (s) s.setItem(key, value)
      } catch (e) { /* 隐私模式 */ }
    }

    function loadScript(src, done) {
      var s = document.createElement('script')
      s.src = src
      s.async = false
      s.addEventListener('load', () => done(null))
      s.addEventListener('error', () => done(new Error('script load failed: ' + src)))
      ;(document.head || document.documentElement).appendChild(s)
    }

    function loadCss(href, done) {
      var link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = href
      link.addEventListener('load', () => done(null))
      link.addEventListener('error', () => done(new Error('css load failed: ' + href)))
      ;(document.head || document.documentElement).appendChild(link)
    }

    function release(ok) {
      if (ok) return
      try {
        var r = document.getElementById(ROOT_ID)
        if (r && r.parentNode) r.parentNode.removeChild(r)
        if (document.documentElement.classList) document.documentElement.classList.remove('e86b-lock')
        if (document.body && document.body.style) document.body.style.overflow = ''
        window.__DSH_86_STARTUP_FAILED__ = true
      } catch (e) { /* noop */ }
    }

    function injectRoot(cfg) {
      var root = document.getElementById(ROOT_ID)
      if (!root) {
        root = document.createElement('div')
        root.id = ROOT_ID
        document.body.appendChild(root)
      }
      root.className = 'e86b-root e86b-boot'
      if (document.documentElement.classList) document.documentElement.classList.add('e86b-lock')
      if (document.body && document.body.style) document.body.style.overflow = 'hidden'

      var failed = false
      var cssReady = false
      var scriptReady = false
      function guard(err) {
        if (err) {
          if (!failed && typeof console !== 'undefined' && console.warn) {
            console.warn('[dsh-86-startup] 启动动画自举失败，已放开页面：', err.message)
          }
          failed = true
          release(false)
          return
        }
        if (cssReady && scriptReady) release(true)
      }

      loadCss(ROUTE + '/splash.css', (err) => {
        if (err) { guard(err); return }
        cssReady = true
        guard(null)
      })

      window.__DSH_86_STARTUP__ = cfg || {}
      try { delete window.__DSH_86_STARTUP_LOADED__ } catch (e) { window.__DSH_86_STARTUP_LOADED__ = undefined }
      loadScript(ROUTE + '/splash.js?t=' + Date.now(), (err) => {
        if (err) { guard(err); return }
        scriptReady = true
        guard(null)
      })

      setTimeout(() => {
        try {
          var r = document.getElementById(ROOT_ID)
          if (r && r.className && r.className.indexOf('e86b-boot') !== -1) release(false)
        } catch (e) { /* noop */ }
      }, 12000)
    }

    function selfBoot() {
      try {
        if (typeof window === 'undefined' || typeof document === 'undefined') return
        if (!document.body) return
        if (window.__DSH_86_STARTUP_BOOT__) return
        if (window.__DSH_86_STARTUP__) return
        if (document.getElementById(ROOT_ID)) return
        if (document.getElementById('dsh-startup-root') && !window.__DSH_STARTUP_SKIP__) return
        if (window.__DSH_86_STARTUP_FAILED__ === true) return
        window.__DSH_86_STARTUP_BOOT__ = 'client'
        fetch(API, { headers: { Accept: 'application/json' } })
          .then((r) => r.json())
          .then((j) => (j && j.ok === true ? j.config : null))
          .catch(() => null)
          .then((cfg) => {
            cfg = cfg || { enabled: true, mode: 'session', speed: 1 }
            if (cfg.enabled === false) return
            var today = new Date().toISOString().slice(0, 10)
            if (cfg.mode === 'session' && readFlag('sessionStorage', 'dsh-86-startup:shown') === '1') return
            if (cfg.mode === 'daily' && readFlag('localStorage', 'dsh-86-startup:day') === today) return
            if (cfg.mode === 'session') writeFlag('sessionStorage', 'dsh-86-startup:shown', '1')
            if (cfg.mode === 'daily') writeFlag('localStorage', 'dsh-86-startup:day', today)
            injectRoot(cfg)
          })
          .catch(() => { /* 自举失败就算了 */ })
      } catch (e) { /* 绝不把宿主带崩 */ }
    }

    /* ── 插件 ────────────────────────────────────────────────────────────── */
    var inject = ['slots']

    function apply(ctx) {
      selfBoot()
      ctx.slots.inject('settings.section', () => ctx.slots.register(
        { name: 'settings.section', id: 'startup-86', order: 26, label: '启动动画 · 第 86 区' },
        function () { return h(Panel, {}) }
      ))
    }

    exports.apply = apply
    exports.inject = inject
    return module.exports
  }
})
