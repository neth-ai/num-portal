// Line diff for the "Changed lines" panel. Same LCS walk as the prototype.

export type DiffMark = '+' | '-' | '';
export type DiffLine = { mark: DiffMark; text: string };

export function diffLines(before: string[], after: string[]): DiffLine[] {
  const n = before.length;
  const m = after.length;
  const lcs: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i][j] = before[i] === after[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }

  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (before[i] === after[j]) out.push({ mark: '', text: before[i++] }), j++;
    else if (lcs[i + 1][j] >= lcs[i][j + 1]) out.push({ mark: '-', text: before[i++] });
    else out.push({ mark: '+', text: after[j++] });
  }
  while (i < n) out.push({ mark: '-', text: before[i++] });
  while (j < m) out.push({ mark: '+', text: after[j++] });
  return out;
}

export const countChanges = (lines: DiffLine[]) => ({
  added: lines.filter((l) => l.mark === '+').length,
  removed: lines.filter((l) => l.mark === '-').length,
});
