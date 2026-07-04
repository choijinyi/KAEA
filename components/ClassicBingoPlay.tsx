'use client';

import Link from 'next/link';
import {useEffect, useMemo, useRef, useState} from 'react';
import {
  BOARD_SIZE,
  ClassicGame,
  TOTAL_NAMES,
  completedLines,
  fetchClassicGame,
  shuffle,
  subscribeToClassicGame,
} from '@/lib/bingo-classic';

const boardKey = (code: string) => `bingo-board-${code}`;

export default function ClassicBingoPlay({initialCode}: {initialCode?: string}) {
  const [game, setGame] = useState<ClassicGame | null>(null);
  const [board, setBoard] = useState<string[] | null>(null);

  // 저장된 빙고판이 있으면 바로 게임 화면으로
  useEffect(() => {
    if (!game) return;
    const saved = localStorage.getItem(boardKey(game.code));
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as string[];
        if (
          Array.isArray(parsed) &&
          parsed.length === TOTAL_NAMES &&
          parsed.every(n => game.names.includes(n))
        ) {
          setBoard(parsed);
        }
      } catch {
        localStorage.removeItem(boardKey(game.code));
      }
    }
  }, [game]);

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-4 py-8 sm:px-6">
      <header className="mb-6 flex items-center justify-between">
        <Link href="/bingo" className="text-sm text-zinc-400 transition hover:text-zinc-200">
          ← 이름 빙고
        </Link>
        <span className="rounded-full border border-zinc-700 bg-zinc-800 px-3 py-1 text-xs font-medium text-zinc-300">
          🙋 참가자 · 클래식
        </span>
      </header>

      {!game ? (
        <JoinPanel initialCode={initialCode} onJoined={setGame} />
      ) : !board ? (
        <BuildPanel
          game={game}
          onDone={b => {
            localStorage.setItem(boardKey(game.code), JSON.stringify(b));
            setBoard(b);
          }}
        />
      ) : (
        <PlayPanel
          game={game}
          board={board}
          onGameChange={setGame}
          onRebuild={() => {
            localStorage.removeItem(boardKey(game.code));
            setBoard(null);
          }}
        />
      )}
    </main>
  );
}

