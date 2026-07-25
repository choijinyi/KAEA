'use client';

import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  BookOpen,
  BookOpenText,
  Layers,
  Lightbulb,
  Loader2,
  Menu,
  MessageSquarePlus,
  Send,
  Settings,
  Square,
  Trash2,
  X,
} from 'lucide-react';
import {describeError, streamChat, StreamHandle} from '@/lib/sermon/client';
import {
  clearApiKey,
  loadApiKey,
  loadConversations,
  loadSettings,
  newId,
  saveConversations,
  saveSettings,
} from '@/lib/sermon/storage';
import {
  ChatMessage,
  Conversation,
  DEFAULT_SETTINGS,
  MODEL_OPTIONS,
  SermonSettings,
} from '@/lib/sermon/types';
import ApiKeySetup from './ApiKeySetup';
import Markdown from './Markdown';

const QUICK_STARTS = [
  {
    icon: Lightbulb,
    title: '주제로 시작 (Theme)',
    description: '설교 주제에 맞는 본문 후보를 추천받습니다.',
    template: '주제로 설교를 준비하려고 합니다. 주제: ',
  },
  {
    icon: BookOpenText,
    title: '본문으로 시작 (Passage)',
    description: '성경 본문을 입력하면 본문 연구부터 시작합니다.',
    template: '다음 본문으로 설교를 준비하려고 합니다. 본문: ',
  },
  {
    icon: Layers,
    title: '시리즈 설계 (Series)',
    description: '성경 한 권이나 주제로 설교 시리즈를 설계합니다.',
    template: '설교 시리즈를 설계하려고 합니다. 시리즈 주제 또는 성경책: ',
  },
];

