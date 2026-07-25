'use client';

import {useState} from 'react';
import {BookOpen, KeyRound, Loader2, ShieldCheck} from 'lucide-react';
import {describeError, validateApiKey} from '@/lib/sermon/client';
import {saveApiKey} from '@/lib/sermon/storage';

export default function ApiKeySetup({onReady}: {onReady: (key: string) => void}) {
  const [key, setKey] = useState('');
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    const trimmed = key.trim();
    if (!trimmed) {
      setError('API 키를 입력해 주세요.');
      return;
    }
    setChecking(true);
    setError('');
    try {
      await validateApiKey(trimmed);
      saveApiKey(trimmed);
      onReady(trimmed);
    } catch (e) {
      setError(describeError(e) || 'API 키 확인에 실패했습니다.');
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-gradient-to-b from-amber-50 to-stone-100 px-4">
      <div className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-700 text-amber-50 shadow-lg shadow-amber-700/20">
            <BookOpen className="h-7 w-7" />
          </div>
          <h1 className="font-serif text-3xl font-bold text-stone-800">설교준비 도우미</h1>
          <p className="mt-2 text-stone-500">
            성경 본문 연구부터 설교 아웃라인까지, 책임감 있는 설교 준비를 돕습니다.
          </p>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2 text-stone-700">
            <KeyRound className="h-5 w-5 text-amber-700" />
            <h2 className="font-semibold">Anthropic API 키 등록</h2>
          </div>
          <p className="mb-4 text-sm leading-relaxed text-stone-500">
            이 앱은 본인의 Anthropic API 키로 작동합니다. 키가 없다면{' '}
            <a
              href="https://console.anthropic.com/settings/keys"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-amber-700 underline underline-offset-2 hover:text-amber-800"
            >
              console.anthropic.com
            </a>
            에서 발급받을 수 있습니다.
          </p>
          <input
            type="password"
            value={key}
            onChange={e => setKey(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') submit();
            }}
            placeholder="sk-ant-..."
            autoFocus
            className="w-full rounded-lg border border-stone-300 bg-stone-50 px-3 py-2.5 font-mono text-sm text-stone-800 outline-none transition placeholder:text-stone-400 focus:border-amber-600 focus:bg-white"
          />
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          <button
            onClick={submit}
            disabled={checking}
            className="mt-4 flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-amber-700 px-4 py-2.5 font-medium text-white transition hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {checking && <Loader2 className="h-4 w-4 animate-spin" />}
            {checking ? '키 확인 중...' : '시작하기'}
          </button>
          <div className="mt-4 flex items-start gap-2 rounded-lg bg-stone-50 p-3 text-xs leading-relaxed text-stone-500">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            <span>
              입력한 키는 이 브라우저에만 저장되며, Anthropic API 호출에만 사용됩니다. 별도의 서버로
              전송되거나 수집되지 않습니다.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
