# AI CLI Auto Installer

Claude CLI · Gemini CLI · ChatGPT(Codex) CLI · Node.js · Python을 **버튼 한 번으로 순차 자동 설치**해 주는 데스크탑 앱입니다.
IDE(VS Code) 스타일의 창을 열고, 왼쪽에는 설치 단계 목록, 오른쪽에는 실시간 터미널 로그를 보여줍니다.

## 설치 순서

| 순서 | 항목 | 설치 방법 |
|---|---|---|
| 1 | Node.js (LTS) | Windows: winget / macOS: Homebrew / Linux: apt·dnf |
| 2 | Python 3 | Windows: winget / macOS: Homebrew / Linux: apt·dnf |
| 3 | Claude Code CLI | `npm install -g @anthropic-ai/claude-code` |
| 4 | Gemini CLI | `npm install -g @google/gemini-cli` |
| 5 | ChatGPT Codex CLI | `npm install -g @openai/codex` |
| 6 | Visual Studio Code | winget / Homebrew / snap (선택) |

- 이미 설치된 항목은 자동으로 감지해 건너뜁니다(버전 표시).
- Node.js가 실패하면 이를 필요로 하는 CLI 단계는 자동으로 건너뜁니다.
- 설치가 모두 끝나면 **IDE(VS Code) 열기** 버튼으로 바로 개발을 시작할 수 있습니다.

## 개발 실행

```bash
cd cli-auto-installer
npm install
npm start
```

## 배포용 설치 파일 만들기

```bash
npm run dist:win    # Windows .exe (NSIS 설치 마법사)
npm run dist:mac    # macOS .dmg
npm run dist:linux  # Linux AppImage
```

결과물은 `cli-auto-installer/dist/` 폴더에 생성됩니다.

## 참고 사항

- **Windows**: `winget`(Windows 10 1809+ 기본 포함)을 사용합니다. 관리자 권한 없이 사용자 설치가 진행됩니다.
- **macOS**: Homebrew가 설치돼 있어야 Node.js/Python 자동 설치가 가능합니다. 없으면 안내 메시지를 표시합니다.
- **Linux**: apt 또는 dnf를 사용하며 sudo 권한이 필요할 수 있습니다.
- 새로 설치된 명령어(claude, gemini, codex 등)는 **새 터미널 창**에서 인식됩니다. 인식되지 않으면 PC를 재시작해 주세요.
- 각 CLI의 로그인/API 키 설정은 설치 후 처음 실행할 때 각 도구가 안내합니다.
