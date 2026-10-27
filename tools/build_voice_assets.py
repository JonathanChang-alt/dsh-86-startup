#!/usr/bin/env python3
"""Turn the generated clean Lena WAVs into the startup plugin's voice assets.

For each of the six lines it writes the clean master MP3:
  clean             raw model output, gentle mastering only

and a manifest the splash runtime uses for durations.  It also builds
docs/voice-audition.html so the voice can be auditioned before restarting DSH.

Input : $LENA_BOOT_DIR/voice-N-clean.wav   (from tools/generate_voice.py)
Output: assets/voice/voice-N-<variant>.mp3
        assets/voice/manifest.json
        docs/voice-audition.html
"""
from __future__ import annotations

import base64
import html
import json
import os
import re
import subprocess
from pathlib import Path

TOOLCHAIN = Path(os.environ.get("GPT_SOVITS_TOOLCHAIN", "GPT-SoVITS-toolchain"))
FFMPEG = Path(os.environ.get("FFMPEG", str(TOOLCHAIN / "bin/ffmpeg")))
FFPROBE = Path(os.environ.get("FFPROBE", str(TOOLCHAIN / "bin/ffprobe")))
SRC = Path(os.environ.get("LENA_BOOT_DIR", "/tmp/lena_boot"))
HERE = Path(__file__).resolve().parent.parent
OUT = HERE / "assets/voice"
DOCS = HERE / "docs"

PEAK = 0.7079

LINES = json.loads((SRC / "report.json").read_text(encoding="utf-8"))
LINES.sort(key=lambda x: x["id"])

VARIANTS = {
    "clean": {
        "label": "原始",
        "filter": (
            "highpass=f=55,lowpass=f=16000,"
            "loudnorm=I=-18:TP=-3:LRA=11,"
            f"alimiter=limit={PEAK}:level=false"
        ),
    },
}


def duration(path: Path) -> float:
    r = subprocess.run(
        [str(FFPROBE), "-v", "error", "-show_entries", "format=duration",
         "-of", "default=nw=1:nk=1", str(path)],
        capture_output=True, text=True, check=True)
    return round(float(r.stdout.strip()), 3)


