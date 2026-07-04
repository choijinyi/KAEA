import { Type } from '@google/genai';

/** 가사 전사 프롬프트 — 서버 라우트와 클라이언트 직접 호출에서 공용 */
export const TRANSCRIBE_PROMPT = [
  'You are a professional lyric transcriber for karaoke-style subtitles.',
  'Listen to this song and transcribe the sung lyrics in their ORIGINAL language (keep Korean as Korean, English as English).',
  'Split the lyrics into natural subtitle lines of roughly 2-8 seconds each, with accurate start/end timestamps in seconds.',
  'If a section is instrumental with no vocals, do not create a line for it.',
  'If there are no vocals at all in the entire track, return an empty lines array.',
  "Also describe the overall mood in Korean (one short phrase), and write a rich English image-generation prompt (scenePromptEn) describing a scene that visually matches the song, with no text or people's faces close-up.",
].join('\n');

export const TRANSCRIBE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    lines: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          start: { type: Type.NUMBER },
          end: { type: Type.NUMBER },
          text: { type: Type.STRING },
        },
        required: ['start', 'end', 'text'],
      },
    },
    mood: { type: Type.STRING },
    scenePromptEn: { type: Type.STRING },
  },
  required: ['lines', 'mood', 'scenePromptEn'],
};

export function buildBackgroundPrompt(scene: string, style?: string): string {
  return [
    'A beautiful 16:9 background artwork for a YouTube music playlist video.',
    `Scene: ${scene.trim()}`,
    style ? `Art style: ${style}` : '',
    'No text, no letters, no watermark, no logo. Leave the lower third visually calm so subtitles are readable.',
  ]
    .filter(Boolean)
    .join('\n');
}
