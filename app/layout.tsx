import type {Metadata} from 'next';
import { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI 활용 학위논문 1일 완성 부트캠프',
  description: '단 12시간, AI와 함께 당신의 연구에 마침표를 찍으십시오.',
};

export default function RootLayout({children}: {children: ReactNode}) {
  return (
    <html lang="ko">
      <body className="font-sans antialiased bg-slate-50 min-h-screen flex items-center justify-center p-4 sm:p-10">
        {children}
      </body>
    </html>
  );
}
