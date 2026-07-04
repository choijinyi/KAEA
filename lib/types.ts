export interface SubtitleLine {
  start: number; // seconds
  end: number; // seconds
  text: string;
}

export interface TranscribeResult {
  lines: SubtitleLine[];
  mood: string;
  scenePromptEn: string;
}

export interface GenrePreset {
  id: string;
  emoji: string;
  name: string;
  desc: string;
  stat: string;
  gradient: [string, string, string];
  imageStyle: string;
  defaultScene: string;
}

/** 자막 라인 정렬: 시작시간 순 정렬 후 end를 다음 라인 start에 맞춘다 */
export function normalizeLines(lines: SubtitleLine[], duration: number): SubtitleLine[] {
  const sorted = [...lines]
    .filter(l => l.text.trim().length > 0)
    .sort((a, b) => a.start - b.start);
  return sorted.map((l, i) => {
    const nextStart = i < sorted.length - 1 ? sorted[i + 1].start : duration;
    const end = Math.min(Math.max(l.end, l.start + 0.5), nextStart);
    return { ...l, start: Math.max(0, l.start), end: end > l.start ? end : nextStart };
  });
}

/** 가사 텍스트를 줄 단위로 나눠 곡 길이에 균등 배치 */
export function distributeLyrics(text: string, duration: number): SubtitleLine[] {
  const rows = text
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean);
  if (rows.length === 0) return [];
  // 인트로/아웃트로 여유를 둔다
  const intro = Math.min(8, duration * 0.06);
  const outro = Math.min(6, duration * 0.04);
  const usable = Math.max(duration - intro - outro, duration * 0.5);
  const per = usable / rows.length;
  return rows.map((text, i) => ({
    start: +(intro + i * per).toFixed(1),
    end: +(intro + (i + 1) * per).toFixed(1),
    text,
  }));
}

export function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}
