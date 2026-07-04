import type {Metadata} from 'next';
import BingoHost from '@/components/BingoHost';

export const metadata: Metadata = {
  title: '이름 빙고 — 진행자',
  description: '이름 25개를 등록하고 빙고 게임을 진행하세요.',
};

export default async function HostPage({
  searchParams,
}: {
  searchParams: Promise<{code?: string}>;
}) {
  const {code} = await searchParams;
  return <BingoHost resumeCode={code} />;
}
