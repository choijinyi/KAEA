import type { SubtitleLine } from './types';

export interface SceneConfig {
  bgImage: HTMLImageElement | null;
  gradient: [string, string, string];
  title: string;
  artist: string;
  genreLabel: string;
  lines: SubtitleLine[];
  duration: number;
}

export const VIDEO_W = 1280;
export const VIDEO_H = 720;

const FONT_STACK =
  '"Pretendard", "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", sans-serif';

function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  w: number,
  h: number,
  scale: number,
) {
  const ir = img.width / img.height;
  const cr = w / h;
  let dw: number, dh: number;
  if (ir > cr) {
    dh = h * scale;
    dw = dh * ir;
  } else {
    dw = w * scale;
    dh = dw / ir;
  }
  ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const rows: string[] = [];
  let cur = '';
  for (const w of words) {
    const t = cur ? cur + ' ' + w : w;
    if (ctx.measureText(t).width > maxWidth && cur) {
      rows.push(cur);
      cur = w;
    } else {
      cur = t;
    }
  }
  if (cur) rows.push(cur);
  return rows;
}

/** 매 프레임을 그린다. t: 현재 재생 시간(초), freq: 오디오 주파수 데이터 */
export function drawFrame(
  ctx: CanvasRenderingContext2D,
  scene: SceneConfig,
  t: number,
  freq: Uint8Array | null,
) {
  const W = VIDEO_W;
  const H = VIDEO_H;

  // --- 배경 ---
  if (scene.bgImage) {
    // 켄 번즈: 아주 느린 줌 + 좌우 팬
    const zoom = 1.06 + 0.04 * Math.sin(t * 0.03);
    ctx.save();
    ctx.translate(Math.sin(t * 0.02) * 12, Math.cos(t * 0.017) * 8);
    drawCover(ctx, scene.bgImage, W, H, zoom);
    ctx.restore();
  } else {
    const [c1, c2, c3] = scene.gradient;
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, c1);
    g.addColorStop(0.55, c2);
    g.addColorStop(1, c3);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // 떠다니는 광원 두 개
    for (let i = 0; i < 2; i++) {
      const cx = W * (0.3 + 0.4 * i) + Math.sin(t * 0.15 + i * 2.4) * 160;
      const cy = H * (0.35 + 0.25 * i) + Math.cos(t * 0.11 + i * 1.7) * 90;
      const r = 260 + 60 * Math.sin(t * 0.2 + i);
      const rg = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      rg.addColorStop(0, 'rgba(255,255,255,0.14)');
      rg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = rg;
      ctx.fillRect(0, 0, W, H);
    }
  }

  // 어두운 오버레이 + 비네트 (자막 가독성)
  ctx.fillStyle = 'rgba(0,0,0,0.30)';
  ctx.fillRect(0, 0, W, H);
  const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.95);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.45)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);

  // --- 타이틀 (좌상단) ---
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 8;
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.font = `600 30px ${FONT_STACK}`;
  ctx.fillText(`♪ ${scene.title}`, 48, 68);
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.font = `400 22px ${FONT_STACK}`;
  const sub = scene.artist ? `${scene.artist} · ${scene.genreLabel}` : scene.genreLabel;
  ctx.fillText(sub, 48, 102);
  ctx.shadowBlur = 0;

  // --- 비주얼라이저 ---
  if (freq) {
    const bars = 56;
    const gap = 4;
    const bw = (W - 96 - gap * (bars - 1)) / bars;
    const baseY = H - 64;
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    for (let i = 0; i < bars; i++) {
      const idx = Math.floor((i / bars) * freq.length * 0.7);
      const v = freq[idx] / 255;
      const bh = 4 + v * 54;
      ctx.beginPath();
      ctx.roundRect(48 + i * (bw + gap), baseY - bh, bw, bh, 2);
      ctx.fill();
    }
  }

  // --- 자막 ---
  const line = scene.lines.find(l => t >= l.start && t < l.end);
  if (line) {
    const fadeIn = Math.min(1, (t - line.start) / 0.35);
    const fadeOut = Math.min(1, (line.end - t) / 0.35);
    const alpha = Math.max(0, Math.min(fadeIn, fadeOut));
    ctx.font = `700 44px ${FONT_STACK}`;
    ctx.textAlign = 'center';
    const rows = wrapText(ctx, line.text, W * 0.8);
    ctx.shadowColor = 'rgba(0,0,0,0.75)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 2;
    const lineH = 58;
    const baseY = H - 150 - (rows.length - 1) * lineH + (1 - alpha) * 10;
    rows.forEach((row, i) => {
      ctx.fillStyle = `rgba(255,255,255,${0.96 * alpha})`;
      ctx.fillText(row, W / 2, baseY + i * lineH);
    });
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  }

  // --- 진행 바 ---
  const p = scene.duration > 0 ? Math.min(1, t / scene.duration) : 0;
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(0, H - 5, W, 5);
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.fillRect(0, H - 5, W * p, 5);
}

