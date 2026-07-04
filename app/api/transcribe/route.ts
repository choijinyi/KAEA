import { GoogleGenAI, Type } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60;
export const runtime = 'nodejs';

// Vercel 서버리스 요청 본문 한도(4.5MB)를 감안한 업로드 제한
const MAX_BYTES = 4 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'GEMINI_API_KEY가 설정되지 않았습니다. Vercel 프로젝트의 환경 변수에 키를 추가해 주세요.' },
      { status: 503 },
    );
  }

  try {
    const form = await req.formData();
    const file = form.get('audio');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: '오디오 파일이 없습니다.' }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: 'AI 가사 추출은 4MB 이하 파일만 지원합니다. (128kbps MP3 기준 약 4분) 가사를 직접 붙여넣어 주세요.' },
        { status: 413 },
      );
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { inlineData: { mimeType: file.type || 'audio/mpeg', data: bytes.toString('base64') } },
            {
              text: [
                'You are a professional lyric transcriber for karaoke-style subtitles.',
                'Listen to this song and transcribe the sung lyrics in their ORIGINAL language (keep Korean as Korean, English as English).',
                'Split the lyrics into natural subtitle lines of roughly 2-8 seconds each, with accurate start/end timestamps in seconds.',
                'If a section is instrumental with no vocals, do not create a line for it.',
                'If there are no vocals at all in the entire track, return an empty lines array.',
                'Also describe the overall mood in Korean (one short phrase), and write a rich English image-generation prompt (scenePromptEn) describing a scene that visually matches the song, with no text or people\'s faces close-up.',
              ].join('\n'),
            },
          ],
        },
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
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
        },
      },
    });

    const text = response.text;
    if (!text) {
      return NextResponse.json({ error: 'AI 응답이 비어 있습니다. 다시 시도해 주세요.' }, { status: 502 });
    }
    return NextResponse.json(JSON.parse(text));
  } catch (e) {
    console.error('transcribe error', e);
    return NextResponse.json(
      { error: '가사 추출에 실패했습니다. 잠시 후 다시 시도하거나 가사를 직접 입력해 주세요.' },
      { status: 500 },
    );
  }
}
