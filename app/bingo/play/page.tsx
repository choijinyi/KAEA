import type {Metadata} from 'next';
import BingoPlay from '@/components/BingoPlay';

export const metadata: Metadata = {
  title: '이름 빙고 — 참가자',
  description: '게임 코드를 입력하고 나만의 빙고판으로 참여하세요.',
};

export default async function PlayPage({
  searchParams,
}: {
  searchParams: Promise<{code?: string}>;
}) {
  const {code} = await searchParams;
  return <BingoPlay initialCode={code} />;
}
