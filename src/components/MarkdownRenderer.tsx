import React from 'react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * Parses inline formatting: **bold**, *italic*, `code`, and [links](url)
 */
function renderInlineText(text: string): React.ReactNode[] {
  // Regex pattern matching bold, code, italic, and links
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g;
  const parts = text.split(pattern);

  return parts.map((part, index) => {
    if (!part) return null;

    // Bold: **text**
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      return (
        <strong key={index} className="font-bold text-white">
          {renderInlineText(part.slice(2, -2))}
        </strong>
      );
    }

    // Inline Code: `code`
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      return (
        <code
          key={index}
          className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[11px] text-indigo-300 border border-slate-700/60"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    // Italic: *text*
    if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
      return (
        <em key={index} className="italic text-slate-200">
          {renderInlineText(part.slice(1, -1))}
        </em>
      );
    }

    // Link: [text](url)
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      return (
        <a
          key={index}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-indigo-400 underline hover:text-indigo-300"
        >
          {linkMatch[1]}
        </a>
      );
    }

    return part;
  });
}

/**
 * Study OS Markdown Renderer
 * Beautifully renders AI explanations, markdown tables, lists, quotes, and code blocks
 */
export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
  if (!content) return null;

  // 1. Normalize smashed table row separators (e.g., '|| |' or '||')
  let normalized = content
    .replace(/\|\s*\|\s*\|?/g, '|\n|')
    .replace(/\r\n/g, '\n');

  // 2. Break content into logical blocks (code blocks, tables, lists, headers, paragraphs)
  const lines = normalized.split('\n');
  const blocks: React.ReactNode[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip empty lines
    if (!trimmed) {
      i++;
      continue;
    }

    // Code block ```
    if (trimmed.startsWith('```')) {
      const lang = trimmed.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++; // skip closing ```
      blocks.push(
        <div key={`code-${blocks.length}`} className="my-3 rounded-xl border border-slate-800 bg-slate-950 p-3 shadow-md">
          {lang && (
            <div className="mb-1 text-[10px] font-mono font-bold uppercase text-slate-500">
              {lang}
            </div>
          )}
          <pre className="overflow-x-auto font-mono text-xs text-indigo-200 leading-relaxed">
            <code>{codeLines.join('\n')}</code>
          </pre>
        </div>
      );
      continue;
    }

    // Markdown Table: starts with '|' and contains '|'
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
        tableLines.push(lines[i].trim());
        i++;
      }

      if (tableLines.length >= 2) {
        const headerCells = tableLines[0]
          .split('|')
          .slice(1, -1)
          .map((c) => c.trim());

        // Skip separator row (e.g. |---|---|)
        const rowStartIndex = tableLines[1].includes('---') ? 2 : 1;
        const bodyRows = tableLines.slice(rowStartIndex).map((r) =>
          r
            .split('|')
            .slice(1, -1)
            .map((c) => c.trim())
        );

        blocks.push(
          <div key={`table-${blocks.length}`} className="my-4 overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60 shadow-lg">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/90 text-slate-200 font-semibold">
                  {headerCells.map((h, hIdx) => (
                    <th key={hIdx} className="px-3.5 py-2.5 font-bold text-white">
                      {renderInlineText(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {bodyRows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-slate-900/30 transition-colors">
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="px-3.5 py-2.5 text-slate-300 leading-relaxed">
                        {renderInlineText(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        continue;
      }
    }

    // Headings
    if (trimmed.startsWith('#### ')) {
      blocks.push(
        <h4 key={`h4-${blocks.length}`} className="mt-4 mb-2 text-xs font-bold text-indigo-300 uppercase tracking-wider">
          {renderInlineText(trimmed.slice(5))}
        </h4>
      );
      i++;
      continue;
    }

    if (trimmed.startsWith('### ')) {
      blocks.push(
        <h3 key={`h3-${blocks.length}`} className="mt-5 mb-2 text-sm sm:text-base font-bold text-white">
          {renderInlineText(trimmed.slice(4))}
        </h3>
      );
      i++;
      continue;
    }

    if (trimmed.startsWith('## ') || trimmed.startsWith('# ')) {
      const headingText = trimmed.replace(/^#+\s*/, '');
      blocks.push(
        <h2 key={`h2-${blocks.length}`} className="mt-6 mb-2.5 text-base sm:text-lg font-black text-white">
          {renderInlineText(headingText)}
        </h2>
      );
      i++;
      continue;
    }

    // Blockquote: starts with '>'
    if (trimmed.startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].trim().replace(/^>\s*/, ''));
        i++;
      }
      blocks.push(
        <blockquote
          key={`quote-${blocks.length}`}
          className="my-3 rounded-r-xl border-l-4 border-indigo-500 bg-indigo-500/10 p-3 text-xs italic text-indigo-200"
        >
          {quoteLines.map((ql, qIdx) => (
            <p key={qIdx}>{renderInlineText(ql)}</p>
          ))}
        </blockquote>
      );
      continue;
    }

    // Bullet lists: starts with '- ' or '* '
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const listItems: string[] = [];
      while (i < lines.length && (lines[i].trim().startsWith('- ') || lines[i].trim().startsWith('* '))) {
        listItems.push(lines[i].trim().slice(2));
        i++;
      }
      blocks.push(
        <ul key={`ul-${blocks.length}`} className="my-2.5 space-y-1.5 pl-1 text-xs text-slate-300">
          {listItems.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <span className="text-indigo-400 mt-0.5">•</span>
              <span className="leading-relaxed">{renderInlineText(item)}</span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Numbered lists: starts with '1. ', '2. ', etc.
    if (/^\d+\.\s+/.test(trimmed)) {
      const listItems: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        listItems.push(lines[i].trim().replace(/^\d+\.\s+/, ''));
        i++;
      }
      blocks.push(
        <ol key={`ol-${blocks.length}`} className="my-2.5 space-y-1.5 pl-1 text-xs text-slate-300">
          {listItems.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <span className="font-mono text-indigo-400 font-bold">{idx + 1}.</span>
              <span className="leading-relaxed">{renderInlineText(item)}</span>
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // Normal Paragraph
    blocks.push(
      <p key={`p-${blocks.length}`} className="my-2 text-xs sm:text-sm text-slate-300 leading-relaxed">
        {renderInlineText(trimmed)}
      </p>
    );
    i++;
  }

  return <div className={`space-y-1 ${className}`}>{blocks}</div>;
};
