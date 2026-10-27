#!/usr/bin/env bash
# dsh-86-startup — install into a DSH profile (macOS / Linux).
#
#   ./install.sh            # desktop profile (the app you are using)
#   ./install.sh web        # web profile
#
# It does the two things that are easy to miss:
#   1) pnpm add link:<this dir>   (so edits show up without reinstalling)
#   2) append "dsh-86-startup" to dsh.profile.bundles
# and it writes package.json without a BOM.
set -euo pipefail

PROFILE="${1:-desktop}"
HERE="$(cd "$(dirname "$0")" && pwd)"
TARGET="$HOME/.dsh/profiles/$PROFILE"

if [ ! -f "$TARGET/package.json" ]; then
  echo "找不到 profile：$TARGET/package.json" >&2
  echo "可用的 profile：" >&2
  ls -1 "$HOME/.dsh/profiles" >&2 || true
  exit 1
fi

STAMP="$(date +%Y%m%d-%H%M%S)"
cp "$TARGET/package.json" "$TARGET/package.json.bak-$STAMP"
if [ -f "$TARGET/pnpm-lock.yaml" ]; then cp "$TARGET/pnpm-lock.yaml" "$TARGET/pnpm-lock.yaml.bak-$STAMP"; fi
echo "已备份：$TARGET/package.json.bak-$STAMP"

cd "$TARGET"
pnpm add "link:$HERE"

node - "$TARGET/package.json" <<'NODE'
const fs = require('fs')
const file = process.argv[2]
const pkg = JSON.parse(fs.readFileSync(file, 'utf8'))
pkg.dsh = pkg.dsh || {}
pkg.dsh.profile = pkg.dsh.profile || {}
pkg.dsh.profile.bundles = pkg.dsh.profile.bundles || []
if (!pkg.dsh.profile.bundles.includes('dsh-86-startup')) {
  pkg.dsh.profile.bundles.push('dsh-86-startup')
  fs.writeFileSync(file, JSON.stringify(pkg, null, 2) + '\n', 'utf8')
  console.log('已加入 dsh.profile.bundles：dsh-86-startup')
} else {
  console.log('dsh.profile.bundles 里已经有 dsh-86-startup')
}
NODE

# 两个开机动画会叠黑幕；这里只提醒，不擅自改你的其他插件。
node - "$TARGET/package.json" <<'NODE'
const fs = require('fs')
const pkg = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))
const bundles = (pkg.dsh && pkg.dsh.profile && pkg.dsh.profile.bundles) || []
if (bundles.includes('dsh-startup-secret')) {
  console.log('')
  console.log('⚠️  dsh-startup-secret 还在 bundles 里。')
  console.log('    两个开机动画只能留一个；本插件会主动让位，你看到的会是红色那套。')
  console.log('    想用第 86 区：把 "dsh-startup-secret" 从 dsh.profile.bundles 里删掉。')
}
NODE

echo ""
echo "装好了。完全退出 DeepSeek Harness 再打开，冷启动就能看到 86 开机序列。"
echo "设置页：设置 →「启动动画 · 第 86 区」。"
