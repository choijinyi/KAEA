/**
 * 설치 단계 정의와 실행 로직.
 * 각 단계는 check(이미 설치됐는지) → install(플랫폼별 명령) → verify(재확인) 순으로 진행된다.
 */
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const IS_WIN = process.platform === 'win32';
const IS_MAC = process.platform === 'darwin';

/**
 * 설치 직후에는 새 프로그램의 경로가 현재 프로세스 PATH에 없으므로,
 * 잘 알려진 설치 경로들을 PATH에 덧붙인 환경을 만들어 자식 프로세스에 넘긴다.
 */
function refreshedEnv() {
  const env = { ...process.env };
  const extra = [];

  if (IS_WIN) {
    const home = os.homedir();
    const programFiles = process.env.ProgramFiles || 'C:\\Program Files';
    const localAppData = process.env.LOCALAPPDATA || path.join(home, 'AppData', 'Local');
    const appData = process.env.APPDATA || path.join(home, 'AppData', 'Roaming');
    extra.push(
      path.join(programFiles, 'nodejs'),
      path.join(appData, 'npm'),
      path.join(localAppData, 'Programs', 'Python', 'Python313'),
      path.join(localAppData, 'Programs', 'Python', 'Python313', 'Scripts'),
      path.join(localAppData, 'Programs', 'Python', 'Python312'),
      path.join(localAppData, 'Programs', 'Python', 'Python312', 'Scripts'),
      path.join(localAppData, 'Microsoft', 'WindowsApps'),
      path.join(localAppData, 'Programs', 'Microsoft VS Code', 'bin')
    );
    const sep = ';';
    const current = env.Path || env.PATH || '';
    const merged = current.split(sep).concat(extra.filter((p) => fs.existsSync(p)));
    env.Path = [...new Set(merged.filter(Boolean))].join(sep);
    env.PATH = env.Path;
  } else {
    extra.push(
      '/opt/homebrew/bin',
      '/usr/local/bin',
      '/usr/bin',
      path.join(os.homedir(), '.npm-global', 'bin'),
      path.join(os.homedir(), '.local', 'bin')
    );
    const current = env.PATH || '';
    const merged = current.split(':').concat(extra.filter((p) => fs.existsSync(p)));
    env.PATH = [...new Set(merged.filter(Boolean))].join(':');
  }
  return env;
}

/** 셸을 통해 명령 하나를 실행하고 로그를 스트리밍한다. */
function runShell(command, onLog) {
  return new Promise((resolve) => {
    const shell = IS_WIN ? 'cmd.exe' : '/bin/bash';
    const args = IS_WIN ? ['/d', '/s', '/c', command] : ['-lc', command];
    const child = spawn(shell, args, {
      env: refreshedEnv(),
      windowsHide: true,
    });
    child.stdout.on('data', (d) => onLog(d.toString()));
    child.stderr.on('data', (d) => onLog(d.toString()));
    child.on('error', (err) => {
      onLog(`\n[오류] ${err.message}\n`);
      resolve(1);
    });
    child.on('close', (code) => resolve(code ?? 1));
  });
}

/** 버전 확인용 — 성공하면 출력 첫 줄을 돌려준다. */
async function checkVersion(command) {
  let output = '';
  const code = await runShell(command, (chunk) => {
    output += chunk;
  });
  if (code === 0 && output.trim()) {
    return output.trim().split('\n')[0].trim();
  }
  return null;
}

/** macOS에서 Homebrew가 없으면 npm 기반 단계 외에는 설치가 어렵다. */
async function hasBrew() {
  return (await checkVersion('brew --version')) !== null;
}

/** Linux 패키지 매니저 탐지 */
async function linuxPkgManager() {
  if (await checkVersion('apt-get --version')) return 'apt';
  if (await checkVersion('dnf --version')) return 'dnf';
  return null;
}

/**
 * 설치 단계 목록.
 * installCommand()는 플랫폼에 맞는 셸 명령 문자열을 돌려준다. null이면 자동 설치 불가.
 */
