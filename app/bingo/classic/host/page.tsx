import type {Metadata} from 'next';
import ClassicBingoHost from '@/components/ClassicBingoHost';

export const metadata: Metadata = {
  title: '클래식 이름 빙고 — 진행자',
  description: '이름 25개를 등록하고 5×5 빙고 게임을 진행하세요.',
};

export default async function ClassicHostPage({
  searchParams,
}: {
  searchParams: Promise<{code?: string}>;
}) {
  const {code} = await searchParams;
  return <ClassicBingoHost resumeCode={code} />;
}
