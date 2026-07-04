import {createClient} from '@supabase/supabase-js';

// Supabase publishable key는 클라이언트 공개용 키입니다 (RLS로 보호).
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://mvfzprnxvexzilaxyuld.supabase.co';
const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  'sb_publishable_Abk6zOpx22wZp0rgAabqJg_I6Vt4-D0';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/** 참가자가 적는 이름 수 */
export const TOTAL_NAMES = 25;
/** 정답 점수 구간과 구간별 정답 수: 100/200/300/500점 x 3개 = 총 12개 */
export const TIERS = [100, 200, 300, 500] as const;
export const ANSWERS_PER_TIER = 3;
export const TOTAL_ANSWERS = TIERS.length * ANSWERS_PER_TIER;

export interface Answer {
  name: string;
  points: number;
}

export interface BingoGame {
  code: string;
  title: string;
  mode: 'quiz' | 'classic';
  answers: Answer[];
  created_at: string;
  updated_at: string;
}

export interface BingoPlayer {
  id: string;
  game_code: string;
  nickname: string;
  names: string[];
  created_at: string;
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

/** 이름 비교용 정규화: 공백 제거 + 소문자화 */
export function normalizeName(name: string): string {
  return name.replace(/\s+/g, '').toLowerCase();
}

/** 줄바꿈·쉼표로 구분된 입력에서 이름 목록 추출 (공백 제거, 정규화 기준 중복 제거) */
export function parseNames(raw: string): string[] {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const part of raw.split(/[\n,]+/)) {
    const name = part.trim();
    const key = normalizeName(name);
    if (name && !seen.has(key)) {
      seen.add(key);
      names.push(name);
    }
  }
  return names;
}

/** 참가자 이름 목록과 공개된 정답으로 (맞춘 정답, 총점) 계산 */
export function scorePlayer(names: string[], answers: Answer[]) {
  const mine = new Set(names.map(normalizeName));
  const matched = answers.filter(a => mine.has(normalizeName(a.name)));
  return {
    matched,
    score: matched.reduce((sum, a) => sum + a.points, 0),
  };
}

/** 이름이 공개된 정답과 일치하면 해당 정답 반환 */
export function matchAnswer(name: string, answers: Answer[]): Answer | undefined {
  const key = normalizeName(name);
  return answers.find(a => normalizeName(a.name) === key);
}

export async function fetchGame(code: string): Promise<BingoGame | null> {
  const {data, error} = await supabase
    .from('bingo_games')
    .select('code, title, mode, answers, created_at, updated_at')
    .eq('code', code.toUpperCase())
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as BingoGame | null) ?? null;
}

export async function createGame(title: string): Promise<BingoGame> {
  // 코드 충돌 시 몇 번 재시도
  let lastError = '';
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateGameCode();
    const {data, error} = await supabase
      .from('bingo_games')
      .insert({code, title, mode: 'quiz', names: [], called: [], answers: []})
      .select('code, title, mode, answers, created_at, updated_at')
      .single();
    if (!error) return data as BingoGame;
    lastError = error.message;
    if (error.code !== '23505') break; // 중복 키가 아니면 재시도 의미 없음
  }
  throw new Error(`게임 생성에 실패했습니다: ${lastError}`);
}

export async function updateAnswers(code: string, answers: Answer[]): Promise<void> {
  const {error} = await supabase
    .from('bingo_games')
    .update({answers, updated_at: new Date().toISOString()})
    .eq('code', code);
  if (error) throw new Error(error.message);
}

export async function joinGame(
  code: string,
  nickname: string,
  names: string[],
): Promise<BingoPlayer> {
  const {data, error} = await supabase
    .from('bingo_players')
    .insert({game_code: code, nickname, names})
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as BingoPlayer;
}

export async function fetchPlayers(code: string): Promise<BingoPlayer[]> {
  const {data, error} = await supabase
    .from('bingo_players')
    .select('*')
    .eq('game_code', code)
    .order('created_at');
  if (error) throw new Error(error.message);
  return (data as BingoPlayer[]) ?? [];
}

/** 게임 변경(진행자가 정답을 적음)을 실시간 구독. 해제 함수 반환 */
export function subscribeToGame(
  code: string,
  onChange: (game: BingoGame) => void,
): () => void {
  const channel = supabase
    .channel(`bingo-game:${code}`)
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

/** 참가자 입장/변경을 실시간 구독 (진행자 순위표용). 해제 함수 반환 */
export function subscribeToPlayers(
  code: string,
  onChange: (players: BingoPlayer[]) => void,
): () => void {
  const refetch = async () => {
    try {
      onChange(await fetchPlayers(code));
    } catch {
      // 일시적 네트워크 오류는 다음 이벤트/폴링에서 복구
    }
  };

  const channel = supabase
    .channel(`bingo-players:${code}`)
    .on(
      'postgres_changes',
      {event: '*', schema: 'public', table: 'bingo_players', filter: `game_code=eq.${code}`},
      refetch,
    )
    .subscribe();

  const poll = setInterval(refetch, 7000);
  refetch();

  return () => {
    clearInterval(poll);
    supabase.removeChannel(channel);
  };
}
