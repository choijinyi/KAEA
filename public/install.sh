#!/usr/bin/env bash
# =====================================================================
#  AI CLI Auto Installer — macOS / Linux
#  Node.js → Python → Claude CLI → Gemini CLI → Codex CLI → VS Code
#  사용법:  curl -fsSL https://<배포주소>/install.sh | bash
# =====================================================================
set -u

CYAN='\033[36m'; GREEN='\033[32m'; YELLOW='\033[33m'; RED='\033[31m'; MAGENTA='\033[35m'; RESET='\033[0m'

title() {
  printf '\n%s\n' "============================================================"
  printf "${CYAN}  %s${RESET}\n" "$1"
  printf '%s\n' "============================================================"
}

has() { command -v "$1" >/dev/null 2>&1; }

OS="$(uname -s)"
PKG=""
if [ "$OS" = "Darwin" ]; then
  has brew && PKG="brew"
else
  if has apt-get; then PKG="apt"; elif has dnf; then PKG="dnf"; fi
fi

printf "\n${MAGENTA}  AI CLI Auto Installer — 개발 환경을 순서대로 설치합니다.${RESET}\n"

if [ "$OS" = "Darwin" ] && [ -z "$PKG" ]; then
  printf "${YELLOW}  Homebrew가 없습니다. 먼저 설치해 주세요:${RESET}\n"
  printf '  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"\n'
  exit 1
fi

install_pkg() { # $1: brew name, $2: apt name, $3: dnf name
  case "$PKG" in
    brew) brew install "$1" ;;
    apt) sudo apt-get update -qq && sudo apt-get install -y "$2" ;;
    dnf) sudo dnf install -y "$3" ;;
    *) printf "${RED}  지원하는 패키지 매니저(brew/apt/dnf)를 찾지 못했습니다.${RESET}\n"; return 1 ;;
  esac
}

step() { # $1: title, $2: check cmd, $3: install function name
  title "$1"
  if has "$2"; then
    printf "${GREEN}  [건너뜀] 이미 설치되어 있습니다: %s${RESET}\n" "$("$2" --version 2>/dev/null | head -n1)"
    return 0
  fi
  printf "${YELLOW}  설치를 시작합니다...${RESET}\n"
  "$3"
  hash -r 2>/dev/null || true
  if has "$2"; then
    printf "${GREEN}  [완료] %s${RESET}\n" "$("$2" --version 2>/dev/null | head -n1)"
    return 0
  fi
  printf "${YELLOW}  [주의] 아직 명령을 찾지 못했습니다. 새 터미널에서 다시 확인해 주세요.${RESET}\n"
  return 1
}

install_node() { install_pkg node nodejs nodejs; [ "$PKG" = "apt" ] && sudo apt-get install -y npm || true; }
install_python() { install_pkg python python3 python3; }
install_claude() { npm install -g @anthropic-ai/claude-code; }
install_gemini() { npm install -g @google/gemini-cli; }
install_codex() { npm install -g @openai/codex; }
install_vscode() {
  if [ "$PKG" = "brew" ]; then brew install --cask visual-studio-code
  elif has snap; then sudo snap install code --classic
  else printf "${YELLOW}  https://code.visualstudio.com 에서 직접 설치해 주세요.${RESET}\n"; return 1; fi
}

step "1/6 Node.js" node install_node
NODE_OK=$?
PYCHECK=python3; has python3 || PYCHECK=python
step "2/6 Python 3" "$PYCHECK" install_python || true

if [ "$NODE_OK" -eq 0 ]; then
  step "3/6 Claude Code CLI" claude install_claude || true
  step "4/6 Gemini CLI" gemini install_gemini || true
  step "5/6 ChatGPT Codex CLI" codex install_codex || true
else
  printf "${YELLOW}  Node.js가 확인되지 않아 CLI 3종 설치를 건너뜁니다. 새 터미널에서 다시 실행해 주세요.${RESET}\n"
fi

step "6/6 Visual Studio Code" code install_vscode || true

title "설치 요약"
for pair in "Node.js:node" "Python:python3" "Claude CLI:claude" "Gemini CLI:gemini" "Codex CLI:codex" "VS Code:code"; do
  name="${pair%%:*}"; cmd="${pair##*:}"
  if has "$cmd"; then
    printf "${GREEN}  [O] %s${RESET}\n" "$name"
  else
    printf "${YELLOW}  [X] %s — 새 터미널에서 확인하거나 다시 실행해 주세요${RESET}\n" "$name"
  fi
done
printf "\n${MAGENTA}  완료! 새 터미널을 열고 claude / gemini / codex 를 실행해 보세요.${RESET}\n"
printf "${MAGENTA}  VS Code를 열려면: code .${RESET}\n\n"
