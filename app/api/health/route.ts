import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

/** 배포 상태 점검: 키 값은 노출하지 않고 설정 여부만 반환한다 */
export async function GET() {
  return NextResponse.json({
    ok: true,
    geminiKeyConfigured: Boolean(process.env.GEMINI_API_KEY),
  });
}
