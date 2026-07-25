'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function Markdown({content}: {content: string}) {
  return (
    <div className="prose prose-stone max-w-none prose-headings:font-semibold prose-headings:text-stone-800 prose-p:leading-relaxed prose-li:my-0.5 prose-pre:bg-stone-100 prose-pre:text-stone-800 prose-code:before:content-none prose-code:after:content-none prose-table:text-sm">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}
