#!/usr/bin/env python3
"""Generate the 86 startup voice lines with the user's fine-tuned Lena model.

Model (normal Lena, not the rough commander variant):
  GPT  : <D>/train_logs/weights/lena-e8.ckpt
  SoVITS: <D>/train_logs/weights/lena_e8_s360.pth
Reference: a 32 kHz Lena reference clip of your own (set LENA_REF_AUDIO)

For every line it tries several seeds, trims silence, normalises to the
voicepack's peak (0.7079), runs faster-whisper ja ASR and keeps the candidate
with the best character overlap.  The chosen file is written as
  <out>/voice-N-clean.wav      32 kHz mono, -3 dBFS
and a report.json records every candidate.

Run with the toolchain venv:
  $GPT_SOVITS_TOOLCHAIN/venv/bin/python tools/generate_voice.py

Model paths are not bundled; point the env vars at your own GPT-SoVITS setup.
"""
from __future__ import annotations

import argparse
import difflib
import json
import os
import sys
import time
from pathlib import Path

TOOLCHAIN = Path(os.environ.get("GPT_SOVITS_TOOLCHAIN", "GPT-SoVITS-toolchain"))
REPO = Path(os.environ.get("GPT_SOVITS_REPO", str(TOOLCHAIN / "GPT-SoVITS")))
D = Path(os.environ.get("LENA_MODEL_DIR", "lena-model"))
GPT = Path(os.environ.get("LENA_GPT_CKPT", str(D / "train_logs/weights/lena-e8.ckpt")))
SOVITS = Path(os.environ.get("LENA_SOVITS_PTH", str(D / "train_logs/weights/lena_e8_s360.pth")))
REF_AUDIO = Path(os.environ.get("LENA_REF_AUDIO", "lena-reference.wav"))
REF_TEXT = "パラレイド アクティベート。ハンドラー1よりプレアです。今日もよろしくお願いしますね。"
OUT_DEFAULT = Path(os.environ.get("LENA_BOOT_DIR", "/tmp/lena_boot"))

PUNCT = "。、！？…・，,.!?「」『』（）()~～ー—  \u3000"

LINES = [
    {
        "id": 1,
        "name": "access",
        "ja": "ハンドラー・ワンより、パラレイド接続を要請します。ゾーン・エイティシックス、応答を。",
        "zh": "管制一号请求 Para-RAID 接入。第 86 区，请应答。",
        "en": "Handler One requesting Para-RAID connection. Zone Eighty-Six, respond.",
    },
    {
        "id": 2,
        "name": "identity",
        "ja": "身分証明、確認しました。ハンドラー・ワン、ヴラディレーナ・ミリーゼ。権限レベル・スリー。",
        "zh": "身份确认。管制一号，芙拉蒂蕾娜·米利杰。权限等级三。",
        "en": "Identity confirmed. Handler One, Vladilena Milizé. Clearance level three.",
    },
    {
        "id": 3,
        "name": "link",
        "ja": "パラレイド、リンク確立。ゾーン・エイティシックス、回線を開放します。",
        "zh": "Para-RAID 链路建立。第 86 区，回线开放。",
        "en": "Para-RAID link established. Zone Eighty-Six, opening the channel.",
    },
    {
        "id": 4,
        "name": "sync",
        "ja": "神経同期、九十八・四パーセント。同調、完了。",
        "zh": "神经同步，98.4%。同调完成。",
        "en": "Neural synchronization at ninety-eight point four percent. Synchronization complete.",
    },
    {
        "id": 5,
        "name": "channel",
        "ja": "スピアヘッド、全機オンライン。通信チャンネルを開放します。",
        "zh": "先锋战队，全机在线。通信频道开放。",
        "en": "Spearhead, all units online. Opening the communications channel.",
    },
    {
        "id": 6,
        "name": "welcome",
        "ja": "おかえりなさい、アンダーテイカー。……ずっと、待っていました。",
        "zh": "欢迎回来，undertaker。……我一直，在等你。",
        "en": "Welcome back, Undertaker. I've been waiting for you.",
    },
]


def norm(t: str) -> str:
    return "".join(c for c in str(t) if c not in PUNCT)


def similarity(target: str, got: str) -> float:
    a, b = norm(target), norm(got)
    if not a:
        return 0.0
    return difflib.SequenceMatcher(None, a, b, autojunk=False).ratio()


def prepare_ref32(dst: Path) -> Path:
    import soxr
    import soundfile as sf

    x, sr = sf.read(str(REF_AUDIO), dtype="float32")
    if x.ndim > 1:
        x = x.mean(axis=1)
    if sr != 32000:
        x = soxr.resample(x, sr, 32000, quality="VHQ")
    dst.parent.mkdir(parents=True, exist_ok=True)
    sf.write(str(dst), x, 32000, subtype="PCM_16")
    return dst


