import type {Metadata} from 'next';
import ClassicBingoPlay from '@/components/ClassicBingoPlay';

export const metadata: Metadata = {
  title: '클래식 이름 빙고 — 참가자',
  description: '게임 코드를 입력하고 나만의 5×5 빙고판으로 참여하세요.',
};

export default async function ClassicPlayPage({
  searchParams,
}: {
  searchParams: Promise<{code?: string}>;
}) {
  const {code} = await searchParams;
  return <ClassicBingoPlay initialCode={code} />;
}
