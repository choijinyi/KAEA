/** 성경 66권 메타데이터: 대한성서공회(개역개정, GAE) 책 코드와 장 수, 이름/약칭 */

export interface BibleBook {
  /** bskorea.or.kr 책 코드 */
  code: string;
  /** 정식 이름 */
  name: string;
  /** 입력 매칭용 별칭(약칭 포함) */
  aliases: string[];
  /** 총 장 수 */
  chapters: number;
}

export const BOOKS: BibleBook[] = [
  {code: 'gen', name: '창세기', aliases: ['창세기', '창'], chapters: 50},
  {code: 'exo', name: '출애굽기', aliases: ['출애굽기', '출'], chapters: 40},
  {code: 'lev', name: '레위기', aliases: ['레위기', '레'], chapters: 27},
  {code: 'num', name: '민수기', aliases: ['민수기', '민'], chapters: 36},
  {code: 'deu', name: '신명기', aliases: ['신명기', '신'], chapters: 34},
  {code: 'jos', name: '여호수아', aliases: ['여호수아', '수'], chapters: 24},
  {code: 'jdg', name: '사사기', aliases: ['사사기', '삿'], chapters: 21},
  {code: 'rut', name: '룻기', aliases: ['룻기', '룻'], chapters: 4},
  {code: '1sa', name: '사무엘상', aliases: ['사무엘상', '삼상'], chapters: 31},
  {code: '2sa', name: '사무엘하', aliases: ['사무엘하', '삼하'], chapters: 24},
  {code: '1ki', name: '열왕기상', aliases: ['열왕기상', '왕상'], chapters: 22},
  {code: '2ki', name: '열왕기하', aliases: ['열왕기하', '왕하'], chapters: 25},
  {code: '1ch', name: '역대상', aliases: ['역대상', '역대기상', '대상'], chapters: 29},
  {code: '2ch', name: '역대하', aliases: ['역대하', '역대기하', '대하'], chapters: 36},
  {code: 'ezr', name: '에스라', aliases: ['에스라', '스'], chapters: 10},
  {code: 'neh', name: '느헤미야', aliases: ['느헤미야', '느'], chapters: 13},
  {code: 'est', name: '에스더', aliases: ['에스더', '에'], chapters: 10},
  {code: 'job', name: '욥기', aliases: ['욥기', '욥'], chapters: 42},
  {code: 'psa', name: '시편', aliases: ['시편', '시'], chapters: 150},
  {code: 'pro', name: '잠언', aliases: ['잠언', '잠'], chapters: 31},
  {code: 'ecc', name: '전도서', aliases: ['전도서', '전'], chapters: 12},
  {code: 'sng', name: '아가', aliases: ['아가', '아'], chapters: 8},
  {code: 'isa', name: '이사야', aliases: ['이사야', '사'], chapters: 66},
  {code: 'jer', name: '예레미야', aliases: ['예레미야', '렘'], chapters: 52},
  {code: 'lam', name: '예레미야애가', aliases: ['예레미야애가', '애가', '애'], chapters: 5},
  {code: 'ezk', name: '에스겔', aliases: ['에스겔', '겔'], chapters: 48},
  {code: 'dan', name: '다니엘', aliases: ['다니엘', '단'], chapters: 12},
  {code: 'hos', name: '호세아', aliases: ['호세아', '호'], chapters: 14},
  {code: 'jol', name: '요엘', aliases: ['요엘', '욜'], chapters: 3},
  {code: 'amo', name: '아모스', aliases: ['아모스', '암'], chapters: 9},
  {code: 'oba', name: '오바댜', aliases: ['오바댜', '옵'], chapters: 1},
  {code: 'jnh', name: '요나', aliases: ['요나', '욘'], chapters: 4},
  {code: 'mic', name: '미가', aliases: ['미가', '미'], chapters: 7},
  {code: 'nam', name: '나훔', aliases: ['나훔', '나'], chapters: 3},
  {code: 'hab', name: '하박국', aliases: ['하박국', '합'], chapters: 3},
  {code: 'zep', name: '스바냐', aliases: ['스바냐', '습'], chapters: 3},
  {code: 'hag', name: '학개', aliases: ['학개', '학'], chapters: 2},
  {code: 'zec', name: '스가랴', aliases: ['스가랴', '슥'], chapters: 14},
  {code: 'mal', name: '말라기', aliases: ['말라기', '말'], chapters: 4},
  {code: 'mat', name: '마태복음', aliases: ['마태복음', '마태', '마'], chapters: 28},
  {code: 'mrk', name: '마가복음', aliases: ['마가복음', '마가', '막'], chapters: 16},
  {code: 'luk', name: '누가복음', aliases: ['누가복음', '누가', '눅'], chapters: 24},
  {code: 'jhn', name: '요한복음', aliases: ['요한복음', '요'], chapters: 21},
  {code: 'act', name: '사도행전', aliases: ['사도행전', '행'], chapters: 28},
  {code: 'rom', name: '로마서', aliases: ['로마서', '롬'], chapters: 16},
  {code: '1co', name: '고린도전서', aliases: ['고린도전서', '고전'], chapters: 16},
  {code: '2co', name: '고린도후서', aliases: ['고린도후서', '고후'], chapters: 13},
  {code: 'gal', name: '갈라디아서', aliases: ['갈라디아서', '갈'], chapters: 6},
  {code: 'eph', name: '에베소서', aliases: ['에베소서', '엡'], chapters: 6},
  {code: 'php', name: '빌립보서', aliases: ['빌립보서', '빌'], chapters: 4},
  {code: 'col', name: '골로새서', aliases: ['골로새서', '골'], chapters: 4},
  {code: '1th', name: '데살로니가전서', aliases: ['데살로니가전서', '살전'], chapters: 5},
  {code: '2th', name: '데살로니가후서', aliases: ['데살로니가후서', '살후'], chapters: 3},
  {code: '1ti', name: '디모데전서', aliases: ['디모데전서', '딤전'], chapters: 6},
  {code: '2ti', name: '디모데후서', aliases: ['디모데후서', '딤후'], chapters: 4},
  {code: 'tit', name: '디도서', aliases: ['디도서', '딛'], chapters: 3},
  {code: 'phm', name: '빌레몬서', aliases: ['빌레몬서', '몬'], chapters: 1},
  {code: 'heb', name: '히브리서', aliases: ['히브리서', '히'], chapters: 13},
  {code: 'jas', name: '야고보서', aliases: ['야고보서', '약'], chapters: 5},
  {code: '1pe', name: '베드로전서', aliases: ['베드로전서', '벧전'], chapters: 5},
  {code: '2pe', name: '베드로후서', aliases: ['베드로후서', '벧후'], chapters: 3},
  {code: '1jn', name: '요한일서', aliases: ['요한일서', '요일'], chapters: 5},
  {code: '2jn', name: '요한이서', aliases: ['요한이서', '요이'], chapters: 1},
  {code: '3jn', name: '요한삼서', aliases: ['요한삼서', '요삼'], chapters: 1},
  {code: 'jud', name: '유다서', aliases: ['유다서', '유'], chapters: 1},
  {code: 'rev', name: '요한계시록', aliases: ['요한계시록', '계시록', '계'], chapters: 22},
];

export interface ParsedReference {
  book: BibleBook;
  chapter: number;
}

/**
 * "마태복음 1장", "창 3", "요한복음1장" 같은 입력을 책+장으로 해석한다.
 * 별칭은 긴 것부터 매칭해 "요한일서"가 "요"로 잘못 잡히지 않게 한다.
 */
export function parseReference(input: string): ParsedReference | null {
  const text = input.trim().replace(/\s+/g, ' ');
  if (!text) return null;

  const m = text.match(/^(.+?)\s*(\d+)\s*장?(?:\s*\d+\s*절?.*)?$/);
  if (!m) return null;

  const bookText = m[1].trim();
  const chapter = parseInt(m[2], 10);

  const candidates: Array<{book: BibleBook; alias: string}> = [];
  for (const book of BOOKS) {
    for (const alias of book.aliases) {
      candidates.push({book, alias});
    }
  }
  candidates.sort((a, b) => b.alias.length - a.alias.length);

  const found = candidates.find(
    (c) => bookText === c.alias || bookText.startsWith(c.alias),
  );
  if (!found) return null;
  if (chapter < 1 || chapter > found.book.chapters) return null;

  return {book: found.book, chapter};
}
