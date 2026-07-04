import {createClient} from '@supabase/supabase-js';

// Supabase publishable key는 클라이언트 공개용 키입니다 (RLS로 보호).
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://mvfzprnxvexzilaxyuld.supabase.co';
const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  'sb_publishable_Abk6zOpx22wZp0rgAabqJg_I6Vt4-D0';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export const BOARD_SIZE = 5;
export const TOTAL_NAMES = BOARD_SIZE * BOARD_SIZE;

export interface BingoGame {
  code: string;
  title: string;
  names: string[];
  called: string[];
  created_at: string;
  updated_at: string;
}

/** 헷갈리는 글자(0/O, 1/I)를 뺀 6자리 게임 코드 생성 */
export function generateGameCode(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/** 줄바꿈·쉼표로 구분된 입력에서 이름 목록 추출 (공백 제거, 중복 제거) */
export function parseNames(raw: string): string[] {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const part of raw.split(/[\n,]+/)) {
    const name = part.trim();
    if (name && !seen.has(name)) {
      seen.add(name);
      names.push(name);
    }
  }
  return names;
}

export function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** 가능한 빙고 줄(가로 5, 세로 5, 대각선 2)의 칸 인덱스 목록 */
export const BINGO_LINES: number[][] = (() => {
  const lines: number[][] = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    lines.push(Array.from({length: BOARD_SIZE}, (_, c) => r * BOARD_SIZE + c));
  }
  for (let c = 0; c < BOARD_SIZE; c++) {
    lines.push(Array.from({length: BOARD_SIZE}, (_, r) => r * BOARD_SIZE + c));
  }
  lines.push(Array.from({length: BOARD_SIZE}, (_, i) => i * BOARD_SIZE + i));
  lines.push(Array.from({length: BOARD_SIZE}, (_, i) => i * BOARD_SIZE + (BOARD_SIZE - 1 - i)));
  return lines;
})();

/** 완성된 빙고 줄들을 반환 */
export function completedLines(board: string[], called: Set<string>): number[][] {
  return BINGO_LINES.filter(line => line.every(i => called.has(board[i])));
}

export async function fetchGame(code: string): Promise<BingoGame | null> {
  const {data, error} = await supabase
    .from('bingo_games')
    .select('*')
    .eq('code', code.toUpperCase())
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as BingoGame | null) ?? null;
}

export async function createGame(title: string, names: string[]): Promise<BingoGame> {
  // 코드 충돌 시 몇 번 재시도
  let lastError = '';
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateGameCode();
    const {data, error} = await supabase
      .from('bingo_games')
      .insert({code, title, names, called: []})
      .select()
      .single();
    if (!error) return data as BingoGame;
    lastError = error.message;
    if (error.code !== '23505') break; // 중복 키가 아니면 재시도 의미 없음
  }
  throw new Error(`게임 생성에 실패했습니다: ${lastError}`);
}

export async function updateCalled(code: string, called: string[]): Promise<void> {
  const {error} = await supabase
    .from('bingo_games')
    .update({called, updated_at: new Date().toISOString()})
    .eq('code', code);
  if (error) throw new Error(error.message);
}

/** 게임 변경(진행자가 이름을 지움)을 실시간 구독. 해제 함수 반환 */
export function subscribeToGame(
  code: string,
  onChange: (game: BingoGame) => void,
): () => void {
  const channel = supabase
    .channel(`bingo:${code}`)
    .on(
      'postgres_changes',
      {event: 'UPDATE', schema: 'public', table: 'bingo_games', filter: `code=eq.${code}`},
      payload => onChange(payload.new as BingoGame),
    )
    .subscribe();

  // 실시간 연결이 끊겨도 따라오도록 폴링 백업
  const poll = setInterval(async () => {
    try {
      const game = await fetchGame(code);
      if (game) onChange(game);
    } catch {
      // 일시적 네트워크 오류는 다음 폴링에서 복구
    }
  }, 5000);

  return () => {
    clearInterval(poll);
    supabase.removeChannel(channel);
  };
}
