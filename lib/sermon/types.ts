export type ChatRole = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: number;
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

export interface SermonSettings {
  model: string;
  /** 교단/신학 전통 (선택) — 시스템 프롬프트 뒤에 컨텍스트로 추가 */
  tradition: string;
  /** 기본 청중/설교 상황 메모 (선택) */
  context: string;
}

export const MODEL_OPTIONS: {id: string; label: string; description: string}[] = [
  {
    id: 'claude-opus-5',
    label: 'Claude Opus 5',
    description: '가장 깊이 있는 연구 품질 (권장)',
  },
  {
    id: 'claude-sonnet-5',
    label: 'Claude Sonnet 5',
    description: '속도와 품질의 균형, 비용 절감',
  },
  {
    id: 'claude-haiku-4-5',
    label: 'Claude Haiku 4.5',
    description: '빠른 응답, 가장 저렴',
  },
];

export const DEFAULT_SETTINGS: SermonSettings = {
  model: 'claude-opus-5',
  tradition: '',
  context: '',
};
