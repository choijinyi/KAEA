const TARGET_RATE = 44100;

/** 오디오 파일을 AudioBuffer로 디코드한다 */
export async function decodeAudioFile(file: File): Promise<AudioBuffer> {
  const ctx = new AudioContext();
  try {
    return await ctx.decodeAudioData(await file.arrayBuffer());
  } finally {
    void ctx.close();
  }
}

/** 샘플레이트/채널이 다르면 44.1kHz 스테레오로 리샘플링한다 */
async function toStandard(buf: AudioBuffer): Promise<AudioBuffer> {
  if (buf.sampleRate === TARGET_RATE && buf.numberOfChannels === 2) return buf;
  const off = new OfflineAudioContext(2, Math.ceil(buf.duration * TARGET_RATE), TARGET_RATE);
  const src = off.createBufferSource();
  src.buffer = buf;
  src.connect(off.destination);
  src.start();
  return off.startRendering();
}

export interface MergedAudio {
  buffer: AudioBuffer;
  /** 각 곡이 시작하는 시각(초) — 병합 타임라인 기준 */
  starts: number[];
  duration: number;
}

/** 여러 곡을 곡 사이 gapSec 간격을 두고 하나의 버퍼로 이어 붙인다 */
export async function mergeTracks(buffers: AudioBuffer[], gapSec = 0.8): Promise<MergedAudio> {
  const standardized: AudioBuffer[] = [];
  for (const b of buffers) standardized.push(await toStandard(b));

  const gap = Math.round(gapSec * TARGET_RATE);
  const totalLength =
    standardized.reduce((sum, b) => sum + b.length, 0) + gap * Math.max(0, standardized.length - 1);
  const out = new AudioBuffer({ numberOfChannels: 2, length: totalLength, sampleRate: TARGET_RATE });

  const starts: number[] = [];
  let pos = 0;
  standardized.forEach((b, i) => {
    starts.push(pos / TARGET_RATE);
    for (let ch = 0; ch < 2; ch++) {
      out.getChannelData(ch).set(b.getChannelData(Math.min(ch, b.numberOfChannels - 1)), pos);
    }
    pos += b.length + (i < standardized.length - 1 ? gap : 0);
  });

  return { buffer: out, starts, duration: out.duration };
}

/** AudioBuffer를 16비트 PCM WAV Blob으로 인코딩한다 (미리보기/탭싱크 재생용) */
export function audioBufferToWav(buffer: AudioBuffer): Blob {
  const channels = buffer.numberOfChannels;
  const rate = buffer.sampleRate;
  const frames = buffer.length;
  const dataSize = frames * channels * 2;
  const ab = new ArrayBuffer(44 + dataSize);
  const view = new DataView(ab);

  const writeStr = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, channels, true);
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * channels * 2, true);
  view.setUint16(32, channels * 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  const chData: Float32Array[] = [];
  for (let ch = 0; ch < channels; ch++) chData.push(buffer.getChannelData(ch));
  for (let i = 0; i < frames; i++) {
    for (let ch = 0; ch < channels; ch++) {
      const v = Math.max(-1, Math.min(1, chData[ch][i]));
      view.setInt16(offset, v < 0 ? v * 0x8000 : v * 0x7fff, true);
      offset += 2;
    }
  }
  return new Blob([ab], { type: 'audio/wav' });
}
