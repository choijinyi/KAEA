import type {Metadata} from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '이름 빙고 — 이름 25개 적고 정답을 맞히는 실시간 빙고',
  description:
    '참가자가 이름 25개를 적고, 진행자가 정답 보드에 이름을 적으면 실시간으로 줄이 그어지며 점수를 얻는 퀴즈형 빙고 게임.',
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
          이름 25개를 적고 정답을 맞히는 퀴즈형 빙고.
          <br />
          진행자가 정답을 적으면 내 이름에 실시간으로 줄이 그어집니다.
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
            게임을 만들고 정답 보드에 이름을 적어요
          </p>
        </Link>
        <Link
          href="/bingo/play"
          className="rounded-2xl border border-zinc-700 bg-zinc-900 p-6 text-center transition hover:bg-zinc-800"
        >
          <p className="text-2xl">🙋</p>
          <p className="mt-2 text-lg font-semibold">참가자로 입장</p>
          <p className="mt-1 text-sm text-zinc-400">
            게임 코드로 입장해 이름 25개를 적어요
          </p>
        </Link>
      </div>

      <ol className="w-full space-y-2 rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 text-sm leading-relaxed text-zinc-400">
        <li>1. 진행자가 게임을 만들고 코드를 공유해요.</li>
        <li>2. 참가자는 정답이 될 것 같은 이름 25개를 적어요.</li>
        <li>
          3. 진행자는 정답 보드에 <b className="text-zinc-200">100·200·300·500점</b> 이름을
          3개씩(총 12개) 적어요.
        </li>
        <li>4. 정답과 일치한 이름은 자동으로 줄이 그어지고 점수를 얻어요.</li>
        <li>5. 정답 12개가 모두 공개되면 점수가 가장 높은 사람이 우승! 🏆</li>
      </ol>
    </main>
  );
}
