'use client';

import {useCallback, useEffect, useRef, useState} from 'react';
import {parseReference} from '@/lib/books';
import {
  chunkVerses,
  DEFAULT_VOICE,
  synthesize,
  TtsChunk,
  TtsError,
  VOICES,
} from '@/lib/tts';

interface Verse {
  verse: number;
  text: string;
}

interface Chapter {
  version: string;
  book: string;
  chapter: number;
  totalChapters: number;
  verses: Verse[];
}

type PlayStatus = 'idle' | 'loading' | 'playing' | 'paused';

interface PlaySession {
  stopped: boolean;
  audio: HTMLAudioElement | null;
}

const EXAMPLES = ['마태복음 1장', '창세기 1장', '시편 23장', '요한복음 3장'];
const API_KEY_STORAGE = 'bible-reader-gemini-key';
const VOICE_STORAGE = 'bible-reader-voice';

export default function Home() {
  const [query, setQuery] = useState('');
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [voice, setVoice] = useState<string>(DEFAULT_VOICE);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [playStatus, setPlayStatus] = useState<PlayStatus>('idle');
  const [currentChunk, setCurrentChunk] = useState<TtsChunk | null>(null);
  const [progress, setProgress] = useState({current: 0, total: 0});
  const [ttsError, setTtsError] = useState('');

  const sessionRef = useRef<PlaySession | null>(null);

  useEffect(() => {
    // 저장된 키/목소리는 SSR과의 하이드레이션 불일치를 피하려고 마운트 후에 불러온다
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setApiKey(localStorage.getItem(API_KEY_STORAGE) ?? '');
    setVoice(localStorage.getItem(VOICE_STORAGE) ?? DEFAULT_VOICE);
  }, []);

  const saveApiKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem(API_KEY_STORAGE, key.trim());
  };

  const saveVoice = (v: string) => {
    setVoice(v);
    localStorage.setItem(VOICE_STORAGE, v);
  };

  const stopReading = useCallback(() => {
    const session = sessionRef.current;
    if (session) {
      session.stopped = true;
      session.audio?.pause();
      session.audio = null;
    }
    sessionRef.current = null;
    setPlayStatus('idle');
    setCurrentChunk(null);
    setProgress({current: 0, total: 0});
  }, []);

  // 페이지를 떠날 때 재생 정리
  useEffect(() => stopReading, [stopReading]);

  const loadChapter = useCallback(
    async (text: string) => {
      const ref = parseReference(text);
      if (!ref) {
        setError('"마태복음 1장"처럼 책 이름과 장을 입력해 주세요.');
        return;
      }
      stopReading();
      setLoading(true);
      setError('');
      setTtsError('');
      try {
        const res = await fetch(
          `/api/bible?book=${ref.book.code}&chapter=${ref.chapter}`,
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? '본문을 불러오지 못했습니다.');
        setChapter(data);
        setQuery(`${data.book} ${data.chapter}장`);
        window.scrollTo({top: 0, behavior: 'smooth'});
      } catch (e) {
        setError(e instanceof Error ? e.message : '본문을 불러오지 못했습니다.');
      } finally {
        setLoading(false);
      }
    },
    [stopReading],
  );

  const playBlob = (blob: Blob, session: PlaySession) =>
    new Promise<void>((resolve, reject) => {
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      session.audio = audio;
      audio.onended = () => {
        URL.revokeObjectURL(url);
        resolve();
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('오디오 재생에 실패했습니다.'));
      };
      audio.play().catch(reject);
    });

  const startReading = async () => {
    if (!chapter) return;
    if (!apiKey.trim()) {
      setSettingsOpen(true);
      setTtsError('먼저 설정에서 Gemini API 키를 입력해 주세요.');
      return;
    }
    stopReading();
    setTtsError('');

    const session: PlaySession = {stopped: false, audio: null};
    sessionRef.current = session;

    const chunks = chunkVerses(chapter.verses);
    setProgress({current: 0, total: chunks.length});
    setPlayStatus('loading');

    try {
      // 현재 구간을 재생하는 동안 다음 구간을 미리 합성한다
      let next = synthesize(apiKey.trim(), chunks[0].text, voice);
      for (let i = 0; i < chunks.length; i++) {
        const blob = await next;
        if (session.stopped) return;
        if (i + 1 < chunks.length) {
          next = synthesize(apiKey.trim(), chunks[i + 1].text, voice);
        }
        setPlayStatus('playing');
        setCurrentChunk(chunks[i]);
        setProgress({current: i + 1, total: chunks.length});
        await playBlob(blob, session);
        if (session.stopped) return;
      }
      stopReading();
    } catch (e) {
      if (!session.stopped) {
        setTtsError(
          e instanceof TtsError || e instanceof Error
            ? e.message
            : '음성 합성 중 오류가 발생했습니다.',
        );
        stopReading();
      }
    }
  };

  const togglePause = () => {
    const audio = sessionRef.current?.audio;
    if (!audio) return;
    if (playStatus === 'playing') {
      audio.pause();
      setPlayStatus('paused');
    } else if (playStatus === 'paused') {
      audio.play();
      setPlayStatus('playing');
    }
  };

  const goChapter = (delta: number) => {
    if (!chapter) return;
    const target = chapter.chapter + delta;
    if (target < 1 || target > chapter.totalChapters) return;
    loadChapter(`${chapter.book} ${target}장`);
  };

  const isVerseActive = (v: number) =>
    currentChunk !== null && v >= currentChunk.startVerse && v <= currentChunk.endVerse;

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-4 pb-24 pt-8 sm:px-6">
      {/* 헤더 */}
      <header className="mb-8 text-center">
        <h1 className="font-serif text-3xl font-bold tracking-tight text-amber-950 sm:text-4xl">
          📖 말씀 낭독
        </h1>
        <p className="mt-2 text-sm text-stone-500">
          성경(개역개정)을 찾아 자연스러운 목소리로 읽어 드립니다
        </p>
      </header>

      {/* 검색 */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          loadChapter(query);
        }}
        className="flex gap-2"
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="예) 마태복음 1장"
          className="input flex-1 text-base"
          aria-label="성경 구절 입력"
        />
        <button type="submit" disabled={loading} className="btn-primary shrink-0">
          {loading ? '불러오는 중…' : '찾기'}
        </button>
      </form>

      {/* 예시 버튼 */}
      <div className="mt-3 flex flex-wrap gap-2">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            onClick={() => loadChapter(ex)}
            className="rounded-full border border-stone-300 bg-white px-3 py-1 text-xs text-stone-600 transition hover:border-amber-400 hover:text-amber-800"
          >
            {ex}
          </button>
        ))}
        <button
          onClick={() => setSettingsOpen((v) => !v)}
          className={`ml-auto rounded-full border px-3 py-1 text-xs transition ${
            apiKey
              ? 'border-stone-300 bg-white text-stone-600 hover:border-amber-400'
              : 'border-amber-400 bg-amber-50 text-amber-800'
          }`}
        >
          ⚙️ 설정 {apiKey ? '' : '(API 키 필요)'}
        </button>
      </div>

      {/* 설정 패널 */}
      {settingsOpen && (
        <section className="mt-4 rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-stone-700">
            Gemini API 키 (음성 낭독에 필요)
          </h2>
          <div className="mt-2 flex gap-2">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => saveApiKey(e.target.value)}
              placeholder="AIza… 형식의 키를 붙여넣으세요"
              className="input flex-1 text-sm"
              aria-label="Gemini API 키"
            />
            <button
              type="button"
              onClick={() => setShowKey((v) => !v)}
              className="btn-secondary shrink-0"
            >
              {showKey ? '숨기기' : '보기'}
            </button>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-stone-500">
            키는 이 브라우저에만 저장되며 Google 음성 합성 요청에만 사용됩니다.{' '}
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noreferrer"
              className="text-amber-700 underline"
            >
              Google AI Studio에서 무료로 발급
            </a>
            받을 수 있습니다.
          </p>
          <div className="mt-3">
            <label className="text-sm font-semibold text-stone-700" htmlFor="voice">
              목소리
            </label>
            <select
              id="voice"
              value={voice}
              onChange={(e) => saveVoice(e.target.value)}
              className="input mt-1 w-full text-sm"
            >
              {VOICES.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label}
                </option>
              ))}
            </select>
          </div>
        </section>
      )}

      {/* 오류 */}
      {error && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {/* 본문 */}
      {chapter && (
        <article className="mt-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => goChapter(-1)}
              disabled={chapter.chapter <= 1}
              className="btn-icon"
              aria-label="이전 장"
            >
              ← 이전 장
            </button>
            <h2 className="font-serif text-xl font-bold text-amber-950 sm:text-2xl">
              {chapter.book} {chapter.chapter}장
              <span className="ml-2 align-middle text-xs font-normal text-stone-400">
                {chapter.version}
              </span>
            </h2>
            <button
              onClick={() => goChapter(1)}
              disabled={chapter.chapter >= chapter.totalChapters}
              className="btn-icon"
              aria-label="다음 장"
            >
              다음 장 →
            </button>
          </div>

          {/* 낭독 컨트롤 */}
          <div className="sticky top-2 z-10 mt-4 rounded-xl border border-amber-200 bg-amber-50/95 p-3 shadow-sm backdrop-blur">
            <div className="flex flex-wrap items-center gap-2">
              {playStatus === 'idle' ? (
                <button onClick={startReading} className="btn-primary">
                  🔊 읽어주기
                </button>
              ) : (
                <>
                  {playStatus === 'loading' ? (
                    <span className="flex items-center gap-2 px-2 text-sm text-amber-900">
                      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-amber-700 border-t-transparent" />
                      목소리를 준비하고 있어요…
                    </span>
                  ) : (
                    <button onClick={togglePause} className="btn-primary">
                      {playStatus === 'paused' ? '▶ 이어서' : '⏸ 일시정지'}
                    </button>
                  )}
                  <button onClick={stopReading} className="btn-secondary">
                    ⏹ 정지
                  </button>
                  {progress.total > 0 && (
                    <span className="ml-auto text-xs text-amber-900">
                      {progress.current} / {progress.total} 구간
                      {currentChunk &&
                        ` · ${currentChunk.startVerse}–${currentChunk.endVerse}절`}
                    </span>
                  )}
                </>
              )}
            </div>
            {ttsError && <p className="mt-2 text-xs text-red-600">{ttsError}</p>}
          </div>

          {/* 절 목록 */}
          <div className="mt-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-8">
            <div className="space-y-3 font-serif text-[17px] leading-relaxed text-stone-800">
              {chapter.verses.map((v) => (
                <p
                  key={v.verse}
                  className={`rounded-md px-2 py-0.5 transition-colors ${
                    isVerseActive(v.verse) ? 'bg-amber-100' : ''
                  }`}
                >
                  <span className="mr-2 select-none text-xs font-bold text-amber-600">
                    {v.verse}
                  </span>
                  {v.text}
                </p>
              ))}
            </div>
          </div>

          <p className="mt-4 text-center text-xs text-stone-400">
            본문 출처: 대한성서공회 개역개정 · 음성: Google Gemini TTS
          </p>
        </article>
      )}

      {/* 첫 화면 안내 */}
      {!chapter && !error && (
        <section className="mt-12 text-center text-sm leading-7 text-stone-500">
          <p>
            읽고 싶은 성경의 책 이름과 장을 입력하면
            <br />
            개역개정 본문을 찾아와 화면에 보여 드리고,
            <br />
            따뜻한 목소리로 읽어 드립니다.
          </p>
        </section>
      )}
    </main>
  );
}
