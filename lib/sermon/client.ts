import Anthropic from '@anthropic-ai/sdk';
import type {BetaMessageStreamParams} from '@anthropic-ai/sdk/resources/beta/messages/messages';
import {SERMON_SYSTEM_PROMPT} from './prompt';
import {ChatMessage, SermonSettings} from './types';

// 사용자의 API 키로 브라우저에서 Anthropic API를 직접 호출한다.
// 키는 사용자의 브라우저를 떠나 Anthropic 외의 서버로 전송되지 않는다.
function createClient(apiKey: string) {
  return new Anthropic({apiKey, dangerouslyAllowBrowser: true});
}

/** 키 유효성 확인 — 모델 목록 조회는 토큰을 소비하지 않는다. */
export async function validateApiKey(apiKey: string): Promise<void> {
  const client = createClient(apiKey);
  await client.models.list();
}

function buildSystem(settings: SermonSettings) {
  const blocks: Anthropic.Beta.BetaTextBlockParam[] = [
    {
      type: 'text',
      text: SERMON_SYSTEM_PROMPT,
      cache_control: {type: 'ephemeral'},
    },
  ];
  const extras: string[] = [];
  if (settings.tradition.trim()) {
    extras.push(`사용자의 교단/신학 전통: ${settings.tradition.trim()}`);
  }
  if (settings.context.trim()) {
    extras.push(`사용자의 기본 설교 상황: ${settings.context.trim()}`);
  }
  if (extras.length > 0) {
    blocks.push({type: 'text', text: extras.join('\n')});
  }
  return blocks;
}

export interface StreamHandle {
  abort: () => void;
  done: Promise<{text: string; stopReason: string | null}>;
}

export function streamChat(
  apiKey: string,
  settings: SermonSettings,
  history: ChatMessage[],
  onDelta: (text: string) => void,
): StreamHandle {
  const client = createClient(apiKey);

  const params: BetaMessageStreamParams = {
    model: settings.model,
    max_tokens: 64000,
    system: buildSystem(settings),
    messages: history.map(m => ({role: m.role, content: m.content})),
  };

  // Opus 5는 안전 분류기가 요청을 거절할 수 있으므로 서버측 폴백을 기본 적용한다.
  if (settings.model === 'claude-opus-5') {
    params.betas = ['server-side-fallback-2026-07-01'];
    params.fallbacks = 'default';
  }

  const stream = client.beta.messages.stream(params);
  stream.on('text', onDelta);

  const done = stream.finalMessage().then(message => {
    const text = message.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('');
    return {text, stopReason: message.stop_reason};
  });

  return {abort: () => stream.abort(), done};
}

/** 사용자에게 보여줄 한국어 오류 메시지로 변환 */
export function describeError(error: unknown): string {
  if (error instanceof Anthropic.APIUserAbortError) {
    return '';
  }
  if (error instanceof Anthropic.AuthenticationError) {
    return 'API 키가 유효하지 않습니다. 설정에서 키를 다시 확인해 주세요.';
  }
  if (error instanceof Anthropic.PermissionDeniedError) {
    return 'API 키에 이 모델을 사용할 권한이 없습니다. 다른 모델을 선택하거나 콘솔에서 키 권한을 확인해 주세요.';
  }
  if (error instanceof Anthropic.RateLimitError) {
    return '요청 한도를 초과했습니다. 잠시 후 다시 시도해 주세요.';
  }
  if (error instanceof Anthropic.BadRequestError) {
    return `요청이 거부되었습니다: ${error.message}`;
  }
  if (error instanceof Anthropic.APIConnectionError) {
    return '네트워크 연결에 실패했습니다. 인터넷 연결을 확인해 주세요.';
  }
  if (error instanceof Anthropic.APIError) {
    return `API 오류가 발생했습니다 (${error.status ?? '?'}): ${error.message}`;
  }
  return error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
}