function pickMimeType(): string {
  const candidates = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4',
  ];
  for (const c of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(c)) return c;
  }
  return '';
}

export interface RenderHandle {
  cancel: () => void;
  done: Promise<Blob>;
}

/**
 * 오디오 전체 길이만큼 실시간으로 캔버스를 녹화해 webm 영상을 만든다.
 * (탭이 백그라운드로 가면 프레임이 멈추므로 렌더링 중 탭을 유지해야 한다)
 */
export function renderVideo(
  audioData: ArrayBuffer,
  scene: SceneConfig,
  onProgress: (p: number, t: number) => void,
): RenderHandle {
  let cancelled = false;
  let cleanup: (() => void) | null = null;

  const done = new Promise<Blob>((resolve, reject) => {
    (async () => {
      const canvas = document.createElement('canvas');
      canvas.width = VIDEO_W;
      canvas.height = VIDEO_H;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('캔버스를 생성할 수 없습니다.');

      const actx = new AudioContext();
      const buffer = await actx.decodeAudioData(audioData.slice(0));
      const src = actx.createBufferSource();
      src.buffer = buffer;
      const analyser = actx.createAnalyser();
      analyser.fftSize = 256;
      const dest = actx.createMediaStreamDestination();
      src.connect(analyser);
      analyser.connect(dest);

      const stream = canvas.captureStream(30);
      dest.stream.getAudioTracks().forEach(tr => stream.addTrack(tr));

      const mimeType = pickMimeType();
      if (!mimeType) throw new Error('이 브라우저는 영상 녹화(MediaRecorder)를 지원하지 않습니다.');
      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 6_000_000,
        audioBitsPerSecond: 192_000,
      });
      const chunks: Blob[] = [];
      recorder.ondataavailable = e => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      const freq = new Uint8Array(analyser.frequencyBinCount);
      let raf = 0;
      const t0 = actx.currentTime;
      const duration = buffer.duration;

      const stopAll = () => {
        cancelAnimationFrame(raf);
        try { src.stop(); } catch { /* already stopped */ }
        if (recorder.state !== 'inactive') recorder.stop();
        void actx.close();
      };
      cleanup = stopAll;

      recorder.onstop = () => {
        if (cancelled) {
          reject(new Error('cancelled'));
        } else {
          resolve(new Blob(chunks, { type: mimeType }));
        }
      };
      recorder.onerror = () => reject(new Error('녹화 중 오류가 발생했습니다.'));

      const tick = () => {
        const t = actx.currentTime - t0;
        analyser.getByteFrequencyData(freq);
        drawFrame(ctx, scene, t, freq);
        onProgress(Math.min(1, t / duration), t);
        if (t < duration && !cancelled) {
          raf = requestAnimationFrame(tick);
        }
      };

      recorder.start(1000);
      src.start();
      raf = requestAnimationFrame(tick);

      src.onended = () => {
        // 마지막 프레임 여유
        setTimeout(() => {
          cancelAnimationFrame(raf);
          if (recorder.state !== 'inactive') recorder.stop();
          void actx.close();
        }, 300);
      };
    })().catch(reject);
  });

  return {
    cancel: () => {
      cancelled = true;
      cleanup?.();
    },
    done,
  };
}