function JoinPanel({
  initialCode,
  onJoined,
}: {
  initialCode?: string;
  onJoined: (game: ClassicGame) => void;
}) {
  const [code, setCode] = useState(initialCode?.toUpperCase() ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const autoTried = useRef(false);

  const join = async (target: string) => {
    const clean = target.trim().toUpperCase();
    if (!clean) return;
    setBusy(true);
    setError('');
    try {
      const game = await fetchClassicGame(clean);
      if (!game) setError(`코드 ${clean} 게임을 찾을 수 없어요. 코드를 다시 확인해주세요.`);
      else if (game.mode !== 'classic')
        setError(`코드 ${game.code}는 퀴즈 빙고 게임이에요. 퀴즈 빙고 참가 화면을 이용해주세요.`);
      else onJoined(game);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  // 링크의 ?code= 로 들어온 경우 자동 입장
  useEffect(() => {
    if (initialCode && !autoTried.current) {
      autoTried.current = true;
      join(initialCode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCode]);

  return (
    <section className="mx-auto max-w-sm space-y-5 pt-8 text-center">
      <p className="text-4xl">🎟️</p>
      <h1 className="text-2xl font-bold">게임 입장</h1>
      <p className="text-sm text-zinc-400">진행자에게 받은 6자리 게임 코드를 입력하세요.</p>
      <form
        className="space-y-3"
        onSubmit={e => {
          e.preventDefault();
          join(code);
        }}
      >
        <input
          className="input w-full text-center text-2xl font-bold tracking-[0.3em] uppercase"
          placeholder="ABC123"
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase())}
          maxLength={6}
          autoFocus
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button className="btn-primary w-full py-3" disabled={code.trim().length < 6 || busy}>
          {busy ? '입장 중…' : '입장하기'}
        </button>
      </form>
    </section>
  );
}

function BuildPanel({game, onDone}: {game: ClassicGame; onDone: (board: string[]) => void}) {
  const [placed, setPlaced] = useState<string[]>([]);
  const placedSet = useMemo(() => new Set(placed), [placed]);
  const remaining = game.names.filter(n => !placedSet.has(n));
  const done = placed.length === TOTAL_NAMES;

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">{game.title}</h1>
        <p className="mt-1 text-sm text-zinc-400">
          이름을 눌러 빙고판을 채우세요. 판의 이름을 누르면 되돌릴 수 있어요.
        </p>
      </div>

      <div className="grid grid-cols-5 gap-1.5">
        {Array.from({length: TOTAL_NAMES}, (_, i) => {
          const name = placed[i];
          const isNext = i === placed.length;
          return (
            <button
              key={i}
              disabled={!name}
              onClick={() => name && setPlaced(placed.filter(n => n !== name))}
              className={`flex aspect-square cursor-pointer items-center justify-center rounded-lg border p-1 text-center text-[11px] leading-tight font-medium break-keep sm:text-sm ${
                name
                  ? 'border-violet-500/40 bg-violet-600/20 text-zinc-100 hover:bg-violet-600/30'
                  : isNext
                    ? 'border-dashed border-violet-400 bg-zinc-900'
                    : 'border-dashed border-zinc-800 bg-zinc-900/50'
              }`}
            >
              {name ?? (isNext ? '▼' : '')}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-400">
          남은 이름 <b className="text-zinc-200">{remaining.length}</b>개
        </p>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={() => setPlaced([])} disabled={!placed.length}>
            초기화
          </button>
          <button
            className="btn-secondary"
            onClick={() => setPlaced([...placed, ...shuffle(remaining)])}
            disabled={done}
          >
            🎲 랜덤 채우기
          </button>
        </div>
      </div>

      {!done && (
        <div className="flex flex-wrap gap-1.5">
          {remaining.map(name => (
            <button
              key={name}
              onClick={() => setPlaced([...placed, name])}
              className="cursor-pointer rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-100 transition hover:border-violet-400"
            >
              {name}
            </button>
          ))}
        </div>
      )}

      <button className="btn-primary w-full py-3 text-base" disabled={!done} onClick={() => onDone(placed)}>
        {done ? '이 빙고판으로 시작! 🚀' : `${TOTAL_NAMES - placed.length}칸 남았어요`}
      </button>
    </section>
  );
}

function PlayPanel({
  game,
  board,
  onGameChange,
  onRebuild,
}: {
  game: ClassicGame;
  board: string[];
  onGameChange: (game: ClassicGame) => void;
  onRebuild: () => void;
}) {
  const calledSet = useMemo(() => new Set(game.called), [game.called]);
  const lines = useMemo(() => completedLines(board, calledSet), [board, calledSet]);
  const lineCells = useMemo(() => new Set(lines.flat()), [lines]);
  const lastCalled = game.called[game.called.length - 1];
  const [flash, setFlash] = useState('');
  const prevLineCount = useRef(lines.length);
  const [celebrate, setCelebrate] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToClassicGame(game.code, onGameChange);
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.code]);

  // 방금 지워진 이름 강조 + 새 빙고 줄 축하 효과
  useEffect(() => {
    if (lastCalled) {
      setFlash(lastCalled);
      const t = setTimeout(() => setFlash(''), 2000);
      return () => clearTimeout(t);
    }
  }, [lastCalled]);

  useEffect(() => {
    if (lines.length > prevLineCount.current) {
      setCelebrate(true);
      const t = setTimeout(() => setCelebrate(false), 2500);
      prevLineCount.current = lines.length;
      return () => clearTimeout(t);
    }
    prevLineCount.current = lines.length;
  }, [lines.length]);

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-xl font-bold">{game.title}</h1>
          <p className="text-xs text-zinc-500">
            코드 {game.code} · 실시간 연결됨 · {game.called.length}개 지워짐
          </p>
        </div>
        <div className="ml-auto rounded-xl border border-violet-500/40 bg-violet-600/20 px-4 py-2 text-center">
          <p className="text-[10px] text-violet-300">빙고</p>
          <p className="text-2xl leading-none font-bold text-violet-200">{lines.length}줄</p>
        </div>
      </div>

      {lastCalled && (
        <p className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3 text-center text-sm text-zinc-300">
          방금 지워진 이름 → <b className="text-lg text-violet-300">{lastCalled}</b>
        </p>
      )}

      <div className="relative">
        {celebrate && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
            <p className="animate-bounce rounded-2xl bg-violet-600 px-8 py-4 text-3xl font-black text-white shadow-2xl shadow-violet-500/50">
              🎉 빙고 {lines.length}줄!
            </p>
          </div>
        )}
        <div
          className="grid gap-1.5"
          style={{gridTemplateColumns: `repeat(${BOARD_SIZE}, minmax(0, 1fr))`}}
        >
          {board.map((name, i) => {
            const called = calledSet.has(name);
            const inLine = lineCells.has(i);
            const isFlash = name === flash;
            return (
              <div
                key={i}
                className={`flex aspect-square items-center justify-center rounded-lg border p-1 text-center text-[11px] leading-tight font-medium break-keep transition-all duration-500 sm:text-sm ${
                  inLine
                    ? 'border-amber-400 bg-amber-500/25 text-amber-100'
                    : called
                      ? 'border-violet-500/50 bg-violet-600/30 text-zinc-400 line-through'
                      : 'border-zinc-700 bg-zinc-800 text-zinc-100'
                } ${isFlash ? 'scale-105 ring-2 ring-violet-400' : ''}`}
              >
                {name}
              </div>
            );
          })}
        </div>
      </div>

      {game.called.length > 0 && (
        <details className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 text-sm">
          <summary className="cursor-pointer text-zinc-400">
            지워진 이름 전체 보기 ({game.called.length})
          </summary>
          <ol className="mt-2 flex flex-wrap gap-1.5">
            {game.called.map((name, i) => (
              <li
                key={name}
                className="rounded-md border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300"
              >
                {i + 1}. {name}
              </li>
            ))}
          </ol>
        </details>
      )}

      <button className="btn-secondary w-full" onClick={onRebuild}>
        빙고판 다시 만들기
      </button>
    </section>
  );
}
