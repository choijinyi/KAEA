import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';
import { TRANSCRIBE_PROMPT, TRANSCRIBE_SCHEMA } from '@/lib/prompts';

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
        { error: '서버 경유 AI 가사 추출은 4MB 이하 파일만 지원합니다. 앱에 본인 API 키를 등록하면 크기 제한 없이 추출할 수 있어요.' },
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
            { text: TRANSCRIBE_PROMPT },
          ],
        },
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: TRANSCRIBE_SCHEMA,
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
