'use client';

import { useEffect, useState } from 'react';
import { Check, Copy, Download, Terminal } from 'lucide-react';

const STEPS = [
  { no: 1, name: 'Node.js (LTS)', desc: 'CLI 도구들의 실행 기반 자바스크립트 런타임' },
  { no: 2, name: 'Python 3', desc: 'AI 스크립트·도구 실행용 파이썬 런타임' },
  { no: 3, name: 'Claude Code CLI', desc: 'npm i -g @anthropic-ai/claude-code' },
  { no: 4, name: 'Gemini CLI', desc: 'npm i -g @google/gemini-cli' },
  { no: 5, name: 'ChatGPT Codex CLI', desc: 'npm i -g @openai/codex' },
  { no: 6, name: 'Visual Studio Code', desc: '설치 후 바로 열 수 있는 IDE' },
];

function CommandBox({ label, command }: { label: string; command: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/70">
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-2">
        <span className="flex items-center gap-2 text-sm font-medium text-zinc-300">
          <Terminal className="h-4 w-4 text-emerald-400" /> {label}
        </span>
        <button
          onClick={copy}
          className="flex items-center gap-1.5 rounded-md border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300 transition hover:bg-zinc-800"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? '복사됨!' : '복사'}
        </button>
      </div>
      <pre className="overflow-x-auto px-4 py-3 text-sm leading-relaxed text-emerald-300">
        <code>{command}</code>
      </pre>
    </div>
  );
}

export default function InstallerPage() {
  const [origin, setOrigin] = useState('');
  useEffect(() => setOrigin(window.location.origin), []);
  const base = origin || 'https://<배포주소>';

  return (
    <main className="mx-auto max-w-3xl px-5 py-14">
      <header className="mb-10 text-center">
        <p className="mb-3 inline-block rounded-full border border-emerald-800 bg-emerald-950/60 px-3 py-1 text-xs font-medium text-emerald-300">
          AI 개발 환경 원클릭 설치
        </p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">AI CLI Auto Installer</h1>
        <p className="mt-3 text-zinc-400">
          터미널에 명령 한 줄만 붙여넣으면 Node.js · Python · Claude · Gemini · Codex CLI · VS Code를
          <br className="hidden sm:block" /> 순서대로 자동 설치합니다. 이미 설치된 항목은 건너뜁니다.
        </p>
      </header>

      <section className="mb-10 space-y-4">
        <h2 className="text-lg font-semibold text-zinc-200">🪟 Windows — PowerShell에 붙여넣기</h2>
        <CommandBox label="PowerShell (Win + X → 터미널)" command={`irm ${base}/install.ps1 | iex`} />

        <h2 className="pt-4 text-lg font-semibold text-zinc-200">🍎 macOS / 🐧 Linux — 터미널에 붙여넣기</h2>
        <CommandBox label="Terminal" command={`curl -fsSL ${base}/install.sh | bash`} />
      </section>

      <section className="mb-10">
        <h2 className="mb-4 text-lg font-semibold text-zinc-200">설치 순서</h2>
        <ol className="space-y-2">
          {STEPS.map((s) => (
            <li
              key={s.no}
              className="flex items-center gap-4 rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-sm font-bold text-emerald-400">
                {s.no}
              </span>
              <div>
                <p className="font-medium text-zinc-100">{s.name}</p>
                <p className="text-sm text-zinc-500">{s.desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="mb-10 rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <h2 className="mb-2 flex items-center gap-2 text-lg font-semibold text-zinc-200">
          <Download className="h-5 w-5 text-emerald-400" /> 데스크탑 앱으로 설치하기
        </h2>
        <p className="text-sm leading-relaxed text-zinc-400">
          터미널이 익숙하지 않다면 IDE 스타일 화면에서 버튼 한 번으로 설치하는 데스크탑 앱(Electron)도 있습니다.
          저장소의 <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-emerald-300">cli-auto-installer</code> 폴더에서{' '}
          <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-emerald-300">npm install &amp;&amp; npm start</code>로 실행하거나,{' '}
          <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-emerald-300">npm run dist:win</code>으로 설치용 exe를 만들 수 있습니다.
        </p>
      </section>

      <footer className="border-t border-zinc-800 pt-6 text-center text-sm text-zinc-500">
        <p>
          설치 후 새 터미널에서 <code className="text-emerald-400">claude</code> ·{' '}
          <code className="text-emerald-400">gemini</code> · <code className="text-emerald-400">codex</code> 를 실행해 보세요.
        </p>
        <p className="mt-1">각 CLI의 로그인/API 키 설정은 첫 실행 시 도구가 안내합니다.</p>
      </footer>
    </main>
  );
}
