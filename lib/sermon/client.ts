import {GoogleGenAI} from '@google/genai';
import {SERMON_SYSTEM_PROMPT} from './prompt';
import {ChatMessage, SermonSettings} from './types';

// 사용자의 Google Gemini API 키로 브라우저에서 Gemini API를 직접 호출한다.
// 키는 사용자의 브라우저를 떠나 Google 외의 서버로 전송되지 않는다.

/** 키 유효성 확인 — 모델 목록 조회는 토큰을 소비하지 않는다. */
export async function validateApiKey(apiKey: string): Promise<void> {
  const ai = new GoogleGenAI({apiKey});
  await ai.models.list();
}

function buildSystemInstruction(settings: SermonSettings): string {
  const parts = [SERMON_SYSTEM_PROMPT];
  if (settings.tradition.trim()) {
    parts.push(`사용자의 교단/신학 전통: ${settings.tradition.trim()}`);
  }
  if (settings.context.trim()) {
    parts.push(`사용자의 기본 설교 상황: ${settings.context.trim()}`);
  }
  return parts.join('\n\n');
}

export interface StreamHandle {
  abort: () => void;
  done: Promise<{text: string; stopReason: string | null}>;
}

/** Gemini finishReason을 앱 내부 표기로 정규화한다. */
function normalizeStopReason(finish: string | null, blocked: boolean): string | null {
  if (blocked) return 'refusal';
  if (!finish) return null;
  if (finish === 'MAX_TOKENS') return 'max_tokens';
  if (finish === 'SAFETY' || finish === 'PROHIBITED_CONTENT' || finish === 'BLOCKLIST') {
    return 'refusal';
  }
  return finish.toLowerCase();
}

export function streamChat(
  apiKey: string,
  settings: SermonSettings,
  history: ChatMessage[],
  onDelta: (text: string) => void,
): StreamHandle {
  const ai = new GoogleGenAI({apiKey});
  const controller = new AbortController();

  const done = (async () => {
    const stream = await ai.models.generateContentStream({
      model: settings.model,
      contents: history.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{text: m.content}],
      })),
      config: {
        systemInstruction: buildSystemInstruction(settings),
        abortSignal: controller.signal,
      },
    });

    let text = '';
    let finish: string | null = null;
    let blocked = false;
    for await (const chunk of stream) {
      const t = chunk.text;
      if (t) {
        text += t;
        onDelta(t);
      }
      finish = chunk.candidates?.[0]?.finishReason ?? finish;
      if (chunk.promptFeedback?.blockReason) blocked = true;
    }
    return {text, stopReason: normalizeStopReason(finish, blocked)};
  })();

  return {abort: () => controller.abort(), done};
}

/** 사용자에게 보여줄 한국어 오류 메시지로 변환 */
export function describeError(error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error);
  if (
    (error instanceof Error && error.name === 'AbortError') ||
    /abort/i.test(msg)
  ) {
    return ''; // 사용자가 직접 중단한 경우
  }
  if (/API key not valid|API_KEY_INVALID|PERMISSION_DENIED|401|403/i.test(msg)) {
    return 'API 키가 유효하지 않습니다. Google AI Studio(aistudio.google.com/apikey)에서 발급한 키인지 확인해 주세요.';
  }
  if (/quota|RESOURCE_EXHAUSTED|429/i.test(msg)) {
    return 'API 사용량 한도에 도달했습니다. 잠시 후 다시 시도하거나 설정에서 다른 모델을 선택해 주세요.';
  }
  if (/NOT_FOUND|not found|404/i.test(msg)) {
    return '선택한 모델을 사용할 수 없습니다. 설정에서 다른 모델을 선택해 주세요.';
  }
  if (/UNAVAILABLE|OVERLOADED|503/i.test(msg)) {
    return '모델이 일시적으로 과부하 상태입니다. 잠시 후 다시 시도해 주세요.';
  }
  if (/Failed to fetch|network|ENOTFOUND/i.test(msg)) {
    return '네트워크 연결에 실패했습니다. 인터넷 연결을 확인해 주세요.';
  }
  return msg || '알 수 없는 오류가 발생했습니다.';
}
