import type {Metadata} from 'next';
import { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: '설교준비 도우미 — 성경 연구와 설교 준비를 돕는 AI',
  description:
    '개혁주의·복음주의 관점에서 성경 본문 연구, 해석 검증, 설교 아웃라인과 원고 초안 작성을 단계별로 돕는 설교 준비 도우미입니다.',
};

export default function RootLayout({children}: {children: ReactNode}) {
  return (
    <html lang="ko">
      <body className="bg-zinc-950 font-sans text-zinc-100 antialiased">
        {children}
      </body>
    </html>
  );
}
