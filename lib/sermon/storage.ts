import {Conversation, DEFAULT_SETTINGS, SermonSettings} from './types';

const KEY_API = 'sermon.anthropicApiKey';
const KEY_SETTINGS = 'sermon.settings';
const KEY_CONVERSATIONS = 'sermon.conversations';

// API 키는 이 브라우저의 localStorage에만 저장되며 서버로 전송되지 않는다.

export function loadApiKey(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(KEY_API) ?? '';
}

export function saveApiKey(key: string) {
  localStorage.setItem(KEY_API, key);
}

export function clearApiKey() {
  localStorage.removeItem(KEY_API);
}

export function loadSettings(): SermonSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(KEY_SETTINGS);
    if (!raw) return DEFAULT_SETTINGS;
    return {...DEFAULT_SETTINGS, ...JSON.parse(raw)};
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: SermonSettings) {
  localStorage.setItem(KEY_SETTINGS, JSON.stringify(settings));
}

export function loadConversations(): Conversation[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY_CONVERSATIONS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveConversations(conversations: Conversation[]) {
  try {
    localStorage.setItem(KEY_CONVERSATIONS, JSON.stringify(conversations));
  } catch {
    // localStorage 용량 초과 시 가장 오래된 대화부터 잘라서 재시도
    const trimmed = [...conversations]
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, Math.max(1, Math.floor(conversations.length / 2)));
    try {
      localStorage.setItem(KEY_CONVERSATIONS, JSON.stringify(trimmed));
    } catch {
      /* 저장 불가 — 세션 메모리로만 유지 */
    }
  }
}

export function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}
