/** 구글 제미나이 TTS 호출과 오디오 변환 유틸 (브라우저에서 실행) */

import {Mp3Encoder} from '@breezystack/lamejs';

const TTS_MODEL = 'gemini-2.5-flash-preview-tts';
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

/** 자연스러운 여성 목소리 프리셋 */
export const VOICES = [
  {id: 'Sulafat', label: '수라팟 — 따뜻한 목소리 (기본)'},
  {id: 'Kore', label: '코레 — 단정한 목소리'},
  {id: 'Leda', label: '레다 — 맑고 젊은 목소리'},
  {id: 'Aoede', label: '아오이데 — 산뜻한 목소리'},
  {id: 'Zephyr', label: '제피르 — 밝은 목소리'},
  {id: 'Vindemiatrix', label: '빈데미아트릭스 — 부드러운 목소리'},
] as const;

export const DEFAULT_VOICE = 'Sulafat';

export interface TtsChunk {
  text: string;
  /** 이 구간에 포함된 첫 절 번호 */
  startVerse: number;
  /** 이 구간에 포함된 마지막 절 번호 */
  endVerse: number;
}

/** 절 목록을 TTS 한 번에 보낼 수 있는 크기의 구간으로 묶는다 */
export function chunkVerses(
  verses: Array<{verse: number; text: string}>,
  maxChars = 1100,
): TtsChunk[] {
  const chunks: TtsChunk[] = [];
  let current: TtsChunk | null = null;
  for (const v of verses) {
    if (current && current.text.length + v.text.length + 1 > maxChars) {
      chunks.push(current);
      current = null;
    }
    if (current) {
      current.text += `\n${v.text}`;
      current.endVerse = v.verse;
    } else {
      current = {text: v.text, startVerse: v.verse, endVerse: v.verse};
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

/** 16비트 PCM(24kHz mono)을 재생 가능한 WAV Blob으로 감싼다 */
export function pcmToWavBlob(
  pcm: Uint8Array,
  sampleRate = 24000,
  numChannels = 1,
): Blob {
  const header = new ArrayBuffer(44);
  const view = new DataView(header);
  const byteRate = sampleRate * numChannels * 2;

  const writeString = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + pcm.length, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, numChannels * 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, pcm.length, true);

  return new Blob([header, pcm.buffer as ArrayBuffer], {type: 'audio/wav'});
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export class TtsError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
  }
}

/** PCM(24kHz mono 16bit) 조각들을 이어붙여 MP3 Blob으로 인코딩한다 */
export function encodeMp3(pcmChunks: Uint8Array[], sampleRate = 24000): Blob {
  const encoder = new Mp3Encoder(1, sampleRate, 96);
  const parts: Uint8Array[] = [];
  const BLOCK = 1152; // MP3 프레임 크기

  for (const pcm of pcmChunks) {
    const samples = new Int16Array(
      pcm.buffer,
      pcm.byteOffset,
      Math.floor(pcm.byteLength / 2),
    );
    for (let i = 0; i < samples.length; i += BLOCK) {
      const encoded = encoder.encodeBuffer(samples.subarray(i, i + BLOCK));
      if (encoded.length) parts.push(encoded);
    }
  }
  const tail = encoder.flush();
  if (tail.length) parts.push(tail);

  return new Blob(parts as BlobPart[], {type: 'audio/mpeg'});
}

/** 텍스트 한 덩어리를 제미나이 TTS로 합성해 PCM(24kHz mono 16bit)을 돌려준다 */
export async function synthesizePcm(
  apiKey: string,
  text: string,
  voice: string,
  signal?: AbortSignal,
): Promise<Uint8Array> {
  const prompt =
    '다음 성경 본문을 차분하고 따뜻한 톤으로, 또박또박 자연스럽게 낭독하세요:\n\n' +
    text;

  const res = await fetch(
    `${API_BASE}/${TTS_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      signal,
      body: JSON.stringify({
        contents: [{parts: [{text: prompt}]}],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {prebuiltVoiceConfig: {voiceName: voice}},
          },
        },
      }),
    },
  );

  if (!res.ok) {
    let detail = '';
    try {
      const err = await res.json();
      detail = err?.error?.message ?? '';
    } catch {
      // 응답 본문이 JSON이 아니면 상태 코드만 사용
    }
    if (res.status === 400 && /API key/i.test(detail)) {
      throw new TtsError('API 키가 올바르지 않습니다. 키를 다시 확인해 주세요.', 400);
    }
    if (res.status === 429) {
      throw new TtsError('API 사용량 한도에 도달했습니다. 잠시 후 다시 시도해 주세요.', 429);
    }
    throw new TtsError(detail || `음성 합성에 실패했습니다 (${res.status})`, res.status);
  }

  const data = await res.json();
  const b64 = data?.candidates?.[0]?.content?.parts?.find(
    (p: {inlineData?: {data?: string}}) => p.inlineData?.data,
  )?.inlineData?.data;
  if (!b64) {
    throw new TtsError('음성 데이터를 받지 못했습니다. 다시 시도해 주세요.');
  }

  return base64ToBytes(b64);
}
