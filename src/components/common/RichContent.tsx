import React from 'react';
import { isSafeUrl } from '../../lib/sanitize';

interface RichContentProps {
  content: string;
  variant?: 'article' | 'poetry' | 'essay';
}

function renderInlineSegments(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const tokenRegex = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let idx = 0;

  while ((match = tokenRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      parts.push(
        <strong key={`b-${idx++}`} className="font-semibold text-[#11151E] dark:text-white">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('[')) {
      const linkMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (linkMatch && isSafeUrl(linkMatch[2])) {
        parts.push(
          <a
            key={`a-${idx++}`}
            href={linkMatch[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-[#B68D40] underline-offset-4 text-[#0B1528] dark:text-[#E5C67E] hover:opacity-80"
          >
            {linkMatch[1]}
          </a>
        );
      } else {
        parts.push(token);
      }
    }
    lastIndex = tokenRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts;
}

export function RichContent({ content, variant = 'article' }: RichContentProps) {
  if (variant === 'poetry') {
    const stanzas = content.trim().split(/\n{2,}/);
    return (
      <div className="space-y-8 font-serif text-lg sm:text-xl leading-relaxed text-[#1E222B] dark:text-slate-200">
        {stanzas.map((stanza, i) => (
          <p key={i} className="whitespace-pre-line">
            {stanza}
          </p>
        ))}
      </div>
    );
  }

  const blocks = content.trim().split(/\n{2,}/);
  let firstParagraphRendered = false;

  return (
    <div className="space-y-6 text-[17px] leading-[1.8] text-[#242833] dark:text-slate-200">
      {blocks.map((rawBlock, index) => {
        const block = rawBlock.trim();
        if (!block) return null;

        if (block.startsWith('### ')) {
          return (
            <h3
              key={index}
              className="font-serif text-xl sm:text-2xl font-semibold text-[#0B1528] dark:text-[#F1EFEA] pt-4"
            >
              {block.slice(4)}
            </h3>
          );
        }

        if (block.startsWith('## ')) {
          return (
            <h2
              key={index}
              className="font-serif text-2xl sm:text-3xl font-semibold text-[#0B1528] dark:text-[#F1EFEA] pt-5 pb-1 border-b border-[#E5E0D5] dark:border-slate-800"
            >
              {block.slice(3)}
            </h2>
          );
        }

        if (block.startsWith('> ')) {
          const quoteText = block
            .split('\n')
            .map((line) => line.replace(/^>\s?/, ''))
            .join(' ');
          return (
            <blockquote
              key={index}
              className="my-8 py-6 border-y border-[#D8D3C8] dark:border-slate-700 font-serif italic text-xl sm:text-2xl leading-relaxed text-[#0B1528] dark:text-[#E7DFCE] text-center px-4"
            >
              {renderInlineSegments(quoteText)}
            </blockquote>
          );
        }

        const imgMatch = block.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
        if (imgMatch && isSafeUrl(imgMatch[2])) {
          return (
            <figure key={index} className="my-8">
              <img
                src={imgMatch[2]}
                alt={imgMatch[1] || 'Editorial illustration'}
                referrerPolicy="no-referrer"
                className="w-full max-h-[460px] object-cover border border-[#E5E0D5] dark:border-slate-800"
              />
              {imgMatch[1] && (
                <figcaption className="mt-2.5 text-xs font-serif italic text-[#5C626F] dark:text-slate-400">
                  {imgMatch[1]}
                </figcaption>
              )}
            </figure>
          );
        }

        const lines = block.split('\n');
        if (lines.every((l) => l.trim().startsWith('- '))) {
          return (
            <ul key={index} className="space-y-2.5 pl-5 list-disc marker:text-[#B68D40]">
              {lines.map((line, li) => (
                <li key={li} className="pl-1">
                  {renderInlineSegments(line.trim().slice(2))}
                </li>
              ))}
            </ul>
          );
        }

        const applyDropCap = variant === 'essay' && !firstParagraphRendered;
        firstParagraphRendered = true;

        return (
          <p
            key={index}
            className={
              applyDropCap
                ? 'first-letter:text-5xl first-letter:font-serif first-letter:font-bold first-letter:float-left first-letter:mr-3 first-letter:mt-1 first-letter:leading-none first-letter:text-[#0B1528] dark:first-letter:text-[#C9A458]'
                : ''
            }
          >
            {renderInlineSegments(block)}
          </p>
        );
      })}
    </div>
  );
}
