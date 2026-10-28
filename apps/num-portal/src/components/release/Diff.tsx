'use client';
import { diffLines } from '@/lib/diff';

// Simple JSON colouring, the same classes the prototype uses.
function highlight(text: string) {
  const parts: { cls: string; text: string }[] = [];
  const re = /("(?:[^"\\\n]|\\.)*")|\b(true|false|null)\b|(\b\d+\b)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push({ cls: '', text: text.slice(last, m.index) });
    parts.push({ cls: m[1] ? 's' : m[2] ? 'k' : 'n', text: m[0] });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ cls: '', text: text.slice(last) });
  return parts;
}

export default function Diff({ before, after }: { before: string[]; after: string }) {
  const lines = diffLines(before, after.split('\n'));
  return (
    <pre className="code" id="rdiff">
      {lines.map((line, i) => (
        <span key={i} className={`l ${line.mark === '+' ? 'add' : line.mark === '-' ? 'del' : ''}`}>
          {highlight(`${line.mark || ' '} ${line.text}`).map((p, j) =>
            p.cls ? <i key={j} className={p.cls}>{p.text}</i> : <span key={j}>{p.text}</span>)}
        </span>
      ))}
    </pre>
  );
}
