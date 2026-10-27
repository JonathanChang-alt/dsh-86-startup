#requires -version 5.1
<#
  dsh-86-startup — install into a DSH profile on Windows.

    powershell -ExecutionPolicy Bypass -File .\install.ps1
    powershell -ExecutionPolicy Bypass -File .\install.ps1 -Profile web

  Sets up the same two things install.sh does on macOS/Linux:
    1) pnpm add "link:<this dir>" in the profile
    2) appends "dsh-86-startup" to dsh.profile.bundles
  The JSON edit goes through Node, so the file stays UTF-8 without a BOM.
#>
[CmdletBinding()]
param(
  [string]$Profile = 'desktop'
)

$ErrorActionPreference = 'Stop'
$Here = Split-Path -Parent $MyInvocation.MyCommand.Path
$DshHome = if ($env:DSH_HOME) { $env:DSH_HOME } else { Join-Path $env:USERPROFILE '.dsh' }
$Target = Join-Path $DshHome "profiles\$Profile"
$PkgPath = Join-Path $Target 'package.json'

if (-not (Test-Path -LiteralPath $PkgPath)) {
  Write-Host "找不到 profile：$PkgPath" -ForegroundColor Red
  $profilesDir = Join-Path $DshHome 'profiles'
  if (Test-Path -LiteralPath $profilesDir) {
    Write-Host '可用的 profile：'
    Get-ChildItem -LiteralPath $profilesDir -Directory | ForEach-Object { Write-Host "  $($_.Name)" }
  }
  exit 1
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host '找不到 node。请先安装 Node 22+（DSH 桌面版自带 Node，也可以单独安装）。' -ForegroundColor Red
  exit 1
}
$pnpm = Get-Command pnpm -ErrorAction SilentlyContinue
if (-not $pnpm) {
  Write-Host '找不到 pnpm。先安装 Node 22+ 和 pnpm：npm install -g pnpm' -ForegroundColor Red
  Write-Host '如果你用的是 DSH 自带的 pnpm，请把它的目录临时加进 PATH 后再运行本脚本。'
  exit 1
}

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
Copy-Item -LiteralPath $PkgPath -Destination "${PkgPath}.bak-$stamp"
$lock = Join-Path $Target 'pnpm-lock.yaml'
if (Test-Path -LiteralPath $lock) { Copy-Item -LiteralPath $lock -Destination "${lock}.bak-$stamp" }
Write-Host "已备份：${PkgPath}.bak-$stamp"

$linkPath = ($Here -replace '\\', '/')
Push-Location $Target
try {
  & pnpm add "link:$linkPath"
  if ($LASTEXITCODE -ne 0) { throw "pnpm add 失败（exit $LASTEXITCODE）" }
} finally {
  Pop-Location
}

$nodeScript = @'
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
if (pkg.dsh.profile.bundles.includes('dsh-startup-secret')) {
  console.log('')
  console.log('⚠️  dsh-startup-secret 还在 bundles 里。')
  console.log('    两个开机动画只能留一个；本插件会主动让位，你看到的会是红色那套。')
  console.log('    想用第 86 区：把 "dsh-startup-secret" 从 dsh.profile.bundles 里删掉。')
}
'@
$nodeScript | node - $PkgPath
if ($LASTEXITCODE -ne 0) { throw "写入 package.json 失败（exit $LASTEXITCODE）" }

Write-Host ''
Write-Host '完成。现在完全退出 DeepSeek Harness（不是只关窗口），再重新打开。' -ForegroundColor Green
