'use client';

import Link from 'next/link';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {parseNames} from '@/lib/bingo';
import {
  ClassicGame,
  TOTAL_NAMES,
  createClassicGame,
  fetchClassicGame,
  updateCalled,
} from '@/lib/bingo-classic';

const LAST_HOST_KEY = 'bingo-classic-last-host-code';

export default function ClassicBingoHost({resumeCode}: {resumeCode?: string}) {
  const [game, setGame] = useState<ClassicGame | null>(null);
  const [loading, setLoading] = useState(Boolean(resumeCode));
  const [error, setError] = useState('');
  const [lastCode, setLastCode] = useState('');

  useEffect(() => {
    if (!resumeCode) {
      setLastCode(localStorage.getItem(LAST_HOST_KEY) ?? '');
      return;
    }
    fetchClassicGame(resumeCode)
      .then(found => {
        if (!found) setError(`코드 ${resumeCode.toUpperCase()} 게임을 찾을 수 없습니다.`);
        else if (found.mode !== 'classic')
          setError(`코드 ${found.code}는 퀴즈 빙고 게임이에요. 퀴즈 빙고 진행자 화면을 이용해주세요.`);
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
    <main className="mx-auto min-h-screen max-w-3xl px-4 py-8 sm:px-6">
      <header className="mb-6 flex items-center justify-between">
        <Link href="/bingo" className="text-sm text-zinc-400 transition hover:text-zinc-200">
          ← 이름 빙고
        </Link>
        <span className="rounded-full border border-violet-500/40 bg-violet-600/20 px-3 py-1 text-xs font-medium text-violet-300">
          🎤 진행자 · 클래식
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
  onCreated: (game: ClassicGame) => void;
}) {
  const [title, setTitle] = useState('');
  const [raw, setRaw] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const names = useMemo(() => parseNames(raw), [raw]);
  const ready = names.length === TOTAL_NAMES;

  const handleCreate = async () => {
    setBusy(true);
    setError('');
    try {
      const game = await createClassicGame(title.trim() || '클래식 이름 빙고', names);
      localStorage.setItem(LAST_HOST_KEY, game.code);
      onCreated(game);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">새 클래식 빙고 만들기</h1>
        <p className="mt-1 text-sm text-zinc-400">
          이름 {TOTAL_NAMES}개를 등록하면 참가자들이 이 이름들로 자신만의 5×5 빙고판을 만듭니다.
        </p>
      </div>

      {lastCode && (
        <Link
          href={`/bingo/classic/host?code=${lastCode}`}
          className="block rounded-lg border border-zinc-700 bg-zinc-900 p-3 text-sm text-zinc-300 transition hover:bg-zinc-800"
        >
          ▶️ 최근 게임 이어서 진행하기 — 코드 <b className="text-violet-300">{lastCode}</b>
        </Link>
      )}

      <label className="block">
        <span className="mb-1 block text-sm text-zinc-300">게임 이름 (선택)</span>
        <input
          className="input w-full"
          placeholder="예) 3학년 2반 이름 빙고"
          value={title}
          onChange={e => setTitle(e.target.value)}
          maxLength={40}
        />
      </label>

      <label className="block">
        <span className="mb-1 flex items-baseline justify-between text-sm text-zinc-300">
          <span>이름 목록 (줄바꿈 또는 쉼표로 구분)</span>
          <span className={ready ? 'font-semibold text-emerald-400' : 'text-zinc-500'}>
            {names.length} / {TOTAL_NAMES}명
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

      <button className="btn-primary w-full py-3 text-base" disabled={!ready || busy} onClick={handleCreate}>
        {busy ? '만드는 중…' : ready ? '게임 만들기 🎲' : `이름 ${TOTAL_NAMES}개를 입력하세요`}
      </button>
    </section>
  );
}

function HostGamePanel({
  game,
  onGameChange,
}: {
  game: ClassicGame;
  onGameChange: (game: ClassicGame) => void;
}) {
  const [copied, setCopied] = useState<'link' | 'code' | null>(null);
  const [syncError, setSyncError] = useState('');
  const calledSet = useMemo(() => new Set(game.called), [game.called]);
  // 연타 시 마지막 상태만 저장되도록 요청 순서를 직렬화
  const pending = useRef(Promise.resolve());

  const joinUrl =
    typeof window === 'undefined'
      ? ''
      : `${window.location.origin}/bingo/classic/play?code=${game.code}`;

  const copy = async (text: string, kind: 'link' | 'code') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      prompt('복사가 지원되지 않아요. 직접 복사해주세요:', text);
    }
  };

  const toggleName = useCallback(
    (name: string) => {
      const called = calledSet.has(name)
        ? game.called.filter(n => n !== name)
        : [...game.called, name];
      onGameChange({...game, called});
      setSyncError('');
      pending.current = pending.current.then(() =>
        updateCalled(game.code, called).catch(() =>
          setSyncError('저장에 실패했어요. 네트워크를 확인하고 다시 눌러주세요.'),
        ),
      );
    },
    [game, calledSet, onGameChange],
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

      <div>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-semibold">
            이름을 눌러 지우세요{' '}
            <span className="text-sm font-normal text-zinc-400">
              (다시 누르면 복구)
            </span>
          </h2>
          <span className="text-sm text-zinc-400">
            <b className="text-violet-300">{game.called.length}</b> / {game.names.length} 지움
          </span>
        </div>
        {syncError && <p className="mb-2 text-sm text-red-400">{syncError}</p>}
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {game.names.map(name => {
            const called = calledSet.has(name);
            return (
              <button
                key={name}
                onClick={() => toggleName(name)}
                className={`min-h-16 cursor-pointer rounded-xl border p-2 text-sm font-medium break-keep transition ${
                  called
                    ? 'border-zinc-800 bg-zinc-900/40 text-zinc-600 line-through'
                    : 'border-zinc-700 bg-zinc-800 text-zinc-100 hover:border-violet-400 hover:bg-zinc-700'
                }`}
              >
                {name}
              </button>
            );
          })}
        </div>
      </div>

      {game.called.length > 0 && (
        <div>
          <h2 className="mb-2 font-semibold">지운 순서</h2>
          <ol className="flex flex-wrap gap-1.5">
            {game.called.map((name, i) => (
              <li
                key={name}
                className="rounded-md border border-violet-500/30 bg-violet-600/10 px-2 py-0.5 text-xs text-violet-200"
              >
                {i + 1}. {name}
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}
