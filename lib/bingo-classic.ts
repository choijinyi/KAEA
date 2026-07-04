import {generateGameCode, supabase} from '@/lib/bingo';

export const BOARD_SIZE = 5;
export const TOTAL_NAMES = BOARD_SIZE * BOARD_SIZE;

export interface ClassicGame {
  code: string;
  title: string;
  mode: 'quiz' | 'classic';
  names: string[];
  called: string[];
  created_at: string;
  updated_at: string;
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

export async function fetchClassicGame(code: string): Promise<ClassicGame | null> {
  const {data, error} = await supabase
    .from('bingo_games')
    .select('code, title, mode, names, called, created_at, updated_at')
    .eq('code', code.toUpperCase())
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as ClassicGame | null) ?? null;
}

export async function createClassicGame(title: string, names: string[]): Promise<ClassicGame> {
  // 코드 충돌 시 몇 번 재시도
  let lastError = '';
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateGameCode();
    const {data, error} = await supabase
      .from('bingo_games')
      .insert({code, title, mode: 'classic', names, called: [], answers: []})
      .select('code, title, mode, names, called, created_at, updated_at')
      .single();
    if (!error) return data as ClassicGame;
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
export function subscribeToClassicGame(
  code: string,
  onChange: (game: ClassicGame) => void,
): () => void {
  const channel = supabase
    .channel(`bingo-classic:${code}`)
    .on(
      'postgres_changes',
      {event: 'UPDATE', schema: 'public', table: 'bingo_games', filter: `code=eq.${code}`},
      payload => onChange(payload.new as ClassicGame),
    )
    .subscribe();

  // 실시간 연결이 끊겨도 따라오도록 폴링 백업
  const poll = setInterval(async () => {
    try {
      const game = await fetchClassicGame(code);
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
