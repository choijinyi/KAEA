import {NextRequest, NextResponse} from 'next/server';
import {BOOKS} from '@/lib/books';

export const runtime = 'nodejs';

const SOURCE = 'https://www.bskorea.or.kr/bible/korbibReadpage.php';

interface Verse {
  verse: number;
  text: string;
}

/** HTML 엔티티와 태그를 걷어내고 순수 텍스트만 남긴다 */
function stripHtml(html: string): string {
  return html
    .replace(/<a class=comment[\s\S]*?<\/a>/gi, '') // ㄱ) ㄴ) 각주 링크
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/** 대한성서공회 개역개정 페이지에서 절 목록을 추출한다 */
function parseVerses(html: string): Verse[] {
  const verses: Verse[] = [];
  // 각 절: <span class="number">N&nbsp;...</span> 뒤로 다음 절 번호 전까지가 본문
  const parts = html.split(/<span class="number">/).slice(1);
  for (const part of parts) {
    const numMatch = part.match(/^(\d+)/);
    if (!numMatch) continue;
    const verse = parseInt(numMatch[1], 10);
    // 절 본문은 소제목(smallTitle)이나 다음 구조가 나오기 전까지
    const body = part
      .slice(numMatch[0].length)
      .split(/<font class="smallTitle">/)[0]
      .split(/<div/)[0];
    const text = stripHtml(body);
    if (text) verses.push({verse, text});
  }
  return verses;
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('book') ?? '';
  const chapter = parseInt(req.nextUrl.searchParams.get('chapter') ?? '', 10);

  const book = BOOKS.find((b) => b.code === code);
  if (!book || !Number.isFinite(chapter) || chapter < 1 || chapter > book.chapters) {
    return NextResponse.json({error: '올바르지 않은 책 또는 장입니다.'}, {status: 400});
  }

  try {
    const url = `${SOURCE}?version=GAE&book=${book.code}&chap=${chapter}&sec=`;

    // 출처 사이트가 간헐적으로 503을 돌려주므로 짧게 재시도한다
    let html = '';
    let lastStatus = 0;
    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt > 0) await new Promise((r) => setTimeout(r, 600 * attempt));
      const res = await fetch(url, {
        headers: {
          // 브라우저가 아닌 UA는 차단되므로 일반 브라우저 UA를 사용한다
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
          'Accept-Language': 'ko,ko-KR;q=0.9',
        },
        // 성경 본문은 변하지 않으므로 하루 동안 캐시한다
        next: {revalidate: 86400},
      });
      lastStatus = res.status;
      if (res.ok) {
        html = await res.text();
        break;
      }
    }
    if (!html) throw new Error(`source responded ${lastStatus}`);

    const verses = parseVerses(html);
    if (verses.length === 0) throw new Error('no verses parsed');

    return NextResponse.json({
      version: '개역개정',
      book: book.name,
      chapter,
      totalChapters: book.chapters,
      verses,
    });
  } catch (e) {
    console.error('bible fetch failed:', e);
    return NextResponse.json(
      {error: '성경 본문을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'},
      {status: 502},
    );
  }
}
