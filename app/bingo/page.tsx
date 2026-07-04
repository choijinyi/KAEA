import type {Metadata} from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '이름 빙고 — 25명 이름으로 하는 실시간 빙고',
  description:
    '진행자가 이름을 지우면 참가자의 빙고판에서 실시간으로 함께 지워지는 이름 빙고 게임.',
};

export default function BingoHome() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-10 px-6 py-16">
      <div className="text-center">
        <p className="text-5xl">🎯</p>
        <h1 className="mt-4 text-4xl font-bold tracking-tight">
          이름 <span className="gradient-text">빙고</span>
        </h1>
        <p className="mt-3 leading-relaxed text-zinc-400">
          25명의 이름으로 하는 실시간 빙고 게임.
          <br />
          진행자가 이름을 지우면 모두의 빙고판에서 함께 지워집니다.
        </p>
      </div>

      <div className="flex w-full flex-col gap-4">
        <Link
          href="/bingo/host"
          className="rounded-2xl border border-violet-500/40 bg-violet-600/20 p-6 text-center transition hover:bg-violet-600/30"
        >
          <p className="text-2xl">🎤</p>
          <p className="mt-2 text-lg font-semibold">진행자로 시작</p>
          <p className="mt-1 text-sm text-zinc-400">
            이름 25개를 등록하고 게임을 만들어요
          </p>
        </Link>
        <Link
          href="/bingo/play"
          className="rounded-2xl border border-zinc-700 bg-zinc-900 p-6 text-center transition hover:bg-zinc-800"
        >
          <p className="text-2xl">🙋</p>
          <p className="mt-2 text-lg font-semibold">참가자로 입장</p>
          <p className="mt-1 text-sm text-zinc-400">
            게임 코드를 입력하고 나만의 빙고판을 만들어요
          </p>
        </Link>
      </div>

      <ol className="w-full space-y-2 rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 text-sm leading-relaxed text-zinc-400">
        <li>1. 진행자가 이름 25개로 게임을 만들고 코드를 공유해요.</li>
        <li>2. 참가자는 25개의 이름을 원하는 위치에 배치해 빙고판을 완성해요.</li>
        <li>3. 진행자가 이름을 하나씩 지우면, 참가자의 판에서 자동으로 지워져요.</li>
        <li>4. 가로·세로·대각선 줄을 먼저 완성하면 빙고!</li>
      </ol>
    </main>
  );
}
