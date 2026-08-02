import {NextResponse} from 'next/server';

export const runtime = 'nodejs';

/** 배포 상태 점검용 */
export async function GET() {
  return NextResponse.json({ok: true});
}