def make(src: Path, dst: Path, variant: str) -> None:
    cfg = VARIANTS[variant]
    fc = f"[0:a]{cfg['filter']}[out]"
    r = subprocess.run(
        [str(FFMPEG), "-v", "error", "-y", "-i", str(src),
         "-filter_complex", fc, "-map", "[out]",
         "-ar", "44100", "-ac", "1",
         "-c:a", "libmp3lame", "-b:a", "128k", str(dst)],
        capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(f"{dst.name}: {r.stderr.strip()[:300]}")


def audition_html(manifest: dict) -> str:
    cards = []
    for item in LINES:
        lid = str(item["id"])
        rows = []
        for variant in ("clean",):
            info = manifest[lid][variant]
            rows.append(f"""
          <div class="row">
            <span class="tag">{html.escape(VARIANTS[variant]['label'])}</span>
            <audio controls preload="metadata" src="../assets/voice/{html.escape(info['file'])}.mp3?v={info.get('mtime', 0)}"></audio>
            <span class="meta">{info['duration']:.2f}s</span>
          </div>""")
        cards.append(f"""
      <article class="card">
        <div class="no">{item['id']:02d}</div>
        <div class="text">
          <div class="ja">{html.escape(item['ja'])}</div>
          <div class="zh">{html.escape(item['zh'])}</div>
          <div class="en">{html.escape(item['en'])}</div>
        </div>
        <div class="players">{''.join(rows)}</div>
      </article>""")
    return f"""<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>蕾娜 AI 配音 · 第 86 区开机试听</title>
<style>
  :root {{ --line:#3fb6ff; --glow:#59e0ff; --ink:#04080f; --text:#e8f6ff; --text2:#9dc4dd; --text3:#6d90ab; }}
  * {{ box-sizing:border-box; }}
  body {{ margin:0; background:var(--ink); color:var(--text);
         font-family:"PingFang SC","Hiragino Sans GB","Microsoft YaHei",system-ui,sans-serif; }}
  body::before {{ content:""; position:fixed; inset:0; pointer-events:none;
    background:radial-gradient(ellipse 70% 60% at 50% 0%, rgba(20,70,110,.22), transparent 70%),
               repeating-linear-gradient(180deg, transparent 0 3px, rgba(0,0,0,.22) 3px 4px); }}
  .wrap {{ position:relative; max-width:980px; margin:0 auto; padding:48px 26px 80px; }}
  header {{ border-bottom:1px solid #123a5c; padding-bottom:18px; margin-bottom:26px; }}
  .brand {{ font-family:"Arial Black",sans-serif; font-size:44px; line-height:.8; letter-spacing:-.05em;
            color:#f4fbff; text-shadow:0 0 30px rgba(89,224,255,.35); }}
  h1 {{ margin:10px 0 4px; font-size:20px; font-weight:600; letter-spacing:.24em; }}
  .sub {{ font:10px/1.6 ui-monospace,Menlo,monospace; letter-spacing:.24em; color:var(--text3); }}
  .note {{ margin:18px 0 26px; padding:12px 14px; border-left:2px solid var(--line);
           background:rgba(63,182,255,.05); font-size:12px; line-height:1.8; color:var(--text2); }}
  .note b {{ color:var(--glow); font-weight:500; }}
  .card {{ display:grid; grid-template-columns:46px 1fr; gap:0 16px; padding:20px 0;
           border-bottom:1px solid rgba(63,182,255,.14); }}
  .no {{ font:600 20px/1 ui-monospace,Menlo,monospace; color:var(--line); padding-top:3px; }}
  .ja {{ font-size:17px; line-height:1.7; letter-spacing:.04em; }}
  .zh {{ margin-top:5px; font-size:12px; letter-spacing:.08em; color:var(--text2); }}
  .en {{ margin-top:3px; font:10px/1.6 ui-monospace,Menlo,monospace; letter-spacing:.08em; color:var(--text3); }}
  .players {{ grid-column:2; margin-top:14px; display:flex; flex-direction:column; gap:7px; }}
  .row {{ display:flex; align-items:center; gap:12px; }}
  .tag {{ flex:0 0 104px; font:10px/1 ui-monospace,Menlo,monospace; letter-spacing:.1em; color:var(--text3); }}
  audio {{ width:100%; height:32px; }}
  .meta {{ flex:0 0 48px; text-align:right; font:10px/1 ui-monospace,Menlo,monospace; color:var(--text3); }}
  footer {{ margin-top:34px; font:10px/1.8 ui-monospace,Menlo,monospace; letter-spacing:.08em; color:var(--text3); }}
  @media (max-width:640px) {{
    .card {{ grid-template-columns:32px 1fr; }}
    .tag {{ flex-basis:82px; }}
    audio {{ height:28px; }}
  }}
</style>
</head>
<body>
<div class="wrap">
  <header>
    <div class="brand">86</div>
    <h1>蕾娜 AI 配音 · 第 86 区开机试听</h1>
    <div class="sub">GPT-SoVITS v2ProPlus · LENA MAIN MODEL · 6 LINES · CLEAN MASTER</div>
  </header>
  <div class="note">
    本次交付<b>只保留原始音</b>（模型直接输出，只做响度与 −3 dBFS 限幅）；Para-RAID 变体已删除。
    试听页面只读本地文件，不需要启动 DSH。
  </div>
  {''.join(cards)}
  <footer>
    模型：蕾娜主模型 lena_e8_s360.pth + lena-e8.ckpt · 参考：lena voice 1.wav<br>
    生成：tools/generate_voice.py · 母带：tools/build_voice_assets.py · 峰值 −3 dBFS
  </footer>
</div>
</body>
</html>
"""


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    DOCS.mkdir(parents=True, exist_ok=True)
    # 只保留原始音：清掉以前生成过的 Para-RAID 变体
    for old in OUT.glob("voice-*-pararaid-*.mp3"):
        old.unlink()
    manifest = {}
    for item in LINES:
        lid = str(item["id"])
        src = SRC / f"voice-{item['id']}-clean.wav"
        if not src.exists():
            raise SystemExit(f"missing {src}")
        manifest[lid] = {}
        for variant in VARIANTS:
            dst = OUT / f"voice-{item['id']}-{variant}.mp3"
            make(src, dst, variant)
            manifest[lid][variant] = {
                "file": dst.stem,
                "duration": duration(dst),
                "bytes": dst.stat().st_size,
                "mtime": int(dst.stat().st_mtime),
            }
            print(f"  {dst.name:38s} {manifest[lid][variant]['duration']:.2f}s  "
                  f"{dst.stat().st_size//1024} KB")
    (OUT / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    (OUT / "manifest.js").write_text(
        "window.__DSH_86_STARTUP_VOICE__ = " +
        json.dumps(manifest, ensure_ascii=False) + ";\n", encoding="utf-8")
    # Electron 的 selfBoot 路径不会经过 Host 的 tapIndex，也就拿不到
    # window.__DSH_86_STARTUP_VOICE__；manifest 也一起嵌进 splash.js。
    splash_path = HERE / "lib/splash.js"
    splash = splash_path.read_text(encoding="utf-8")
    manifest_payload = (OUT / "manifest.js").read_text(encoding="utf-8")
    manifest_obj = manifest_payload.split(" = ", 1)[1].strip().rstrip(";")
    manifest_block = (
        "  /* VOICE_MANIFEST_BEGIN */\n"
        "  var VOICE_MANIFEST = window.__DSH_86_STARTUP_VOICE__ || " + manifest_obj + "\n"
        "  /* VOICE_MANIFEST_END */"
    )
    splash, count = re.subn(
        r"  /\* VOICE_MANIFEST_BEGIN \*/.*?  /\* VOICE_MANIFEST_END \*/",
        lambda m: manifest_block, splash, flags=re.S)
    if count != 1:
        raise SystemExit(f"VOICE_MANIFEST block not found in splash.js (count={count})")
    splash_path.write_text(splash, encoding="utf-8")
    print(f"manifest embedded -> {splash_path}")
    # Inline the audio as base64 so the runtime never needs an audio HTTP
    # request (the desktop shell's media path is the flaky part).
    # 用 PCM WAV 做运行时内联，而不是 MP3：桌面端 Electron 如果裁掉了
    # 专有编解码器，MP3 会静音，WAV 一定可解。MP3 仍留给试听页/兜底路由。
    audio_data = {}
    for item in LINES:
        stem = f"voice-{item['id']}-clean"
        wav_src = SRC / (stem + ".wav")
        if wav_src.exists():
            raw = wav_src.read_bytes()
        else:
            wav_tmp = OUT / (stem + ".runtime.wav")
            subprocess.run(
                [str(FFMPEG), "-v", "error", "-y", "-i", str(OUT / (stem + ".mp3")),
                 "-ar", "32000", "-ac", "1", "-c:a", "pcm_s16le", str(wav_tmp)],
                check=True)
            raw = wav_tmp.read_bytes()
        audio_data[stem] = base64.b64encode(raw).decode("ascii")
    (OUT / "voice-data.js").write_text(
        "window.__DSH_86_STARTUP_AUDIO__ = " +
        json.dumps(audio_data, ensure_ascii=False) + ";\n", encoding="utf-8")
    # 同时把数据嵌进 splash.js：启动脚本已经在桌面端跑通，数据跟着它走，
    # 不再依赖单独的 voice-data 请求，避免“VOICE 0/6”。
    splash_path = HERE / "lib/splash.js"
    splash = splash_path.read_text(encoding="utf-8")
    payload = (OUT / "voice-data.js").read_text(encoding="utf-8")
    obj = payload.split(" = ", 1)[1].strip().rstrip(";")
    block = (
        "  /* VOICE_DATA_BEGIN */\n"
        "  var AUDIO_DATA = window.__DSH_86_STARTUP_AUDIO__ || " + obj + "\n"
        "  /* VOICE_DATA_END */"
    )
    splash, count = re.subn(
        r"  /\* VOICE_DATA_BEGIN \*/.*?  /\* VOICE_DATA_END \*/",
        lambda m: block, splash, flags=re.S)
    if count != 1:
        raise SystemExit(f"VOICE_DATA block not found in splash.js (count={count})")
    splash_path.write_text(splash, encoding="utf-8")
    print(f"voice-data -> {OUT / 'voice-data.js'} ({sum(len(x) for x in audio_data.values())//1024} KB base64 WAV)")
    print(f"embedded -> {splash_path} ({splash_path.stat().st_size//1024} KB)")
    (DOCS / "voice-report.json").write_text(
        json.dumps(LINES, ensure_ascii=False, indent=2), encoding="utf-8")
    (DOCS / "voice-audition.html").write_text(audition_html(manifest), encoding="utf-8")
    print(f"manifest -> {OUT / 'manifest.json'}")
    print(f"audition -> {DOCS / 'voice-audition.html'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
