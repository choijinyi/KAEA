'use client';

import Link from 'next/link';
import {useEffect, useMemo, useRef, useState} from 'react';
import {
  ANSWERS_PER_TIER,
  Answer,
  BingoGame,
  BingoPlayer,
  TIERS,
  TOTAL_ANSWERS,
  createGame,
  fetchGame,
  normalizeName,
  scorePlayer,
  subscribeToPlayers,
  updateAnswers,
} from '@/lib/bingo';

const LAST_HOST_KEY = 'bingo-last-host-code';

const TIER_STYLE: Record<number, string> = {
  100: 'border-sky-500/40 bg-sky-600/15 text-sky-200',
  200: 'border-emerald-500/40 bg-emerald-600/15 text-emerald-200',
  300: 'border-amber-500/40 bg-amber-600/15 text-amber-200',
  500: 'border-rose-500/40 bg-rose-600/15 text-rose-200',
};

export default function BingoHost({resumeCode}: {resumeCode?: string}) {
  const [game, setGame] = useState<BingoGame | null>(null);
  const [loading, setLoading] = useState(Boolean(resumeCode));
  const [error, setError] = useState('');
  const [lastCode, setLastCode] = useState('');

  useEffect(() => {
    if (!resumeCode) {
      setLastCode(localStorage.getItem(LAST_HOST_KEY) ?? '');
      return;
    }
    fetchGame(resumeCode)
      .then(found => {
        if (!found) setError(`코드 ${resumeCode.toUpperCase()} 게임을 찾을 수 없습니다.`);
        else if (found.mode === 'classic')
          setError(`코드 ${found.code}는 클래식 빙고 게임이에요. 클래식 빙고 진행자 화면을 이용해주세요.`);
        else setGame(found);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [resumeCode]);

  if (loading) {
    return <Shell><p className="py-24 text-center text-zinc-400">게임을 불러오는 중…</p></Shell>;
  }

  return (
    <Shell>
      {error && (
        <p className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </p>
      )}
      {game ? (
        <HostGamePanel game={game} onGameChange={setGame} />
      ) : (
        <SetupPanel lastCode={lastCode} onCreated={setGame} />
      )}
    </Shell>
  );
}

function Shell({children}: {children: React.ReactNode}) {
  return (
    <main className="mx-auto min-h-screen max-w-4xl px-4 py-8 sm:px-6">
      <header className="mb-6 flex items-center justify-between">
        <Link href="/bingo" className="text-sm text-zinc-400 transition hover:text-zinc-200">
          ← 이름 빙고
        </Link>
        <span className="rounded-full border border-violet-500/40 bg-violet-600/20 px-3 py-1 text-xs font-medium text-violet-300">
          🎤 진행자
        </span>
      </header>
      {children}
    </main>
  );
}

function SetupPanel({
  lastCode,
  onCreated,
}: {
  lastCode: string;
  onCreated: (game: BingoGame) => void;
}) {
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    setBusy(true);
    setError('');
    try {
      const game = await createGame(title.trim() || '이름 빙고');
      localStorage.setItem(LAST_HOST_KEY, game.code);
      onCreated(game);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mx-auto max-w-md space-y-5 pt-8">
      <div className="text-center">
        <p className="text-4xl">🎤</p>
        <h1 className="mt-3 text-2xl font-bold">새 게임 만들기</h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">
          게임을 만들면 참가자용 코드가 발급됩니다. 참가자들이 이름 25개를 적는 동안
          진행자는 정답 보드에 100·200·300·500점짜리 이름을 3개씩 적어 공개합니다.
        </p>
      </div>

      {lastCode && (
        <Link
          href={`/bingo/host?code=${lastCode}`}
          className="block rounded-lg border border-zinc-700 bg-zinc-900 p-3 text-sm text-zinc-300 transition hover:bg-zinc-800"
        >
          ▶️ 최근 게임 이어서 진행하기 — 코드 <b className="text-violet-300">{lastCode}</b>
        </Link>
      )}

      <label className="block">
        <span className="mb-1 block text-sm text-zinc-300">게임 이름 (선택)</span>
        <input
          className="input w-full"
          placeholder="예) 우리 반 이름 맞히기 빙고"
          value={title}
          onChange={e => setTitle(e.target.value)}
          maxLength={40}
        />
      </label>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button className="btn-primary w-full py-3 text-base" disabled={busy} onClick={handleCreate}>
        {busy ? '만드는 중…' : '게임 만들기 🎲'}
      </button>
    </section>
  );
}

function HostGamePanel({
  game,
  onGameChange,
}: {
  game: BingoGame;
  onGameChange: (game: BingoGame) => void;
}) {
  const [players, setPlayers] = useState<BingoPlayer[]>([]);
  const [copied, setCopied] = useState<'link' | 'code' | null>(null);
  const [syncError, setSyncError] = useState('');
  // 연타 시 마지막 상태만 저장되도록 요청 순서를 직렬화
  const pending = useRef(Promise.resolve());

  useEffect(() => subscribeToPlayers(game.code, setPlayers), [game.code]);

  const joinUrl =
    typeof window === 'undefined'
      ? ''
      : `${window.location.origin}/bingo/play?code=${game.code}`;

  const copy = async (text: string, kind: 'link' | 'code') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      prompt('복사가 지원되지 않아요. 직접 복사해주세요:', text);
    }
  };

  const saveAnswers = (answers: Answer[]) => {
    onGameChange({...game, answers});
    setSyncError('');
    pending.current = pending.current.then(() =>
      updateAnswers(game.code, answers).catch(() =>
        setSyncError('저장에 실패했어요. 네트워크를 확인하고 다시 시도해주세요.'),
      ),
    );
  };

  const addAnswer = (points: number, name: string) => {
    const clean = name.trim();
    if (!clean) return '이름을 입력하세요.';
    if (game.answers.some(a => normalizeName(a.name) === normalizeName(clean))) {
      return '이미 적은 정답입니다.';
    }
    if (game.answers.filter(a => a.points === points).length >= ANSWERS_PER_TIER) {
      return `${points}점 정답은 ${ANSWERS_PER_TIER}개까지만 적을 수 있어요.`;
    }
    saveAnswers([...game.answers, {name: clean, points}]);
    return '';
  };

  const removeAnswer = (answer: Answer) => {
    saveAnswers(game.answers.filter(a => a !== answer));
  };

  const ranking = useMemo(
    () =>
      players
        .map(p => ({player: p, ...scorePlayer(p.names, game.answers)}))
        .sort((a, b) => b.score - a.score || a.player.created_at.localeCompare(b.player.created_at)),
    [players, game.answers],
  );

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
        <h1 className="text-xl font-bold">{game.title}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <div>
            <p className="text-xs text-zinc-500">게임 코드</p>
            <p className="text-3xl font-bold tracking-[0.2em] text-violet-300">{game.code}</p>
          </div>
          <div className="ml-auto flex gap-2">
            <button className="btn-secondary" onClick={() => copy(game.code, 'code')}>
              {copied === 'code' ? '✅ 복사됨' : '코드 복사'}
            </button>
            <button className="btn-secondary" onClick={() => copy(joinUrl, 'link')}>
              {copied === 'link' ? '✅ 복사됨' : '참가 링크 복사'}
            </button>
          </div>
        </div>
        <p className="mt-3 break-all text-xs text-zinc-500">{joinUrl}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-semibold">📝 정답 보드</h2>
            <span className="text-sm text-zinc-400">
              <b className="text-violet-300">{game.answers.length}</b> / {TOTAL_ANSWERS} 공개
            </span>
          </div>
          <p className="mb-3 text-sm text-zinc-400">
            정답을 적는 순간 참가자 화면에서 해당 이름에 줄이 그어지고 점수가 올라갑니다.
          </p>
          {syncError && <p className="mb-2 text-sm text-red-400">{syncError}</p>}
          <div className="space-y-3">
            {TIERS.map(points => (
              <TierRow
                key={points}
                points={points}
                answers={game.answers.filter(a => a.points === points)}
                onAdd={name => addAnswer(points, name)}
                onRemove={removeAnswer}
              />
            ))}
          </div>
        </div>

        <div>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-semibold">🏆 실시간 순위</h2>
            <span className="text-sm text-zinc-400">참가자 {players.length}명</span>
          </div>
          {ranking.length === 0 ? (
            <p className="rounded-lg border border-dashed border-zinc-700 p-6 text-center text-sm text-zinc-500">
              아직 참가자가 없어요.
              <br />
              코드나 링크를 공유해주세요!
            </p>
          ) : (
            <ol className="space-y-1.5">
              {ranking.map(({player, matched, score}, i) => (
                <li
                  key={player.id}
                  className={`flex items-center gap-3 rounded-lg border p-2.5 ${
                    i === 0 && score > 0
                      ? 'border-amber-400/50 bg-amber-500/10'
                      : 'border-zinc-800 bg-zinc-900/60'
                  }`}
                >
                  <span className="w-7 text-center text-sm font-bold text-zinc-400">
                    {i === 0 && score > 0 ? '👑' : i + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-medium">{player.nickname}</span>
                  <span className="text-xs text-zinc-500">{matched.length}개 적중</span>
                  <span className="w-16 text-right font-bold text-violet-300">{score}점</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </section>
  );
}

function TierRow({
  points,
  answers,
  onAdd,
  onRemove,
}: {
  points: number;
  answers: Answer[];
  onAdd: (name: string) => string;
  onRemove: (answer: Answer) => void;
}) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const full = answers.length >= ANSWERS_PER_TIER;

  const submit = () => {
    const message = onAdd(name);
    setError(message);
    if (!message) setName('');
  };

  return (
    <div className={`rounded-xl border p-3 ${TIER_STYLE[points]}`}>
      <div className="flex items-center gap-2">
        <span className="w-14 shrink-0 text-lg font-black">{points}점</span>
        <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
          {answers.map(a => (
            <span
              key={a.name}
              className="inline-flex items-center gap-1 rounded-md bg-zinc-950/60 px-2 py-1 text-sm font-medium text-zinc-100"
            >
              {a.name}
              <button
                onClick={() => onRemove(a)}
                className="cursor-pointer text-zinc-500 transition hover:text-red-400"
                title="정답 취소"
              >
                ×
              </button>
            </span>
          ))}
          {Array.from({length: ANSWERS_PER_TIER - answers.length}, (_, i) => (
            <span
              key={i}
              className="rounded-md border border-dashed border-zinc-600/60 px-2 py-1 text-sm text-zinc-600"
            >
              빈칸
            </span>
          ))}
        </div>
      </div>
      {!full && (
        <form
          className="mt-2 flex gap-2"
          onSubmit={e => {
            e.preventDefault();
            submit();
          }}
        >
          <input
            className="input min-w-0 flex-1 py-1.5 text-sm"
            placeholder={`${points}점 이름 입력…`}
            value={name}
            onChange={e => setName(e.target.value)}
            maxLength={30}
          />
          <button className="btn-secondary shrink-0" type="submit" disabled={!name.trim()}>
            정답 적기
          </button>
        </form>
      )}
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}
