import { GoogleGenAI } from '@google/genai';
import { buildBackgroundPrompt, TRANSCRIBE_PROMPT, TRANSCRIBE_SCHEMA } from './prompts';
import type { TranscribeResult } from './types';

/**
 * 사용자가 앱에 등록한 본인 API 키로 브라우저에서 Gemini를 직접 호출한다.
 * Files API를 쓰므로 서버리스 요청 한도(4MB)와 무관하게 큰 오디오도 처리할 수 있다.
 */

function friendly(e: unknown): Error {
  const msg = e instanceof Error ? e.message : String(e);
  if (/API key not valid|API_KEY_INVALID|PERMISSION_DENIED|401|403/i.test(msg)) {
    return new Error(
      'API 키가 유효하지 않습니다. Google AI Studio(aistudio.google.com/apikey)에서 발급한 키("AQ." 또는 "AIza"로 시작)인지 확인해 주세요.',
    );
  }
  if (/quota|RESOURCE_EXHAUSTED|429/i.test(msg)) {
    return new Error('API 사용량 한도에 도달했습니다. 잠시 후 다시 시도해 주세요.');
  }
  return new Error(msg);
}

export async function transcribeWithUserKey(file: File, apiKey: string): Promise<TranscribeResult> {
  try {
    const ai = new GoogleGenAI({ apiKey });
    const mimeType = file.type || 'audio/mpeg';

    let uploaded = await ai.files.upload({ file, config: { mimeType } });
    const deadline = Date.now() + 180_000;
    while (uploaded.state === 'PROCESSING' && Date.now() < deadline) {
      await new Promise(r => setTimeout(r, 2000));
      uploaded = await ai.files.get({ name: uploaded.name! });
    }
    if (uploaded.state === 'FAILED' || !uploaded.uri) {
      throw new Error('오디오 파일 처리에 실패했습니다. 다른 파일로 시도해 주세요.');
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { fileData: { fileUri: uploaded.uri, mimeType: uploaded.mimeType ?? mimeType } },
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
    if (!text) throw new Error('AI 응답이 비어 있습니다. 다시 시도해 주세요.');
    return JSON.parse(text) as TranscribeResult;
  } catch (e) {
    throw friendly(e);
  }
}

export async function generateBackgroundWithUserKey(
  scene: string,
  style: string,
  apiKey: string,
): Promise<string> {
  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: buildBackgroundPrompt(scene, style),
      config: { imageConfig: { aspectRatio: '16:9' } },
    });
    const parts = response.candidates?.[0]?.content?.parts ?? [];
    for (const part of parts) {
      if (part.inlineData?.data) {
        const mime = part.inlineData.mimeType || 'image/png';
        return `data:${mime};base64,${part.inlineData.data}`;
      }
    }
    throw new Error('이미지가 생성되지 않았습니다. 장면 설명을 바꿔 다시 시도해 주세요.');
  } catch (e) {
    throw friendly(e);
  }
}
