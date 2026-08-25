# =====================================================================
#  AI CLI Auto Installer — Windows (PowerShell)
#  Node.js → Python → Claude CLI → Gemini CLI → Codex CLI → VS Code
#  사용법:  irm https://<배포주소>/install.ps1 | iex
# =====================================================================
$ErrorActionPreference = 'Continue'

function Write-Title($text) {
  Write-Host ""
  Write-Host ("=" * 60) -ForegroundColor DarkGray
  Write-Host "  $text" -ForegroundColor Cyan
  Write-Host ("=" * 60) -ForegroundColor DarkGray
}

# winget 설치 후 새 PATH를 현재 세션에 반영
function Refresh-Path {
  $machine = [Environment]::GetEnvironmentVariable('Path', 'Machine')
  $user = [Environment]::GetEnvironmentVariable('Path', 'User')
  $env:Path = "$machine;$user"
}

function Has-Command($name) {
  return [bool](Get-Command $name -ErrorAction SilentlyContinue)
}

function Install-Step {
  param([string]$Title, [string]$CheckCmd, [scriptblock]$Installer)
  Write-Title $Title
  if (Has-Command $CheckCmd) {
    $ver = & $CheckCmd --version 2>$null | Select-Object -First 1
    Write-Host "  [건너뜀] 이미 설치되어 있습니다: $ver" -ForegroundColor Green
    return $true
  }
  Write-Host "  설치를 시작합니다..." -ForegroundColor Yellow
  & $Installer
  Refresh-Path
  if (Has-Command $CheckCmd) {
    $ver = & $CheckCmd --version 2>$null | Select-Object -First 1
    Write-Host "  [완료] $ver" -ForegroundColor Green
    return $true
  }
  Write-Host "  [주의] 설치는 실행됐지만 아직 명령을 찾지 못했습니다. 새 터미널에서 다시 확인해 주세요." -ForegroundColor Yellow
  return $false
}

Write-Host ""
Write-Host "  AI CLI Auto Installer — 개발 환경을 순서대로 설치합니다." -ForegroundColor Magenta

if (-not (Has-Command 'winget')) {
  Write-Host "  [오류] winget을 찾을 수 없습니다. Microsoft Store에서 '앱 설치 관리자'를 먼저 설치해 주세요." -ForegroundColor Red
  return
}

# 1. Node.js
$nodeOk = Install-Step -Title '1/6 Node.js (LTS)' -CheckCmd 'node' -Installer {
  winget install --id OpenJS.NodeJS.LTS -e --accept-source-agreements --accept-package-agreements --silent
}

# 2. Python
Install-Step -Title '2/6 Python 3' -CheckCmd 'python' -Installer {
  winget install --id Python.Python.3.13 -e --accept-source-agreements --accept-package-agreements --silent
} | Out-Null

if ($nodeOk) {
  # 3~5. npm 기반 CLI들
  Install-Step -Title '3/6 Claude Code CLI' -CheckCmd 'claude' -Installer {
    npm install -g '@anthropic-ai/claude-code'
  } | Out-Null

  Install-Step -Title '4/6 Gemini CLI' -CheckCmd 'gemini' -Installer {
    npm install -g '@google/gemini-cli'
  } | Out-Null

  Install-Step -Title '5/6 ChatGPT Codex CLI' -CheckCmd 'codex' -Installer {
    npm install -g '@openai/codex'
  } | Out-Null
} else {
  Write-Host "  Node.js 설치가 확인되지 않아 CLI 3종 설치를 건너뜁니다. 새 터미널에서 스크립트를 다시 실행해 주세요." -ForegroundColor Yellow
}

# 6. VS Code
Install-Step -Title '6/6 Visual Studio Code' -CheckCmd 'code' -Installer {
  winget install --id Microsoft.VisualStudioCode -e --accept-source-agreements --accept-package-agreements --silent
} | Out-Null

Write-Title '설치 요약'
foreach ($t in @(
  @{n='Node.js'; c='node'}, @{n='Python'; c='python'},
  @{n='Claude CLI'; c='claude'}, @{n='Gemini CLI'; c='gemini'},
  @{n='Codex CLI'; c='codex'}, @{n='VS Code'; c='code'}
)) {
  if (Has-Command $t.c) {
    Write-Host ("  [O] {0}" -f $t.n) -ForegroundColor Green
  } else {
    Write-Host ("  [X] {0} — 새 터미널에서 확인하거나 다시 실행해 주세요" -f $t.n) -ForegroundColor Yellow
  }
}
Write-Host ""
Write-Host "  완료! 새 터미널을 열고 claude / gemini / codex 를 실행해 보세요." -ForegroundColor Magenta
Write-Host "  VS Code를 열려면: code ." -ForegroundColor Magenta
Write-Host ""
