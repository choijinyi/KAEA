import type { GenrePreset } from './types';

/**
 * 유튜브에서 시청 수가 가장 많은 플레이리스트 장르 프리셋.
 * 로파이·앰비언트는 공부/집중/수면용 장시간 재생으로 유튜브 최상위 시청 장르이고,
 * 재즈·피아노는 카페/작업 BGM, 팝 차트 플레이리스트는 10억뷰 이상을 기록 중이다.
 */
export const GENRES: GenrePreset[] = [
  {
    id: 'lofi',
    emoji: '🌙',
    name: '로파이 (Lo-fi)',
    desc: '공부 · 집중 · 밤샘 작업',
    stat: '유튜브 BGM 플레이리스트 최다 시청 장르',
    gradient: ['#1a1033', '#5b3a8c', '#e8927c'],
    imageStyle:
      'lofi anime illustration style, cozy warm colors, soft grain, nostalgic mood',
    defaultScene:
      'a cozy room at night, a desk by the window with a warm lamp, rain outside the window, a sleeping cat, city lights in the distance',
  },
  {
    id: 'jazz',
    emoji: '🎷',
    name: '재즈 (Jazz)',
    desc: '카페 · 와인 · 무드',
    stat: '카페/라운지 BGM 스테디셀러 장르',
    gradient: ['#241a12', '#6b3f23', '#d9a05b'],
    imageStyle:
      'cinematic oil painting style, warm dim lighting, rich shadows, vintage atmosphere',
    defaultScene:
      'a dim jazz bar at night, a vinyl record player, a glass of whiskey on a wooden table, warm amber light, saxophone leaning on a chair',
  },
  {
    id: 'piano',
    emoji: '🎹',
    name: '피아노 · 뉴에이지',
    desc: '아침 · 독서 · 힐링',
    stat: '독서/힐링 플레이리스트 인기 장르',
    gradient: ['#dfe9f3', '#a3bffa', '#5f7fbf'],
    imageStyle:
      'soft watercolor painting style, pastel tones, gentle morning light, minimal and serene',
    defaultScene:
      'a grand piano near a large window with sheer curtains, soft morning sunlight, plants and books, peaceful atmosphere',
  },
  {
    id: 'ambient',
    emoji: '🌌',
    name: '앰비언트 · 수면',
    desc: '수면 · 명상 · ASMR',
    stat: '웰니스 트렌드로 시청 급성장 중',
    gradient: ['#050914', '#12305e', '#3b7ea1'],
    imageStyle:
      'dreamy digital art, deep blue and violet tones, ethereal glow, vast and calm',
    defaultScene:
      'a vast night sky full of stars over a calm ocean, aurora lights on the horizon, a small silhouette watching from the shore',
  },
  {
    id: 'citypop',
    emoji: '🌆',
    name: '시티팝 · 레트로',
    desc: '드라이브 · 야경 · 감성',
    stat: '드라이브/야간 감성 플레이리스트 인기',
    gradient: ['#1b0f3b', '#7a2e8d', '#ff7eb6'],
    imageStyle:
      '80s city pop retro anime style, neon colors, vaporwave palette, glossy highlights',
    defaultScene:
      'a night highway toward a neon city skyline, a retro convertible car, purple and pink sky, palm trees silhouettes',
  },
  {
    id: 'pop',
    emoji: '🔥',
    name: '팝 · 최신 차트',
    desc: '트렌드 · 파티 · 운동',
    stat: '차트 플레이리스트 누적 10억뷰 돌파',
    gradient: ['#12060f', '#c0266b', '#ffb45c'],
    imageStyle:
      'bold abstract art, vibrant gradients, dynamic shapes, energetic modern design',
    defaultScene:
      'abstract flowing waves of vivid color and light, sparkling particles, sense of rhythm and energy',
  },
];

export function getGenre(id: string): GenrePreset {
  return GENRES.find(g => g.id === id) ?? GENRES[0];
}
