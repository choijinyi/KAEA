'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GENRES, getGenre } from '@/lib/genres';
import {
  distributeLyrics,
  formatTime,
  normalizeLines,
  type SubtitleLine,
  type TranscribeResult,
} from '@/lib/types';
import { drawFrame, renderVideo, VIDEO_H, VIDEO_W, type RenderHandle, type SceneConfig } from '@/lib/render';
import { generateBackgroundWithUserKey, transcribeWithUserKey } from '@/lib/gemini-client';
import { audioBufferToWav, decodeAudioFile, mergeTracks, type MergedAudio } from '@/lib/audio';

const MAX_AI_BYTES = 4 * 1024 * 1024;
const API_KEY_STORAGE = 'playlist-studio-gemini-key';
const TRACK_GAP_SEC = 0.8;

type BgMode = 'ai' | 'gradient';

interface Track {
  id: string;
  name: string;
  file: File;
  buffer: AudioBuffer;
  duration: number;
}

export default function Studio() {
  // 0. API 키 (브라우저에만 저장 — 등록 시 크기 제한 없이 브라우저에서 직접 AI 호출)
  const [apiKey, setApiKey] = useState('');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [apiKeySaved, setApiKeySaved] = useState(false);

  useEffect(() => {
    // URL 해시(#gemini-key=...)로 전달된 키는 저장 후 주소에서 즉시 제거한다
    // (해시는 서버로 전송되지 않는다)
    const match = window.location.hash.match(/gemini-key=([^&]+)/);
    if (match) {
      const key = decodeURIComponent(match[1]).trim();
      if (key) localStorage.setItem(API_KEY_STORAGE, key);
      history.replaceState(null, '', window.location.pathname + window.location.search);
    }
    const saved = localStorage.getItem(API_KEY_STORAGE) ?? '';
    setApiKey(saved);
    setApiKeySaved(!!saved);
  }, []);

  const saveApiKey = () => {
    const key = apiKeyInput.trim();
    if (!key) return;
    localStorage.setItem(API_KEY_STORAGE, key);
    setApiKey(key);
    setApiKeySaved(true);
    setApiKeyInput('');
  };

  const clearApiKey = () => {
    localStorage.removeItem(API_KEY_STORAGE);
    setApiKey('');
    setApiKeySaved(false);
  };

  // 1. 장르
  const [genreId, setGenreId] = useState('lofi');
  const genre = getGenre(genreId);

  // 2. 트랙 (여러 곡)
  const [tracks, setTracks] = useState<Track[]>([]);
  const [merged, setMerged] = useState<(MergedAudio & { url: string }) | null>(null);
  const [merging, setMerging] = useState(false);
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [audioError, setAudioError] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const duration = merged?.duration ?? 0;

  // 3. 자막
  const [lines, setLines] = useState<SubtitleLine[]>([]);
  const [lyricsText, setLyricsText] = useState('');
  const [transcribing, setTranscribing] = useState(false);
  const [transcribeStatus, setTranscribeStatus] = useState('');
  const [subtitleError, setSubtitleError] = useState('');
  const [mood, setMood] = useState('');

  // 탭 싱크
  const [syncIndex, setSyncIndex] = useState(-1);
  const syncAudioRef = useRef<HTMLAudioElement | null>(null);

  // 4. 배경
  const [bgMode, setBgMode] = useState<BgMode>('ai');
  const [scenePrompt, setScenePrompt] = useState('');
  const [sceneTouched, setSceneTouched] = useState(false);
  const [bgImageUrl, setBgImageUrl] = useState<string | null>(null);
  const [bgImageEl, setBgImageEl] = useState<HTMLImageElement | null>(null);
  const [bgGenerating, setBgGenerating] = useState(false);
  const [bgError, setBgError] = useState('');

  // 미리보기
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const [previewing, setPreviewing] = useState(false);
  const previewCleanupRef = useRef<(() => void) | null>(null);

  // 5. 렌더링
  const [rendering, setRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [renderTime, setRenderTime] = useState(0);
  const [renderError, setRenderError] = useState('');
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultSize, setResultSize] = useState(0);
  const renderHandleRef = useRef<RenderHandle | null>(null);

  // 장르 변경 시 (사용자가 직접 수정하지 않았다면) 장면 프롬프트 갱신
  useEffect(() => {
    if (!sceneTouched) setScenePrompt(genre.defaultScene);
  }, [genre, sceneTouched]);

  // 배경 이미지 URL → Image 엘리먼트 로드
  useEffect(() => {
    if (!bgImageUrl) {
      setBgImageEl(null);
      return;
    }
    const img = new Image();
    img.onload = () => setBgImageEl(img);
    img.src = bgImageUrl;
  }, [bgImageUrl]);

  // 트랙이 바뀌면 자동으로 한 곡으로 이어 붙인다
  useEffect(() => {
    let cancelled = false;
    if (tracks.length === 0) {
      setMerged(prev => {
        if (prev) URL.revokeObjectURL(prev.url);
        return null;
      });
      return;
    }
    setMerging(true);
    (async () => {
      const m = await mergeTracks(tracks.map(t => t.buffer), TRACK_GAP_SEC);
      if (cancelled) return;
      const url = URL.createObjectURL(audioBufferToWav(m.buffer));
      setMerged(prev => {
        if (prev) URL.revokeObjectURL(prev.url);
        return { ...m, url };
      });
      setMerging(false);
    })().catch(() => {
      if (!cancelled) {
        setMerging(false);
        setAudioError('곡을 이어 붙이는 중 오류가 발생했습니다.');
      }
    });
    return () => {
      cancelled = true;
    };
  }, [tracks]);

  const scene: SceneConfig = useMemo(
    () => ({
      bgImage: bgMode === 'ai' ? bgImageEl : null,
      gradient: genre.gradient,
      title: title || '나의 플레이리스트',
      artist,
      genreLabel: genre.name,
      lines,
      duration,
      tracks: tracks.map((t, i) => ({ start: merged?.starts[i] ?? 0, name: t.name })),
    }),
    [bgMode, bgImageEl, genre, title, artist, lines, duration, tracks, merged],
  );

  /* ---------- 트랙 업로드/편집 ---------- */
  const resetTimeline = () => {
    setLines([]);
    setResultUrl(null);
  };

  const addFiles = useCallback(
    async (list: FileList | File[]) => {
      setAudioError('');
      const files = Array.from(list).filter(
        f => f.type.startsWith('audio/') || /\.(mp3|m4a|wav|ogg|flac|aac|webm)$/i.test(f.name),
      );
      if (files.length === 0) {
        setAudioError('오디오 파일(MP3, M4A, WAV 등)을 올려 주세요.');
        return;
      }
      const added: Track[] = [];
      for (const f of files) {
        try {
          const buffer = await decodeAudioFile(f);
          added.push({
            id: crypto.randomUUID(),
            name: f.name.replace(/\.[^.]+$/, ''),
            file: f,
            buffer,
            duration: buffer.duration,
          });
        } catch {
          setAudioError(`"${f.name}" 파일을 해석할 수 없어 건너뛰었습니다.`);
        }
      }
      if (added.length === 0) return;
      setTracks(prev => [...prev, ...added]);
      setTitle(prev => prev || added[0].name);
      resetTimeline();
    },
    [],
  );

  const removeTrack = (id: string) => {
    setTracks(prev => prev.filter(t => t.id !== id));
    resetTimeline();
  };

  const moveTrack = (id: string, dir: -1 | 1) => {
    setTracks(prev => {
      const i = prev.findIndex(t => t.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
    resetTimeline();
  };

  /* ---------- AI 가사 추출 (곡별 추출 → 병합 타임라인에 정렬) ---------- */
  const transcribe = async () => {
    if (!merged || tracks.length === 0) return;
    setSubtitleError('');
    if (!apiKey) {
      const over = tracks.find(t => t.file.size > MAX_AI_BYTES);
      if (over) {
        setSubtitleError(
          `"${over.name}"이(가) 4MB를 넘어요. 상단에 Gemini API 키를 등록하면 크기 제한 없이 추출할 수 있어요.`,
        );
        return;
      }
    }
    setTranscribing(true);
    try {
      const all: SubtitleLine[] = [];
      let firstMood = '';
      let firstScene = '';
      for (let i = 0; i < tracks.length; i++) {
        const tr = tracks[i];
        setTranscribeStatus(tracks.length > 1 ? `${i + 1}/${tracks.length}곡 「${tr.name}」 추출 중…` : '가사 추출 중… (최대 1분)');
        let json: TranscribeResult;
        if (apiKey) {
          // 브라우저에서 Gemini Files API 직접 호출 — 파일 크기 제한 없음
          json = await transcribeWithUserKey(tr.file, apiKey);
        } else {
          const form = new FormData();
          form.append('audio', tr.file);
          const res = await fetch('/api/transcribe', { method: 'POST', body: form });
          const parsed = (await res.json()) as TranscribeResult & { error?: string };
          if (!res.ok) throw new Error(parsed.error || '가사 추출에 실패했습니다.');
          json = parsed;
        }
        const offset = merged.starts[i];
        const perTrack = normalizeLines(json.lines ?? [], tr.duration);
        all.push(
          ...perTrack.map(l => ({
            ...l,
            start: +(l.start + offset).toFixed(1),
            end: +(l.end + offset).toFixed(1),
          })),
        );
        if (i === 0) {
          firstMood = json.mood || '';
          firstScene = json.scenePromptEn || '';
        }
      }
      const normalized = normalizeLines(all, merged.duration);
      setLines(normalized);
      setMood(firstMood);
      if (firstScene && !sceneTouched) setScenePrompt(firstScene);
      if (normalized.length === 0) {
        setSubtitleError('보컬(가사)을 찾지 못했습니다. 연주곡이라면 자막 없이 진행해도 좋아요.');
      }
    } catch (e) {
      setSubtitleError(e instanceof Error ? e.message : '가사 추출에 실패했습니다.');
    } finally {
      setTranscribing(false);
      setTranscribeStatus('');
    }
  };

  const applyLyricsText = () => {
    setLines(distributeLyrics(lyricsText, duration));
    setSubtitleError('');
  };

  const updateLine = (i: number, patch: Partial<SubtitleLine>) => {
    setLines(prev => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  };

  const removeLine = (i: number) => setLines(prev => prev.filter((_, idx) => idx !== i));

  /* ---------- 탭 싱크 ---------- */
  const startSync = () => {
    if (!merged || lines.length === 0) return;
    stopPreview();
    const audio = new Audio(merged.url);
    syncAudioRef.current = audio;
    setSyncIndex(0);
    void audio.play();
    audio.onended = () => finishSync();
  };

  const tapSync = () => {
    const audio = syncAudioRef.current;
    if (!audio || syncIndex < 0) return;
    const t = audio.currentTime;
    setLines(prev => prev.map((l, i) => (i === syncIndex ? { ...l, start: +t.toFixed(1) } : l)));
    if (syncIndex + 1 >= lines.length) finishSync();
    else setSyncIndex(syncIndex + 1);
  };

  const finishSync = () => {
    syncAudioRef.current?.pause();
    syncAudioRef.current = null;
    setSyncIndex(-1);
    setLines(prev => normalizeLines(prev, duration));
  };

  /* ---------- 배경 생성 ---------- */
  const generateBackground = async () => {
    setBgError('');
    setBgGenerating(true);
    try {
      const sceneText = scenePrompt || genre.defaultScene;
      let image: string;
      if (apiKey) {
        image = await generateBackgroundWithUserKey(sceneText, genre.imageStyle, apiKey);
      } else {
        const res = await fetch('/api/background', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scene: sceneText, style: genre.imageStyle }),
        });
        const json = (await res.json()) as { image?: string; error?: string };
        if (!res.ok || !json.image) throw new Error(json.error || '배경 생성에 실패했습니다.');
        image = json.image;
      }
      setBgImageUrl(image);
      setBgMode('ai');
    } catch (e) {
      setBgError(e instanceof Error ? e.message : '배경 생성에 실패했습니다.');
    } finally {
      setBgGenerating(false);
    }
  };

  /* ---------- 미리보기 ---------- */
  const stopPreview = useCallback(() => {
    previewCleanupRef.current?.();
    previewCleanupRef.current = null;
    setPreviewing(false);
  }, []);

  const startPreview = () => {
    if (!merged) return;
    stopPreview();
    const canvas = previewCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const audio = new Audio(merged.url);
    const actx = new AudioContext();
    const src = actx.createMediaElementSource(audio);
    const analyser = actx.createAnalyser();
    analyser.fftSize = 256;
    src.connect(analyser);
    analyser.connect(actx.destination);
    const freq = new Uint8Array(analyser.frequencyBinCount);

    let raf = 0;
    const tick = () => {
      analyser.getByteFrequencyData(freq);
      drawFrame(ctx, sceneRef.current, audio.currentTime, freq);
      raf = requestAnimationFrame(tick);
    };
    void audio.play();
    raf = requestAnimationFrame(tick);

    const cleanup = () => {
      cancelAnimationFrame(raf);
      audio.pause();
      void actx.close();
    };
    audio.onended = () => {
      cleanup();
      previewCleanupRef.current = null;
      setPreviewing(false);
    };
    previewCleanupRef.current = cleanup;
    setPreviewing(true);
  };

  // 미리보기 루프가 항상 최신 장면을 그리도록 ref로 유지
  const sceneRef = useRef(scene);
  useEffect(() => {
    sceneRef.current = scene;
    // 정지 상태에서도 첫 프레임을 보여준다
    if (!previewing) {
      const ctx = previewCanvasRef.current?.getContext('2d');
      if (ctx) drawFrame(ctx, scene, lines[0] ? lines[0].start + 0.5 : 10, null);
    }
  }, [scene, previewing, lines]);

  useEffect(() => () => stopPreview(), [stopPreview]);

  /* ---------- 영상 렌더링 ---------- */
  const startRender = async () => {
    if (!merged) return;
    stopPreview();
    setRenderError('');
    setResultUrl(null);
    setRendering(true);
    setRenderProgress(0);
    try {
      const handle = renderVideo(merged.buffer, sceneRef.current, (p, t) => {
        setRenderProgress(p);
        setRenderTime(t);
      });
      renderHandleRef.current = handle;
      const blob = await handle.done;
      setResultUrl(URL.createObjectURL(blob));
      setResultSize(blob.size);
    } catch (e) {
      if (!(e instanceof Error && e.message === 'cancelled')) {
        setRenderError(e instanceof Error ? e.message : '렌더링에 실패했습니다.');
      }
    } finally {
      setRendering(false);
      renderHandleRef.current = null;
    }
  };

  const cancelRender = () => renderHandleRef.current?.cancel();

  const ready = tracks.length > 0 && !!merged && !merging;
  const safeName = (title || 'playlist').replace(/[\\/:*?"<>|]/g, '_');

  /* ================= UI ================= */
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:py-14">
      {/* 헤더 */}
      <header className="mb-12 text-center">
        <p className="mb-3 text-sm font-medium tracking-[0.3em] text-violet-400">PLAYLIST STUDIO</p>
        <h1 className="text-3xl font-bold leading-tight sm:text-5xl">
          노래 여러 곡이 <span className="gradient-text">유튜브 플레이리스트 영상</span> 하나가 됩니다
        </h1>
        <p className="mt-4 text-zinc-400">
          곡들을 올리면 자동으로 이어 붙이고, AI가 가사를 추출해 자막을 만들고, 어울리는 배경을 그려 영상으로 완성해요.
        </p>
      </header>

      {/* API 키 설정 */}
      <div className="mb-10 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold">
              🔑 Gemini API 키 {apiKeySaved
                ? <span className="ml-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-300">등록됨 — 크기 제한 없이 AI 사용 가능</span>
                : <span className="ml-1 text-sm font-normal text-zinc-500">(선택)</span>}
            </h3>
            <p className="mt-1 text-sm text-zinc-400">
              키를 등록하면 브라우저에서 AI를 직접 호출해 <b className="text-zinc-300">파일 크기 제한 없이</b> 가사 추출·배경 생성이 가능해요.
              키는 이 브라우저에만 저장되며, 구글 Gemini API 호출에만 사용됩니다.{' '}
              <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" className="text-violet-400 underline">
                무료 발급 (AQ.… 또는 AIza…로 시작)
              </a>
            </p>
          </div>
          {apiKeySaved ? (
            <button onClick={clearApiKey} className="btn-secondary">키 삭제</button>
          ) : (
            <div className="flex w-full items-center gap-2 sm:w-auto">
              <input
                type="password"
                value={apiKeyInput}
                onChange={e => setApiKeyInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && saveApiKey()}
                placeholder="AQ.… 또는 AIza…"
                className="input w-full sm:w-64"
              />
              <button onClick={saveApiKey} disabled={!apiKeyInput.trim()} className="btn-primary shrink-0">
                저장
              </button>
            </div>
          )}
        </div>
      </div>

      {/* STEP 1: 장르 */}
      <Section step={1} title="플레이리스트 장르 선택" sub="유튜브에서 시청 수가 가장 많은 플레이리스트 장르를 모았어요. 배경 화풍과 색감이 함께 정해집니다.">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {GENRES.map(g => (
            <button
              key={g.id}
              onClick={() => setGenreId(g.id)}
              className={`rounded-xl border p-4 text-left transition ${
                g.id === genreId
                  ? 'border-violet-400 bg-violet-500/10 ring-1 ring-violet-400'
                  : 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-600'
              }`}
            >
              <div className="text-2xl">{g.emoji}</div>
              <div className="mt-2 font-semibold">{g.name}</div>
              <div className="text-sm text-zinc-400">{g.desc}</div>
              <div className="mt-2 text-xs text-violet-300/80">📈 {g.stat}</div>
            </button>
          ))}
        </div>
      </Section>

      {/* STEP 2: 음악 업로드 (여러 곡) */}
      <Section step={2} title="음악 업로드 — 여러 곡 가능" sub="곡들을 올리면 순서대로 한 곡으로 이어 붙여요. 순서를 바꾸거나 뺄 수 있습니다.">
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => {
            e.preventDefault();
            setDragOver(false);
            if (e.dataTransfer.files.length) void addFiles(e.dataTransfer.files);
          }}
          className={`rounded-xl border-2 border-dashed p-6 text-center transition ${
            dragOver ? 'border-violet-400 bg-violet-500/10' : 'border-zinc-700 bg-zinc-900/40'
          }`}
        >
          <div className="text-zinc-400">
            <div className="text-4xl">🎧</div>
            <p className="mt-3">여러 파일을 한꺼번에 끌어다 놓거나 버튼으로 선택하세요</p>
          </div>
          <label className="mt-4 inline-block cursor-pointer rounded-lg bg-violet-600 px-5 py-2.5 font-medium text-white transition hover:bg-violet-500">
            {tracks.length > 0 ? '곡 추가' : '오디오 파일 선택'}
            <input
              type="file"
              multiple
              accept="audio/*,.mp3,.m4a,.wav,.ogg,.flac,.aac"
              className="hidden"
              onChange={e => {
                if (e.target.files?.length) void addFiles(e.target.files);
                e.target.value = '';
              }}
            />
          </label>
          {audioError && <p className="mt-3 text-sm text-red-400">{audioError}</p>}
        </div>

        {tracks.length > 0 && (
          <div className="mt-4 space-y-1.5">
            {tracks.map((t, i) => (
              <div key={t.id} className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/40 p-2.5">
                <span className="w-6 text-center text-sm font-semibold text-violet-300">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{t.name}</div>
                  <div className="text-xs text-zinc-500">
                    {formatTime(t.duration)} · {(t.file.size / 1024 / 1024).toFixed(1)}MB
                  </div>
                </div>
                <button onClick={() => moveTrack(t.id, -1)} disabled={i === 0} className="btn-icon" title="위로">↑</button>
                <button onClick={() => moveTrack(t.id, 1)} disabled={i === tracks.length - 1} className="btn-icon" title="아래로">↓</button>
                <button onClick={() => removeTrack(t.id)} className="btn-icon hover:text-red-400" title="삭제">✕</button>
              </div>
            ))}

            <div className="rounded-lg border border-violet-800/40 bg-violet-500/5 p-3 text-sm">
              {merging ? (
                <span className="text-violet-300">🔗 곡을 한 곡으로 이어 붙이는 중…</span>
              ) : merged ? (
                <div>
                  <span className="font-medium text-violet-200">
                    ✅ {tracks.length}곡을 한 곡으로 이어 붙였어요 — 총 {formatTime(merged.duration)}
                  </span>
                  {tracks.length > 1 && (
                    <span className="ml-2 text-xs text-zinc-500">(곡 사이 {TRACK_GAP_SEC}초 간격)</span>
                  )}
                  <audio controls src={merged.url} className="mt-3 w-full max-w-xl" />
                </div>
              ) : null}
            </div>
          </div>
        )}

        {ready && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label="영상 제목">
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="input w-full"
                placeholder="예: 비 오는 밤, 재즈 한 잔"
              />
            </Field>
            <Field label="아티스트 (선택)">
              <input
                value={artist}
                onChange={e => setArtist(e.target.value)}
                className="input w-full"
                placeholder="예: KAEA"
              />
            </Field>
          </div>
        )}
      </Section>

      {/* STEP 3: 자막 */}
      <Section step={3} title="스크립트 · 자막" sub="AI가 곡마다 가사를 받아써 전체 타임라인에 맞는 자막을 만들어요. 연주곡이라면 건너뛰어도 됩니다.">
        {!ready ? (
          <Placeholder>먼저 음악을 업로드해 주세요.</Placeholder>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <button onClick={transcribe} disabled={transcribing} className="btn-primary">
                {transcribing ? transcribeStatus || '가사 추출 중…' : `✨ AI 가사 자동 추출${tracks.length > 1 ? ` (${tracks.length}곡 전체)` : ''}`}
              </button>
              {!apiKey && tracks.some(t => t.file.size > MAX_AI_BYTES) && (
                <span className="text-xs text-amber-400">
                  4MB 초과 곡이 있어요 — 상단에 API 키를 등록하면 제한 없이 추출할 수 있어요.
                </span>
              )}
              {mood && <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-300">무드: {mood}</span>}
            </div>
            {subtitleError && <p className="mt-3 text-sm text-amber-400">{subtitleError}</p>}

            <details className="mt-4 rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
              <summary className="cursor-pointer text-sm font-medium text-zinc-300">
                ✍️ 가사 직접 붙여넣기 (한 줄 = 자막 한 줄, 전체 곡 길이에 균등 배치)
              </summary>
              <textarea
                value={lyricsText}
                onChange={e => setLyricsText(e.target.value)}
                rows={6}
                className="input mt-3 w-full font-mono text-sm"
                placeholder={'첫 번째 가사 줄\n두 번째 가사 줄\n...'}
              />
              <button onClick={applyLyricsText} disabled={!lyricsText.trim()} className="btn-secondary mt-2">
                곡 길이에 맞춰 자막 배치
              </button>
            </details>

            {lines.length > 0 && (
              <div className="mt-5">
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-zinc-300">자막 {lines.length}줄</h4>
                  {syncIndex < 0 ? (
                    <button onClick={startSync} className="btn-secondary text-xs">
                      ⏱ 탭 싱크 (음악 들으며 타이밍 찍기)
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button onClick={tapSync} className="btn-primary animate-pulse">
                        ▶ 지금 이 줄 시작! ({syncIndex + 1}/{lines.length})
                      </button>
                      <button onClick={finishSync} className="btn-secondary text-xs">종료</button>
                    </div>
                  )}
                </div>
                {syncIndex >= 0 && (
                  <p className="mb-2 rounded-lg bg-violet-500/10 p-3 text-sm text-violet-200">
                    다음 줄: “{lines[syncIndex]?.text}” — 이 가사가 들리는 순간 버튼을 누르세요.
                  </p>
                )}
                <div className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
                  {lines.map((l, i) => (
                    <div
                      key={i}
                      className={`flex items-center gap-2 rounded-lg border p-2 ${
                        i === syncIndex ? 'border-violet-400 bg-violet-500/10' : 'border-zinc-800 bg-zinc-900/40'
                      }`}
                    >
                      <input
                        type="number"
                        step="0.1"
                        min={0}
                        max={Math.ceil(duration)}
                        value={l.start}
                        onChange={e => updateLine(i, { start: parseFloat(e.target.value) || 0 })}
                        onBlur={() => setLines(prev => normalizeLines(prev, duration))}
                        className="input w-20 text-center text-xs"
                        title="시작(초)"
                      />
                      <span className="text-xs text-zinc-500">{formatTime(l.start)}</span>
                      <input
                        value={l.text}
                        onChange={e => updateLine(i, { text: e.target.value })}
                        className="input flex-1 text-sm"
                      />
                      <button onClick={() => removeLine(i)} className="px-2 text-zinc-500 hover:text-red-400" title="삭제">
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </Section>

      {/* STEP 4: 배경 */}
      <Section step={4} title="배경 만들기" sub="AI가 스크립트와 장르에 어울리는 배경 그림을 그립니다. 자막 가독성을 위해 하단은 차분하게 생성돼요.">
        {!ready ? (
          <Placeholder>먼저 음악을 업로드해 주세요.</Placeholder>
        ) : (
          <>
            <div className="mb-4 flex gap-2">
              <Tab active={bgMode === 'ai'} onClick={() => setBgMode('ai')}>🎨 AI 배경 그림</Tab>
              <Tab active={bgMode === 'gradient'} onClick={() => setBgMode('gradient')}>🌈 무드 그라디언트</Tab>
            </div>

            {bgMode === 'ai' && (
              <div>
                <Field label="장면 설명 (AI 가사 추출 시 자동 제안됩니다)">
                  <textarea
                    value={scenePrompt}
                    onChange={e => { setScenePrompt(e.target.value); setSceneTouched(true); }}
                    rows={3}
                    className="input w-full text-sm"
                  />
                </Field>
                <button onClick={generateBackground} disabled={bgGenerating} className="btn-primary mt-3">
                  {bgGenerating ? '배경 그리는 중…' : bgImageUrl ? '🎨 다시 그리기' : '🎨 배경 이미지 생성'}
                </button>
                {bgError && <p className="mt-3 text-sm text-red-400">{bgError}</p>}
              </div>
            )}
            {bgMode === 'gradient' && (
              <div className="flex items-center gap-3 text-sm text-zinc-400">
                <div
                  className="h-16 w-28 rounded-lg border border-zinc-700"
                  style={{ background: `linear-gradient(135deg, ${genre.gradient.join(',')})` }}
                />
                API 키 없이도 쓸 수 있는 장르별 무드 그라디언트 배경입니다. 은은한 광원이 움직여요.
              </div>
            )}

            {/* 미리보기 */}
            <div className="mt-6">
              <h4 className="mb-2 text-sm font-semibold text-zinc-300">미리보기</h4>
              <div className="overflow-hidden rounded-xl border border-zinc-800">
                <canvas ref={previewCanvasRef} width={VIDEO_W} height={VIDEO_H} className="block w-full" />
              </div>
              <button onClick={previewing ? stopPreview : startPreview} className="btn-secondary mt-3">
                {previewing ? '⏹ 미리보기 정지' : '▶ 소리와 함께 미리보기'}
              </button>
            </div>
          </>
        )}
      </Section>

      {/* STEP 5: 렌더링 */}
      <Section step={5} title="영상 완성" sub="이어 붙인 전체 플레이리스트를 실시간으로 녹화해 webm 영상 파일로 만듭니다. 전체 길이만큼 시간이 걸려요.">
        {!ready ? (
          <Placeholder>먼저 음악을 업로드해 주세요.</Placeholder>
        ) : rendering ? (
          <div>
            <div className="mb-2 flex justify-between text-sm text-zinc-400">
              <span>렌더링 중… 이 탭을 닫거나 다른 탭으로 이동하지 마세요.</span>
              <span>{formatTime(renderTime)} / {formatTime(duration)}</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-zinc-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-400 transition-[width]"
                style={{ width: `${Math.round(renderProgress * 100)}%` }}
              />
            </div>
            <button onClick={cancelRender} className="btn-secondary mt-4">취소</button>
          </div>
        ) : (
          <div>
            <button onClick={startRender} className="btn-primary text-lg">
              🎬 영상 만들기 ({tracks.length}곡 · {formatTime(duration)} 소요)
            </button>
            {renderError && <p className="mt-3 text-sm text-red-400">{renderError}</p>}

            {resultUrl && (
              <div className="mt-6 rounded-xl border border-emerald-700/50 bg-emerald-500/5 p-5">
                <h4 className="font-semibold text-emerald-300">✅ 영상이 완성됐어요! ({(resultSize / 1024 / 1024).toFixed(1)}MB)</h4>
                <video src={resultUrl} controls className="mt-3 w-full rounded-lg" />
                <a
                  href={resultUrl}
                  download={`${safeName}.webm`}
                  className="btn-primary mt-4 inline-block"
                >
                  ⬇ 영상 다운로드 (.webm)
                </a>
                <div className="mt-4 space-y-1 text-sm text-zinc-400">
                  <p className="font-medium text-zinc-300">유튜브 업로드 팁</p>
                  <p>· webm은 유튜브에 바로 업로드할 수 있어요 (YouTube Studio → 만들기 → 동영상 업로드).</p>
                  <p>· 제목에 “{genre.name.split(' ')[0]} playlist”, “{mood || '감성'} 플레이리스트” 같은 검색 키워드를 넣어 보세요.</p>
                  <p>· 설명란에 곡 시작 시각(타임스탬프)을 적으면 유튜브가 자동으로 챕터를 만들어 줍니다.</p>
                </div>
                {tracks.length > 1 && merged && (
                  <div className="mt-3 rounded-lg bg-zinc-900/60 p-3 font-mono text-xs text-zinc-300">
                    <p className="mb-1 font-sans font-medium text-zinc-400">📋 유튜브 설명란용 트랙리스트 (복사해서 붙여넣기)</p>
                    {tracks.map((t, i) => (
                      <div key={t.id}>{formatTime(merged.starts[i])} {t.name}</div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Section>

      <footer className="mt-16 border-t border-zinc-800 pt-6 text-center text-xs text-zinc-500">
        Playlist Studio · 업로드한 음원의 저작권은 사용자에게 책임이 있습니다. 직접 만들었거나 사용 허가를 받은 음원만 업로드해 주세요.
      </footer>
    </div>
  );
}

/* ---------- 작은 UI 컴포넌트 ---------- */
function Section({
  step,
  title,
  sub,
  children,
}: {
  step: number;
  title: string;
  sub: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-10 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6 sm:p-8">
      <div className="mb-5 flex items-start gap-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-600 font-bold text-white">
          {step}
        </div>
        <div>
          <h2 className="text-xl font-bold">{title}</h2>
          <p className="mt-1 text-sm text-zinc-400">{sub}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-zinc-300">{label}</span>
      {children}
    </label>
  );
}

function Placeholder({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-zinc-800 p-6 text-center text-sm text-zinc-500">
      {children}
    </div>
  );
}

function Tab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
        active ? 'bg-violet-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
      }`}
    >
      {children}
    </button>
  );
}
