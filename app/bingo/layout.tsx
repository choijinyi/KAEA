import {ReactNode} from 'react';

// 빙고 게임은 루트 앱(다크)과 달리 밝은 테마를 사용한다.
export default function BingoLayout({children}: {children: ReactNode}) {
  return (
    <div className="bingo-light relative min-h-screen overflow-x-hidden bg-gradient-to-b from-violet-100 via-white to-amber-50 text-zinc-900">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-violet-300/30 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-40 -right-24 h-72 w-72 rounded-full bg-amber-200/40 blur-3xl"
      />
      <div className="relative">{children}</div>
    </div>
  );
}
