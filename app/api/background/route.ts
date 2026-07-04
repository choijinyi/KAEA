import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60;
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'GEMINI_API_KEY가 설정되지 않았습니다. Vercel 프로젝트의 환경 변수에 키를 추가해 주세요.' },
      { status: 503 },
    );
  }

  try {
    const { scene, style } = (await req.json()) as { scene?: string; style?: string };
    if (!scene?.trim()) {
      return NextResponse.json({ error: '장면 설명이 필요합니다.' }, { status: 400 });
    }

    const prompt = [
      'A beautiful 16:9 background artwork for a YouTube music playlist video.',
      `Scene: ${scene.trim()}`,
      style ? `Art style: ${style}` : '',
      'No text, no letters, no watermark, no logo. Leave the lower third visually calm so subtitles are readable.',
    ]
      .filter(Boolean)
      .join('\n');

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: prompt,
      config: {
        imageConfig: { aspectRatio: '16:9' },
      },
    });

    const parts = response.candidates?.[0]?.content?.parts ?? [];
    for (const part of parts) {
      if (part.inlineData?.data) {
        const mime = part.inlineData.mimeType || 'image/png';
        return NextResponse.json({ image: `data:${mime};base64,${part.inlineData.data}` });
      }
    }
    return NextResponse.json(
      { error: '이미지가 생성되지 않았습니다. 장면 설명을 바꿔 다시 시도해 주세요.' },
      { status: 502 },
    );
  } catch (e) {
    console.error('background error', e);
    return NextResponse.json(
      { error: '배경 이미지 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.' },
      { status: 500 },
    );
  }
}