const STEPS = [
  {
    id: 'nodejs',
    title: 'Node.js (LTS)',
    description: 'CLI 도구들의 실행 기반이 되는 자바스크립트 런타임',
    checkCommand: 'node --version',
    async installCommand() {
      if (IS_WIN) {
        return 'winget install --id OpenJS.NodeJS.LTS -e --accept-source-agreements --accept-package-agreements --silent';
      }
      if (IS_MAC) {
        return (await hasBrew()) ? 'brew install node' : null;
      }
      const pm = await linuxPkgManager();
      if (pm === 'apt') return 'sudo apt-get update && sudo apt-get install -y nodejs npm';
      if (pm === 'dnf') return 'sudo dnf install -y nodejs npm';
      return null;
    },
    manualHint: 'https://nodejs.org 에서 LTS 버전을 직접 설치해 주세요.',
  },
  {
    id: 'python',
    title: 'Python 3',
    description: 'AI 스크립트·도구 실행에 필요한 파이썬 런타임',
    checkCommand: IS_WIN ? 'python --version' : 'python3 --version',
    async installCommand() {
      if (IS_WIN) {
        return 'winget install --id Python.Python.3.13 -e --accept-source-agreements --accept-package-agreements --silent';
      }
      if (IS_MAC) {
        return (await hasBrew()) ? 'brew install python' : null;
      }
      const pm = await linuxPkgManager();
      if (pm === 'apt') return 'sudo apt-get update && sudo apt-get install -y python3 python3-pip';
      if (pm === 'dnf') return 'sudo dnf install -y python3 python3-pip';
      return null;
    },
    manualHint: 'https://www.python.org/downloads 에서 직접 설치해 주세요.',
  },
  {
    id: 'claude',
    title: 'Claude Code CLI',
    description: 'Anthropic Claude Code 명령줄 도구 (@anthropic-ai/claude-code)',
    checkCommand: 'claude --version',
    requires: ['nodejs'],
    async installCommand() {
      return 'npm install -g @anthropic-ai/claude-code';
    },
    manualHint: 'npm install -g @anthropic-ai/claude-code 를 직접 실행해 주세요.',
  },
  {
    id: 'gemini',
    title: 'Gemini CLI',
    description: 'Google Gemini 명령줄 도구 (@google/gemini-cli)',
    checkCommand: 'gemini --version',
    requires: ['nodejs'],
    async installCommand() {
      return 'npm install -g @google/gemini-cli';
    },
    manualHint: 'npm install -g @google/gemini-cli 를 직접 실행해 주세요.',
  },
  {
    id: 'codex',
    title: 'ChatGPT Codex CLI',
    description: 'OpenAI ChatGPT/Codex 명령줄 도구 (@openai/codex)',
    checkCommand: 'codex --version',
    requires: ['nodejs'],
    async installCommand() {
      return 'npm install -g @openai/codex';
    },
    manualHint: 'npm install -g @openai/codex 를 직접 실행해 주세요.',
  },
  {
    id: 'vscode',
    title: 'Visual Studio Code (IDE)',
    description: '설치 완료 후 열어 줄 코드 편집기',
    optional: true,
    checkCommand: 'code --version',
    async installCommand() {
      if (IS_WIN) {
        return 'winget install --id Microsoft.VisualStudioCode -e --accept-source-agreements --accept-package-agreements --silent';
      }
      if (IS_MAC) {
        return (await hasBrew()) ? 'brew install --cask visual-studio-code' : null;
      }
      const pm = await linuxPkgManager();
      if (pm === 'apt') {
        return 'sudo snap install code --classic || sudo apt-get install -y code';
      }
      return null;
    },
    manualHint: 'https://code.visualstudio.com 에서 직접 설치해 주세요.',
  },
];

/**
 * 전체 설치를 순차 실행한다.
 * emit(step)로 단계 상태를, onLog(text)로 터미널 로그를 내보낸다.
 */
async function runInstall({ selectedIds, emit, onLog }) {
  const results = {};
  const steps = STEPS.filter((s) => selectedIds.includes(s.id));

  for (const step of steps) {
    emit({ id: step.id, status: 'checking' });
    onLog(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n▶ [${step.title}] 설치 확인 중...\n`);

    const existing = await checkVersion(step.checkCommand);
    if (existing) {
      onLog(`✔ 이미 설치되어 있습니다: ${existing}\n`);
      emit({ id: step.id, status: 'skipped', version: existing });
      results[step.id] = 'skipped';
      continue;
    }

    // 선행 단계(Node.js 등)가 실패했으면 건너뛴다.
    const missingDep = (step.requires || []).find(
      (dep) => results[dep] === 'failed' || results[dep] === 'unavailable'
    );
    if (missingDep) {
      onLog(`✖ 선행 설치(${missingDep})가 완료되지 않아 건너뜁니다.\n`);
      emit({ id: step.id, status: 'failed', message: `${missingDep} 설치가 먼저 필요합니다.` });
      results[step.id] = 'failed';
      continue;
    }

    const command = await step.installCommand();
    if (!command) {
      onLog(`⚠ 이 시스템에서는 자동 설치를 지원하지 않습니다.\n   ${step.manualHint}\n`);
      emit({ id: step.id, status: 'unavailable', message: step.manualHint });
      results[step.id] = 'unavailable';
      continue;
    }

    emit({ id: step.id, status: 'installing' });
    onLog(`$ ${command}\n`);
    const code = await runShell(command, onLog);

    const version = await checkVersion(step.checkCommand);
    if (code === 0 && version) {
      onLog(`✔ 설치 완료: ${version}\n`);
      emit({ id: step.id, status: 'done', version });
      results[step.id] = 'done';
    } else if (version) {
      // 종료 코드는 0이 아니지만 실제로는 설치된 경우(재부팅 필요 등)
      onLog(`✔ 설치됨(확인 완료): ${version}\n`);
      emit({ id: step.id, status: 'done', version });
      results[step.id] = 'done';
    } else if (code === 0) {
      onLog('⚠ 설치는 끝났지만 아직 명령을 찾지 못했습니다. 터미널(또는 PC)을 다시 시작하면 사용할 수 있습니다.\n');
      emit({ id: step.id, status: 'done', version: '재시작 후 사용 가능' });
      results[step.id] = 'done';
    } else {
      onLog(`✖ 설치 실패 (종료 코드 ${code}). ${step.manualHint}\n`);
      emit({ id: step.id, status: 'failed', message: step.manualHint });
      results[step.id] = 'failed';
    }
  }

  onLog('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n모든 단계가 끝났습니다.\n');
  return results;
}

/** VS Code 실행 (설치돼 있으면) */
async function openIDE(onLog) {
  const code = await runShell(IS_WIN ? 'start "" code .' : 'code . || open -a "Visual Studio Code"', onLog);
  return code === 0;
}

module.exports = { STEPS, runInstall, openIDE, checkVersion };
