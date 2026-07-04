'use client';

import Link from 'next/link';
import {useEffect, useMemo, useRef, useState} from 'react';
import {
  BingoGame,
  TOTAL_ANSWERS,
  TOTAL_NAMES,
  fetchGame,
  joinGame,
  matchAnswer,
  parseNames,
  scorePlayer,
  subscribeToGame,
} from '@/lib/bingo';

const playerKey = (code: string) => `bingo-player-${code}`;

interface SavedPlayer {
  nickname: string;
  names: string[];
}

export default function BingoPlay({initialCode}: {initialCode?: string}) {
  const [game, setGame] = useState<BingoGame | null>(null);
  const [player, setPlayer] = useState<SavedPlayer | null>(null);

  // 같은 게임에 이미 참가했다면 바로 게임 화면으로
  useEffect(() => {
    if (!game) return;
    const saved = localStorage.getItem(playerKey(game.code));
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as SavedPlayer;
        if (parsed.nickname && Array.isArray(parsed.names) && parsed.names.length === TOTAL_NAMES) {
          setPlayer(parsed);
        }
      } catch {
        localStorage.removeItem(playerKey(game.code));
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
          🙋 참가자
        </span>
      </header>

      {!game ? (
        <JoinPanel initialCode={initialCode} onJoined={setGame} />
      ) : !player ? (
        <WritePanel
          game={game}
          onDone={p => {
            localStorage.setItem(playerKey(game.code), JSON.stringify(p));
            setPlayer(p);
          }}
        />
      ) : (
        <PlayPanel game={game} player={player} onGameChange={setGame} />
      )}
    </main>
  );
}

function JoinPanel({
  initialCode,
  onJoined,
}: {
  initialCode?: string;
  onJoined: (game: BingoGame) => void;
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
      const game = await fetchGame(clean);
      if (!game) setError(`코드 ${clean} 게임을 찾을 수 없어요. 코드를 다시 확인해주세요.`);
      else if (game.mode === 'classic')
        setError(`코드 ${game.code}는 클래식 빙고 게임이에요. 클래식 빙고 참가 화면을 이용해주세요.`);
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

function WritePanel({game, onDone}: {game: BingoGame; onDone: (player: SavedPlayer) => void}) {
  const [nickname, setNickname] = useState('');
  const [raw, setRaw] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const names = useMemo(() => parseNames(raw), [raw]);
  const ready = names.length === TOTAL_NAMES && nickname.trim().length > 0;

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      await joinGame(game.code, nickname.trim(), names);
      onDone({nickname: nickname.trim(), names});
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">{game.title}</h1>
        <p className="mt-1 text-sm leading-relaxed text-zinc-400">
          정답이 될 것 같은 이름 {TOTAL_NAMES}개를 적어주세요. 진행자가 정답 보드에 적는
          이름과 일치하면 자동으로 줄이 그어지고 점수를 얻습니다.
        </p>
      </div>

      <label className="block">
        <span className="mb-1 block text-sm text-zinc-300">내 별명</span>
        <input
          className="input w-full"
          placeholder="순위표에 표시될 이름"
          value={nickname}
          onChange={e => setNickname(e.target.value)}
          maxLength={20}
        />
      </label>

      <label className="block">
        <span className="mb-1 flex items-baseline justify-between text-sm text-zinc-300">
          <span>이름 {TOTAL_NAMES}개 (줄바꿈 또는 쉼표로 구분)</span>
          <span
            className={
              names.length === TOTAL_NAMES ? 'font-semibold text-emerald-400' : 'text-zinc-500'
            }
          >
            {names.length} / {TOTAL_NAMES}개
          </span>
        </span>
        <textarea
          className="input h-56 w-full resize-y font-mono text-sm"
          placeholder={'김철수\n이영희\n박민수\n…'}
          value={raw}
          onChange={e => setRaw(e.target.value)}
        />
      </label>

      {names.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {names.map(name => (
            <span
              key={name}
              className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-xs text-zinc-300"
            >
              {name}
            </span>
          ))}
        </div>
      )}

      {names.length > TOTAL_NAMES && (
        <p className="text-sm text-amber-400">
          이름이 {names.length - TOTAL_NAMES}개 많습니다. {TOTAL_NAMES}개만 남겨주세요.
        </p>
      )}
      {error && <p className="text-sm text-red-400">{error}</p>}

      <button className="btn-primary w-full py-3 text-base" disabled={!ready || busy} onClick={submit}>
        {busy
          ? '제출 중…'
          : ready
            ? '이 이름들로 참가하기 🚀'
            : !nickname.trim()
              ? '별명을 입력하세요'
              : `이름 ${TOTAL_NAMES}개를 입력하세요`}
      </button>
    </section>
  );
}

function PlayPanel({
  game,
  player,
  onGameChange,
}: {
  game: BingoGame;
  player: SavedPlayer;
  onGameChange: (game: BingoGame) => void;
}) {
  const {matched, score} = useMemo(
    () => scorePlayer(player.names, game.answers),
    [player.names, game.answers],
  );
  const lastAnswer = game.answers[game.answers.length - 1];
  const prevScore = useRef(score);
  const [celebrate, setCelebrate] = useState<number | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToGame(game.code, onGameChange);
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.code]);

  // 점수가 오르면 축하 효과
  useEffect(() => {
    if (score > prevScore.current) {
      setCelebrate(score - prevScore.current);
      const t = setTimeout(() => setCelebrate(null), 2500);
      prevScore.current = score;
      return () => clearTimeout(t);
    }
    prevScore.current = score;
  }, [score]);

  const done = game.answers.length >= TOTAL_ANSWERS;

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-xl font-bold">{game.title}</h1>
          <p className="text-xs text-zinc-500">
            {player.nickname} · 코드 {game.code} · 정답 {game.answers.length}/{TOTAL_ANSWERS} 공개
          </p>
        </div>
        <div className="ml-auto rounded-xl border border-violet-500/40 bg-violet-600/20 px-4 py-2 text-center">
          <p className="text-[10px] text-violet-300">내 점수</p>
          <p className="text-2xl leading-none font-bold text-violet-200">{score}점</p>
        </div>
      </div>

      {lastAnswer && (
        <p className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3 text-center text-sm text-zinc-300">
          방금 공개된 정답 → <b className="text-lg text-violet-300">{lastAnswer.name}</b>{' '}
          <span className="font-semibold text-amber-300">({lastAnswer.points}점)</span>
        </p>
      )}

      <div className="relative">
        {celebrate !== null && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
            <p className="animate-bounce rounded-2xl bg-violet-600 px-8 py-4 text-3xl font-black text-white shadow-2xl shadow-violet-500/50">
              🎉 +{celebrate}점!
            </p>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {player.names.map(name => {
            const hit = matchAnswer(name, game.answers);
            return (
              <span
                key={name}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-all duration-500 ${
                  hit
                    ? 'border-amber-400/60 bg-amber-500/15 text-zinc-400'
                    : 'border-zinc-700 bg-zinc-800 text-zinc-100'
                }`}
              >
                <span className={hit ? 'line-through decoration-amber-400 decoration-2' : ''}>
                  {name}
                </span>
                {hit && <b className="text-xs text-amber-300">+{hit.points}</b>}
              </span>
            );
          })}
        </div>
      </div>

      <p className="text-sm text-zinc-400">
        <b className="text-zinc-200">{matched.length}</b>개 적중 · 진행자가 정답을 적으면
        자동으로 줄이 그어집니다.
      </p>

      {done && (
        <p className="rounded-xl border border-violet-500/40 bg-violet-600/15 p-4 text-center text-lg font-bold text-violet-200">
          🏁 정답이 모두 공개됐어요! 최종 점수 {score}점 ({matched.length}개 적중)
        </p>
      )}

      {game.answers.length > 0 && (
        <details className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 text-sm">
          <summary className="cursor-pointer text-zinc-400">
            공개된 정답 전체 보기 ({game.answers.length})
          </summary>
          <ol className="mt-2 flex flex-wrap gap-1.5">
            {game.answers.map((a, i) => (
              <li
                key={`${a.name}-${i}`}
                className="rounded-md border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300"
              >
                {i + 1}. {a.name} <b className="text-amber-300">{a.points}점</b>
              </li>
            ))}
          </ol>
        </details>
      )}
    </section>
  );
}
