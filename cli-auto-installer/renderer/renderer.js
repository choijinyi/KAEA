const api = window.installerAPI;

const stepListEl = document.getElementById('step-list');
const terminalEl = document.getElementById('terminal');
const btnStart = document.getElementById('btn-start');
const btnIDE = document.getElementById('btn-ide');
const statusText = document.getElementById('status-text');
const progressText = document.getElementById('progress-text');
const platformLabel = document.getElementById('platform-label');

const ICONS = {
  pending: '○',
  checking: '🔍',
  installing: '⏳',
  done: '✅',
  skipped: '✅',
  failed: '❌',
  unavailable: '⚠️',
};
const STATUS_LABEL = {
  pending: '대기 중',
  checking: '확인 중...',
  installing: '설치 중...',
  done: '설치 완료',
  skipped: '이미 설치됨',
  failed: '실패',
  unavailable: '자동 설치 불가',
};

let steps = [];
const stepEls = {};

function log(text) {
  terminalEl.textContent += text;
  terminalEl.scrollTop = terminalEl.scrollHeight;
}

function renderStep(step) {
  const li = document.createElement('li');
  li.className = 'step-item';
  li.innerHTML = `
    <span class="step-icon">${ICONS.pending}</span>
    <div class="step-body">
      <div class="step-title"></div>
      <div class="step-desc"></div>
      <div class="step-status pending"></div>
    </div>`;
  li.querySelector('.step-title').textContent = step.title;
  li.querySelector('.step-desc').textContent = step.description;
  li.querySelector('.step-status').textContent = STATUS_LABEL.pending;
  stepListEl.appendChild(li);
  stepEls[step.id] = li;
}

function updateStep({ id, status, version, message }) {
  const li = stepEls[id];
  if (!li) return;
  li.querySelector('.step-icon').textContent = ICONS[status] || ICONS.pending;
  const st = li.querySelector('.step-status');
  st.className = `step-status ${status}`;
  st.textContent = version
    ? `${STATUS_LABEL[status]} — ${version}`
    : message || STATUS_LABEL[status];

  document.querySelectorAll('.step-item').forEach((el) => el.classList.remove('active'));
  if (status === 'checking' || status === 'installing') {
    li.classList.add('active');
    statusText.textContent = `${li.querySelector('.step-title').textContent} ${STATUS_LABEL[status]}`;
  }
  const doneCount = Object.values(stepEls).filter((el) =>
    /done|skipped|failed|unavailable/.test(el.querySelector('.step-status').className)
  ).length;
  progressText.textContent = `${doneCount} / ${steps.length}`;
}

async function init() {
  platformLabel.textContent = navigator.platform;
  steps = await api.getSteps();
  steps.forEach(renderStep);

  log('설치된 도구를 검사하고 있습니다...\n');
  const scan = await api.scan();
  let found = 0;
  for (const step of steps) {
    if (scan[step.id]) {
      found += 1;
      updateStep({ id: step.id, status: 'skipped', version: scan[step.id] });
      log(`  ✔ ${step.title}: ${scan[step.id]}\n`);
    } else {
      log(`  ○ ${step.title}: 설치되어 있지 않음\n`);
    }
  }
  log(`\n검사 완료 — ${steps.length}개 중 ${found}개가 이미 설치되어 있습니다.\n"전체 자동 설치 시작" 버튼을 누르면 나머지를 순서대로 설치합니다.\n`);
  statusText.textContent = '준비 완료';
  progressText.textContent = `0 / ${steps.length}`;
  if (scan.vscode) btnIDE.disabled = false;
}

btnStart.addEventListener('click', async () => {
  btnStart.disabled = true;
  btnStart.textContent = '⏳ 설치 진행 중...';
  statusText.textContent = '설치 진행 중';
  // 상태 초기화 후 전체 순차 설치
  const ids = steps.map((s) => s.id);
  await api.startInstall(ids);
});

btnIDE.addEventListener('click', async () => {
  log('\nVS Code를 실행합니다...\n');
  await api.openIDE();
});

api.onStepUpdate(updateStep);
api.onLog(log);
api.onFinished((results) => {
  btnStart.disabled = false;
  btnStart.textContent = '↻ 다시 검사 / 설치';
  const failed = Object.values(results).filter((r) => r === 'failed' || r === 'unavailable').length;
  statusText.textContent = failed === 0 ? '🎉 모든 설치 완료!' : `완료 (문제 ${failed}건 — 로그 확인)`;
  if (results.vscode === 'done' || results.vscode === 'skipped') {
    btnIDE.disabled = false;
    log('\n"IDE(VS Code) 열기" 버튼으로 바로 개발을 시작할 수 있습니다.\n');
  }
  log('\n※ 새로 설치된 명령어는 새 터미널 창에서 인식됩니다. 인식되지 않으면 PC를 재시작해 주세요.\n');
});

init();