def trim(x):
    import numpy as np

    # 20 ms peak envelope, -38 dBFS gate; keep 60 ms of pre-roll.
    win = 640
    env = np.array([np.max(np.abs(x[i:i + win])) for i in range(0, len(x), win)])
    if len(env) == 0:
        return x
    thr = max(0.003, float(np.max(env)) * 0.035)
    idx = np.where(env > thr)[0]
    if len(idx) == 0:
        return x
    start = max(0, idx[0] * win - 960)
    end = min(len(x), idx[-1] * win + win + 480)
    return x[start:end]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=str(OUT_DEFAULT))
    ap.add_argument("--seeds", default="123,1,7,42")
    ap.add_argument("--only", default="", help="comma separated line ids")
    ap.add_argument("--limit-seeds", type=int, default=0)
    args = ap.parse_args()

    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    seeds = [int(s) for s in args.seeds.split(",") if s.strip()]
    if args.limit_seeds:
        seeds = seeds[: args.limit_seeds]
    only = {int(x) for x in args.only.split(",") if x.strip()}
    lines = [x for x in LINES if not only or x["id"] in only]

    os.environ.setdefault("NUMBA_CACHE_DIR", "/tmp/numba_cache")
    os.environ.setdefault("MPLCONFIGDIR", "/tmp/mplcache")
    os.environ["NLTK_DATA"] = str(REPO / "runtime" / "nltk_data")
    sys.path.insert(0, str(REPO))
    sys.path.insert(0, str(REPO / "GPT_SoVITS"))
    sys.path.insert(0, str(REPO / "GPT_SoVITS/eres2net"))
    os.chdir(REPO)

    import numpy as np
    import soundfile as sf
    import yaml
    from faster_whisper import WhisperModel
    from GPT_SoVITS.TTS_infer_pack.TTS import TTS, TTS_Config

    src = REPO / "GPT_SoVITS/configs/tts_infer.yaml"
    cfg = yaml.safe_load(src.read_text(encoding="utf-8"))
    custom = dict(cfg.get("custom", cfg.get("v2ProPlus", {})))
    custom.update({
        "bert_base_path": str(REPO / "GPT_SoVITS/pretrained_models/chinese-roberta-wwm-ext-large"),
        "cnhuhbert_base_path": str(REPO / "GPT_SoVITS/pretrained_models/chinese-hubert-base"),
        "device": "cpu",
        "is_half": False,
        "version": "v2ProPlus",
        "t2s_weights_path": str(GPT),
        "vits_weights_path": str(SOVITS),
    })
    work_cfg = out / "cfg.yaml"
    work_cfg.write_text(yaml.safe_dump({"custom": custom}, allow_unicode=True), encoding="utf-8")
    ref32 = prepare_ref32(out / "ref_32k.wav")

    print(f"[load] {GPT.name} + {SOVITS.name}", flush=True)
    t0 = time.time()
    tts = TTS(TTS_Config(str(work_cfg)))
    print(f"[load] TTS ready in {time.time()-t0:.1f}s", flush=True)

    print("[load] faster-whisper large-v3-turbo", flush=True)
    t0 = time.time()
    asr = WhisperModel(str(REPO / "tools/asr/models/faster-whisper-large-v3-turbo"),
                       device="cpu", compute_type="int8")
    print(f"[load] ASR ready in {time.time()-t0:.1f}s", flush=True)

    report = []
    for item in lines:
        print(f"\n=== [{item['id']}/6] {item['ja']}", flush=True)
        candidates = []
        for seed in seeds:
            t1 = time.time()
            gen = tts.run({
                "text": item["ja"], "text_lang": "ja",
                "ref_audio_path": str(ref32), "prompt_text": REF_TEXT, "prompt_lang": "ja",
                "top_k": 15, "top_p": 1.0, "temperature": 1.0,
                "text_split_method": "cut2", "batch_size": 1,
                "speed_factor": 1.0, "seed": seed,
                "parallel_infer": True, "repetition_penalty": 1.35,
                "streaming_mode": False, "return_fragment": False,
            })
            sr, audio = next(iter(gen))
            x = np.asarray(audio, dtype=np.float32).reshape(-1)
            x = trim(x)
            peak = float(np.max(np.abs(x))) or 1.0
            x = x / peak * 0.7079
            wav = out / f"_cand_{item['id']}_{seed}.wav"
            sf.write(str(wav), x, sr, subtype="PCM_16")
            segs, _ = asr.transcribe(str(wav), language="ja", beam_size=5,
                                     vad_filter=True, condition_on_previous_text=False)
            got = "".join(s.text for s in segs).strip()
            score = similarity(item["ja"], got)
            leak = similarity(REF_TEXT, got)
            dur = len(x) / sr
            print(f"  seed={seed:<5} {dur:5.2f}s  {score*100:5.1f}%  leak={leak*100:4.1f}%  {got}", flush=True)
            candidates.append({
                "seed": seed, "duration": round(dur, 3), "score": round(score, 4),
                "leak": round(leak, 4), "asr": got, "wav": str(wav),
                "elapsed": round(time.time() - t1, 2),
            })
        # Prefer content score; a long leak disqualifies a candidate.
        usable = [c for c in candidates if c["leak"] <= c["score"] + 0.08]
        pool = usable or candidates
        best = max(pool, key=lambda c: (c["score"], -abs(c["duration"] - 3.0)))
        chosen = out / f"voice-{item['id']}-clean.wav"
        import shutil
        shutil.copyfile(best["wav"], chosen)
        print(f"  -> chosen seed={best['seed']}  {best['duration']}s  {best['score']*100:.1f}%  {chosen.name}", flush=True)
        report.append({
            "id": item["id"], "name": item["name"], "ja": item["ja"], "zh": item["zh"],
            "en": item["en"], "chosen": best, "candidates": candidates,
        })

    (out / "report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\n[done] {len(report)} lines -> {out}", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
