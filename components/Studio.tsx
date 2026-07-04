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

const MAX_AI_BYTES = 4 * 1024 * 1024;

type BgMode = 'ai' | 'gradient';

export default function Studio() {
  // 1. 장르
  const [genreId, setGenreId] = useState('lofi');
  const genre = getGenre(genreId);

  // 2. 오디오
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [audioError, setAudioError] = useState('');
  const [dragOver, setDragOver] = useState(false);

  // 3. 자막
  const [lines, setLines] = useState<SubtitleLine[]>([]);
  const [lyricsText, setLyricsText] = useState('');
  const [transcribing, setTranscribing] = useState(false);
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

  const scene: SceneConfig = useMemo(
    () => ({
      bgImage: bgMode === 'ai' ? bgImageEl : null,
      gradient: genre.gradient,
      title: title || '나의 플레이리스트',
      artist,
      genreLabel: genre.name,
      lines,
      duration,
    }),
    [bgMode, bgImageEl, genre, title, artist, lines, duration],
  );

  /* ---------- 오디오 업로드 ---------- */
  const onFile = useCallback(async (f: File) => {
    setAudioError('');
    if (!f.type.startsWith('audio/') && !/\.(mp3|m4a|wav|ogg|flac|aac|webm)$/i.test(f.name)) {
      setAudioError('오디오 파일(MP3, M4A, WAV 등)을 올려 주세요.');
      return;
    }
    try {
      const data = await f.arrayBuffer();
      const actx = new AudioContext();
      const buf = await actx.decodeAudioData(data.slice(0));
      await actx.close();
      setAudioFile(f);
      setDuration(buf.duration);
      setAudioUrl(prev => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(f);
      });
      if (!title) setTitle(f.name.replace(/\.[^.]+$/, ''));
      setLines([]);
      setResultUrl(null);
    } catch {
      setAudioError('오디오를 해석할 수 없습니다. 다른 파일로 시도해 주세요.');
    }
  }, [title]);

  /* ---------- AI 가사 추출 ---------- */
  const transcribe = async () => {
    if (!audioFile) return;
    setSubtitleError('');
    if (audioFile.size > MAX_AI_BYTES) {
      setSubtitleError('AI 가사 추출은 4MB 이하 파일만 지원합니다. 아래에 가사를 직접 붙여넣어 주세요.');
      return;
    }
    setTranscribing(true);
    try {
      const form = new FormData();
      form.append('audio', audioFile);
      const res = await fetch('/api/transcribe', { method: 'POST', body: form });
      const json = (await res.json()) as TranscribeResult & { error?: string };
      if (!res.ok) throw new Error(json.error || '가사 추출에 실패했습니다.');
      const normalized = normalizeLines(json.lines ?? [], duration);
      setLines(normalized);
      setMood(json.mood || '');
      if (json.scenePromptEn && !sceneTouched) setScenePrompt(json.scenePromptEn);
      if (normalized.length === 0) {
        setSubtitleError('보컬(가사)을 찾지 못했습니다. 연주곡이라면 자막 없이 진행해도 좋아요.');
      }
    } catch (e) {
      setSubtitleError(e instanceof Error ? e.message : '가사 추출에 실패했습니다.');
    } finally {
      setTranscribing(false);
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
    if (!audioUrl || lines.length === 0) return;
    stopPreview();
    const audio = new Audio(audioUrl);
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
      const res = await fetch('/api/background', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scene: scenePrompt || genre.defaultScene, style: genre.imageStyle }),
      });
      const json = (await res.json()) as { image?: string; error?: string };
      if (!res.ok || !json.image) throw new Error(json.error || '배경 생성에 실패했습니다.');
      setBgImageUrl(json.image);
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
    if (!audioUrl) return;
    stopPreview();
    const canvas = previewCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const audio = new Audio(audioUrl);
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
    if (!audioFile) return;
    stopPreview();
    setRenderError('');
    setResultUrl(null);
    setRendering(true);
    setRenderProgress(0);
    try {
      const data = await audioFile.arrayBuffer();
      const handle = renderVideo(data, sceneRef.current, (p, t) => {
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

  const ready = !!audioFile;
  const safeName = (title || 'playlist').replace(/[\\/:*?"<>|]/g, '_');

  /* ================= UI ================= */
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:py-14">
      {/* 헤더 */}
      <header className="mb-12 text-center">
        <p className="mb-3 text-sm font-medium tracking-[0.3em] text-violet-400">PLAYLIST STUDIO</p>
        <h1 className="text-3xl font-bold leading-tight sm:text-5xl">
          노래 한 곡이 <span className="gradient-text">유튜브 플레이리스트 영상</span>이 됩니다
        </h1>
        <p className="mt-4 text-zinc-400">
          음악을 올리면 AI가 가사를 추출해 자막을 만들고, 곡에 어울리는 배경을 그려 영상으로 완성해요.
        </p>
      </header>

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

      {/* STEP 2: 음악 업로드 */}
      <Section step={2} title="음악 업로드" sub="MP3, M4A, WAV 등 오디오 파일을 올려 주세요.">
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => {
            e.preventDefault();
            setDragOver(false);
            const f = e.dataTransfer.files[0];
            if (f) void onFile(f);
          }}
          className={`rounded-xl border-2 border-dashed p-8 text-center transition ${
            dragOver ? 'border-violet-400 bg-violet-500/10' : 'border-zinc-700 bg-zinc-900/40'
          }`}
        >
          {audioFile ? (
            <div>
              <div className="text-lg font-semibold">🎵 {audioFile.name}</div>
              <div className="mt-1 text-sm text-zinc-400">
                {formatTime(duration)} · {(audioFile.size / 1024 / 1024).toFixed(1)}MB
              </div>
              {audioUrl && <audio controls src={audioUrl} className="mx-auto mt-4 w-full max-w-md" />}
            </div>
          ) : (
            <div className="text-zinc-400">
              <div className="text-4xl">🎧</div>
              <p className="mt-3">파일을 끌어다 놓거나 아래 버튼으로 선택하세요</p>
            </div>
          )}
          <label className="mt-5 inline-block cursor-pointer rounded-lg bg-violet-600 px-5 py-2.5 font-medium text-white transition hover:bg-violet-500">
            {audioFile ? '다른 파일 선택' : '오디오 파일 선택'}
            <input
              type="file"
              accept="audio/*,.mp3,.m4a,.wav,.ogg,.flac,.aac"
              className="hidden"
              onChange={e => {
                const f = e.target.files?.[0];
                if (f) void onFile(f);
                e.target.value = '';
              }}
            />
          </label>
          {audioError && <p className="mt-3 text-sm text-red-400">{audioError}</p>}
        </div>

        {ready && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label="영상 제목">
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="input"
                placeholder="예: 비 오는 밤, 재즈 한 잔"
              />
            </Field>
            <Field label="아티스트 (선택)">
              <input
                value={artist}
                onChange={e => setArtist(e.target.value)}
                className="input"
                placeholder="예: KAEA"
              />
            </Field>
          </div>
        )}
      </Section>

      {/* STEP 3: 자막 */}
      <Section step={3} title="스크립트 · 자막" sub="AI가 노래에서 가사를 받아써 타임스탬프 자막을 만들어요. 연주곡이라면 건너뛰어도 됩니다.">
        {!ready ? (
          <Placeholder>먼저 음악을 업로드해 주세요.</Placeholder>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <button onClick={transcribe} disabled={transcribing} className="btn-primary">
                {transcribing ? '가사 추출 중… (최대 1분)' : '✨ AI 가사 자동 추출'}
              </button>
              {audioFile && audioFile.size > MAX_AI_BYTES && (
                <span className="text-xs text-amber-400">
                  4MB 초과 파일은 AI 추출 대신 아래에 가사를 직접 붙여넣어 주세요.
                </span>
              )}
              {mood && <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-300">무드: {mood}</span>}
            </div>
            {subtitleError && <p className="mt-3 text-sm text-amber-400">{subtitleError}</p>}

            <details className="mt-4 rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
              <summary className="cursor-pointer text-sm font-medium text-zinc-300">
                ✍️ 가사 직접 붙여넣기 (한 줄 = 자막 한 줄)
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
      <Section step={5} title="영상 완성" sub="곡 전체를 실시간으로 녹화해 webm 영상 파일로 만듭니다. 곡 길이만큼 시간이 걸려요.">
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
              🎬 영상 만들기 ({formatTime(duration)} 소요)
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
                  <p>· 여러 곡을 만들었다면 유튜브 재생목록으로 묶으면 시청 시간이 길어집니다.</p>
                </div>
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
