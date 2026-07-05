import type {Metadata} from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '이름 빙고 — 퀴즈 빙고 & 클래식 빙고',
  description:
    '진행자와 참가자가 실시간으로 함께하는 이름 빙고. 점수제 퀴즈 빙고와 5×5 클래식 빙고 두 가지 모드를 지원합니다.',
};

export default function BingoHome() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-10 px-6 py-16">
      <div className="text-center">
        <p className="text-6xl drop-shadow-sm">🎯</p>
        <h1 className="mt-4 text-5xl font-black tracking-tight text-zinc-900">
          이름 <span className="gradient-text">빙고</span>
        </h1>
        <p className="mt-4 leading-relaxed text-zinc-600">
          진행자가 이름을 적거나 지우면 참가자 화면에 실시간으로 반영되는 이름 빙고.
          <br />
          두 가지 모드 중 골라서 시작하세요.
        </p>
      </div>

      <div className="grid w-full gap-5 sm:grid-cols-2">
        <div className="flex flex-col rounded-3xl border border-violet-200 bg-white p-6 shadow-xl shadow-violet-200/60 transition hover:-translate-y-1 hover:shadow-2xl hover:shadow-violet-300/60">
          <p className="text-3xl">🧠</p>
          <h2 className="mt-3 text-xl font-bold text-zinc-900">퀴즈 빙고</h2>
          <p className="mt-2 flex-1 text-sm leading-relaxed text-zinc-600">
            참가자가 정답이 될 것 같은 이름 25개를 적고, 진행자가 정답 보드에{' '}
            <b className="text-violet-700">100·200·300·500점</b> 이름을 3개씩(총 12개) 적으면
            일치한 이름에 줄이 그어지며 점수를 얻어요. 실시간 순위표로 우승자를 가려요.
          </p>
          <div className="mt-5 flex gap-2">
            <Link href="/bingo/host" className="btn-primary flex-1 text-center text-sm">
              🎤 진행자
            </Link>
            <Link href="/bingo/play" className="btn-secondary flex-1 text-center">
              🙋 참가자
            </Link>
          </div>
        </div>

        <div className="flex flex-col rounded-3xl border border-amber-200 bg-white p-6 shadow-xl shadow-amber-200/60 transition hover:-translate-y-1 hover:shadow-2xl hover:shadow-amber-300/60">
          <p className="text-3xl">🎲</p>
          <h2 className="mt-3 text-xl font-bold text-zinc-900">클래식 빙고</h2>
          <p className="mt-2 flex-1 text-sm leading-relaxed text-zinc-600">
            진행자가 이름 25개를 등록하면 참가자는 그 이름들로 자신만의{' '}
            <b className="text-amber-700">5×5 빙고판</b>을 만들어요. 진행자가 이름을 지우면
            판에서 자동으로 지워지고, 가로·세로·대각선 줄을 먼저 완성하면 빙고!
          </p>
          <div className="mt-5 flex gap-2">
            <Link href="/bingo/classic/host" className="btn-primary flex-1 text-center text-sm">
              🎤 진행자
            </Link>
            <Link href="/bingo/classic/play" className="btn-secondary flex-1 text-center">
              🙋 참가자
            </Link>
          </div>
        </div>
      </div>

      <p className="text-center text-xs leading-relaxed text-zinc-500">
        게임 코드 하나로 참가자 수 제한 없이 함께할 수 있어요 · 진행자의 조작은 모든 참가자
        화면에 실시간으로 반영됩니다
      </p>
    </main>
  );
}
