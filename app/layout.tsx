import type {Metadata} from 'next';
import {Noto_Sans_KR, Noto_Serif_KR} from 'next/font/google';
import {ReactNode} from 'react';
import './globals.css';

const notoSans = Noto_Sans_KR({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-noto-sans',
});

const notoSerif = Noto_Serif_KR({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-noto-serif',
});

export const metadata: Metadata = {
  title: '말씀 낭독 — 성경 읽어주는 앱',
  description:
    '"마태복음 1장"처럼 입력하면 개역개정 성경 본문을 찾아 보여주고, 구글 제미나이의 자연스러운 목소리로 읽어 드립니다.',
};

export default function RootLayout({children}: {children: ReactNode}) {
  return (
    <html lang="ko" className={`${notoSans.variable} ${notoSerif.variable}`}>
      <body className="bg-amber-50/40 font-sans text-stone-800 antialiased">
        {children}
      </body>
    </html>
  );
}