export default function SermonApp() {
  // localStorage는 클라이언트에서만 접근 가능하므로 마운트 후 로드한다.
  const [hydrated, setHydrated] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [settings, setSettings] = useState<SermonSettings>(DEFAULT_SETTINGS);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState('');
  const [error, setError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const streamRef = useRef<StreamHandle | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    setApiKey(loadApiKey());
    setSettings(loadSettings());
    const stored = loadConversations();
    setConversations(stored);
    if (stored.length > 0) setActiveId(stored[0].id);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) saveConversations(conversations);
  }, [conversations, hydrated]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({behavior: 'smooth'});
  }, [streamText, activeId, conversations.length]);

  const active = useMemo(
    () => conversations.find(c => c.id === activeId) ?? null,
    [conversations, activeId],
  );

  const appendMessage = useCallback((conversationId: string, message: ChatMessage) => {
    setConversations(prev =>
      prev.map(c =>
        c.id === conversationId
          ? {...c, messages: [...c.messages, message], updatedAt: Date.now()}
          : c,
      ),
    );
  }, []);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;
    setError('');

    const userMessage: ChatMessage = {
      id: newId(),
      role: 'user',
      content: trimmed,
      createdAt: Date.now(),
    };

    // 대화가 없으면 새로 만든다.
    let conversationId = activeId;
    let history: ChatMessage[];
    if (!conversationId || !conversations.some(c => c.id === conversationId)) {
      conversationId = newId();
      const title = trimmed.replace(/\s+/g, ' ').slice(0, 40) || '새 대화';
      const conversation: Conversation = {
        id: conversationId,
        title,
        messages: [userMessage],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setConversations(prev => [conversation, ...prev]);
      setActiveId(conversationId);
      history = [userMessage];
    } else {
      const current = conversations.find(c => c.id === conversationId)!;
      history = [...current.messages, userMessage];
      appendMessage(conversationId, userMessage);
    }

    setInput('');
    setStreaming(true);
    setStreamText('');

    let partial = '';
    const handle = streamChat(apiKey, settings, history, delta => {
      partial += delta;
      setStreamText(partial);
    });
    streamRef.current = handle;

    try {
      const {text: finalText, stopReason} = await handle.done;
      let content = finalText || partial;
      if (stopReason === 'refusal' && !content.trim()) {
        content =
          '요청이 안전상의 이유로 처리되지 않았습니다. 질문을 조금 다르게 표현해서 다시 시도해 주세요.';
      } else if (stopReason === 'max_tokens') {
        content += '\n\n---\n*응답이 최대 길이에 도달해 잘렸습니다. "계속"이라고 입력하면 이어서 작성합니다.*';
      }
      if (content.trim()) {
        appendMessage(conversationId, {
          id: newId(),
          role: 'assistant',
          content,
          createdAt: Date.now(),
        });
      }
    } catch (e) {
      // 중단된 경우에도 지금까지 받은 내용은 보존한다.
      if (partial.trim()) {
        appendMessage(conversationId, {
          id: newId(),
          role: 'assistant',
          content: partial,
          createdAt: Date.now(),
        });
      }
      const message = describeError(e);
      if (message) setError(message);
    } finally {
      streamRef.current = null;
      setStreaming(false);
      setStreamText('');
    }
  }

  function stopStreaming() {
    streamRef.current?.abort();
  }

  function newConversation() {
    setActiveId(null);
    setError('');
    setSidebarOpen(false);
    textareaRef.current?.focus();
  }

  function deleteConversation(id: string) {
    setConversations(prev => prev.filter(c => c.id !== id));
    if (activeId === id) setActiveId(null);
  }

  function handleResetKey() {
    clearApiKey();
    setApiKey('');
    setSettingsOpen(false);
  }

  if (!hydrated) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-stone-100">
        <Loader2 className="h-6 w-6 animate-spin text-amber-700" />
      </div>
    );
  }

  if (!apiKey) {
    return <ApiKeySetup onReady={setApiKey} />;
  }

  const modelLabel =
    MODEL_OPTIONS.find(m => m.id === settings.model)?.label ?? settings.model;

  return (
    <div className="flex h-dvh bg-stone-100 text-stone-800">
      {/* ── 사이드바 ─────────────────────────────── */}
      <aside
        className={`${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-stone-200 bg-white transition-transform md:static md:translate-x-0`}
      >
        <div className="flex items-center gap-2 border-b border-stone-200 px-4 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-700 text-amber-50">
            <BookOpen className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate font-serif text-lg font-bold leading-tight">설교준비 도우미</h1>
            <p className="text-xs text-stone-400">{modelLabel}</p>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto rounded-md p-1.5 text-stone-400 hover:bg-stone-100 md:hidden"
            aria-label="사이드바 닫기"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-3">
          <button
            onClick={newConversation}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800 transition hover:bg-amber-100"
          >
            <MessageSquarePlus className="h-4 w-4" />새 설교 준비
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-3">
          {conversations.length === 0 && (
            <p className="px-2 py-4 text-center text-xs text-stone-400">
              아직 대화가 없습니다.
            </p>
          )}
          <ul className="space-y-1">
            {conversations.map(c => (
              <li key={c.id} className="group relative">
                <button
                  onClick={() => {
                    setActiveId(c.id);
                    setSidebarOpen(false);
                  }}
                  className={`w-full cursor-pointer truncate rounded-lg px-3 py-2 pr-8 text-left text-sm transition ${
                    c.id === activeId
                      ? 'bg-stone-200/80 font-medium text-stone-900'
                      : 'text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  {c.title}
                </button>
                <button
                  onClick={() => deleteConversation(c.id)}
                  className="absolute right-1.5 top-1/2 hidden -translate-y-1/2 cursor-pointer rounded p-1 text-stone-400 hover:bg-stone-200 hover:text-red-600 group-hover:block"
                  aria-label="대화 삭제"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="border-t border-stone-200 p-3">
          <button
            onClick={() => setSettingsOpen(true)}
            className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-stone-600 transition hover:bg-stone-100"
          >
            <Settings className="h-4 w-4" />
            설정
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── 메인 영역 ─────────────────────────────── */}
      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-stone-200 bg-white/70 px-4 py-3 backdrop-blur md:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-md p-1.5 text-stone-500 hover:bg-stone-100"
            aria-label="메뉴 열기"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="truncate font-serif font-bold">
            {active?.title ?? '설교준비 도우미'}
          </span>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-3xl px-4 py-6">
            {!active || active.messages.length === 0 ? (
              <div className="flex min-h-[60vh] flex-col items-center justify-center">
                <h2 className="mb-2 text-center font-serif text-2xl font-bold text-stone-700">
                  오늘은 어떤 말씀을 준비하시나요?
                </h2>
                <p className="mb-8 text-center text-sm text-stone-500">
                  본문 연구, 아웃라인, 설교문 초안까지 단계별로 함께 준비합니다.
                </p>
                <div className="grid w-full gap-3 sm:grid-cols-3">
                  {QUICK_STARTS.map(q => (
                    <button
                      key={q.title}
                      onClick={() => {
                        setInput(q.template);
                        textareaRef.current?.focus();
                      }}
                      className="cursor-pointer rounded-xl border border-stone-200 bg-white p-4 text-left transition hover:border-amber-300 hover:shadow-sm"
                    >
                      <q.icon className="mb-2 h-5 w-5 text-amber-700" />
                      <div className="mb-1 text-sm font-semibold text-stone-800">{q.title}</div>
                      <div className="text-xs leading-relaxed text-stone-500">{q.description}</div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {active.messages.map(m =>
                  m.role === 'user' ? (
                    <div key={m.id} className="flex justify-end">
                      <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-amber-700 px-4 py-2.5 text-[15px] leading-relaxed text-amber-50">
                        {m.content}
                      </div>
                    </div>
                  ) : (
                    <div
                      key={m.id}
                      className="rounded-2xl rounded-bl-md border border-stone-200 bg-white px-5 py-4 shadow-sm"
                    >
                      <Markdown content={m.content} />
                    </div>
                  ),
                )}
                {streaming && (
                  <div className="rounded-2xl rounded-bl-md border border-stone-200 bg-white px-5 py-4 shadow-sm">
                    {streamText ? (
                      <Markdown content={streamText} />
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-stone-500">
                        <Loader2 className="h-4 w-4 animate-spin text-amber-700" />
                        본문을 살피고 있습니다...
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </div>

        {/* ── 입력창 ─────────────────────────────── */}
        <div className="border-t border-stone-200 bg-white px-4 py-3">
          <div className="mx-auto w-full max-w-3xl">
            {error && (
              <div className="mb-2 flex items-start justify-between gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                <span>{error}</span>
                <button
                  onClick={() => setError('')}
                  className="cursor-pointer text-red-400 hover:text-red-600"
                  aria-label="오류 닫기"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            <div className="flex items-end gap-2 rounded-2xl border border-stone-300 bg-stone-50 p-2 focus-within:border-amber-600 focus-within:bg-white">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => {
                  setInput(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    sendMessage(input);
                  }
                }}
                rows={1}
                placeholder="본문, 주제, 또는 질문을 입력하세요... (Shift+Enter 줄바꿈)"
                className="max-h-[200px] flex-1 resize-none bg-transparent px-2 py-1.5 text-[15px] leading-relaxed text-stone-800 outline-none placeholder:text-stone-400"
              />
              {streaming ? (
                <button
                  onClick={stopStreaming}
                  className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-stone-700 text-white transition hover:bg-stone-800"
                  aria-label="응답 중단"
                >
                  <Square className="h-4 w-4" />
                </button>
              ) : (
                <button
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim()}
                  className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-amber-700 text-white transition hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="보내기"
                >
                  <Send className="h-4 w-4" />
                </button>
              )}
            </div>
            <p className="mt-1.5 text-center text-[11px] text-stone-400">
              AI의 연구 결과는 참고용입니다. 중요한 해석과 출처는 반드시 직접 확인하세요.
            </p>
          </div>
        </div>
      </main>

      {/* ── 설정 모달 ─────────────────────────────── */}
      {settingsOpen && (
        <SettingsModal
          settings={settings}
          onSave={next => {
            setSettings(next);
            saveSettings(next);
            setSettingsOpen(false);
          }}
          onClose={() => setSettingsOpen(false)}
          onResetKey={handleResetKey}
        />
      )}
    </div>
  );
}

function SettingsModal({
  settings,
  onSave,
  onClose,
  onResetKey,
}: {
  settings: SermonSettings;
  onSave: (s: SermonSettings) => void;
  onClose: () => void;
  onResetKey: () => void;
}) {
  const [draft, setDraft] = useState(settings);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-serif text-lg font-bold text-stone-800">설정</h2>
          <button
            onClick={onClose}
            className="cursor-pointer rounded-md p-1 text-stone-400 hover:bg-stone-100"
            aria-label="닫기"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-semibold text-stone-700">모델</label>
            <div className="space-y-2">
              {MODEL_OPTIONS.map(m => (
                <label
                  key={m.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition ${
                    draft.model === m.id
                      ? 'border-amber-600 bg-amber-50'
                      : 'border-stone-200 hover:border-stone-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="model"
                    checked={draft.model === m.id}
                    onChange={() => setDraft({...draft, model: m.id})}
                    className="mt-1 accent-amber-700"
                  />
                  <span>
                    <span className="block text-sm font-medium text-stone-800">{m.label}</span>
                    <span className="block text-xs text-stone-500">{m.description}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-stone-700">
              교단 / 신학 전통 <span className="font-normal text-stone-400">(선택)</span>
            </label>
            <input
              value={draft.tradition}
              onChange={e => setDraft({...draft, tradition: e.target.value})}
              placeholder="예: 대한예수교장로회(합동), 개혁주의"
              className="w-full rounded-lg border border-stone-300 bg-stone-50 px-3 py-2 text-sm text-stone-800 outline-none transition placeholder:text-stone-400 focus:border-amber-600 focus:bg-white"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-stone-700">
              기본 설교 상황 <span className="font-normal text-stone-400">(선택)</span>
            </label>
            <textarea
              value={draft.context}
              onChange={e => setDraft({...draft, context: e.target.value})}
              rows={3}
              placeholder="예: 성인 주일예배, 30분 설교, 개역개정 사용, 따뜻한 구어체 선호"
              className="w-full resize-none rounded-lg border border-stone-300 bg-stone-50 px-3 py-2 text-sm text-stone-800 outline-none transition placeholder:text-stone-400 focus:border-amber-600 focus:bg-white"
            />
          </div>

          <div className="border-t border-stone-200 pt-4">
            <button
              onClick={() => {
                if (confirm('저장된 API 키를 삭제하고 다시 입력하시겠습니까?')) onResetKey();
              }}
              className="cursor-pointer text-sm font-medium text-red-600 hover:text-red-700"
            >
              API 키 변경 / 삭제
            </button>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="cursor-pointer rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-600 transition hover:bg-stone-50"
          >
            취소
          </button>
          <button
            onClick={() => onSave(draft)}
            className="cursor-pointer rounded-lg bg-amber-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-800"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
}
