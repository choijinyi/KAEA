import type {Metadata} from 'next';
import { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'Playlist Studio — 노래를 유튜브 플레이리스트 영상으로',
  description:
    '음악을 업로드하면 AI가 가사를 추출해 자막을 만들고, 곡에 어울리는 배경 그림을 그려 유튜브 플레이리스트 영상을 완성합니다.',
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
