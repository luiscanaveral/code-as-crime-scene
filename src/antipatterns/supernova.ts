import { Commit } from '../types.js';
import { AntiPatternResult } from '../types.js';

export function detectSupernova(commits: Commit[]): AntiPatternResult {
  const fileChurn = new Map<string, { churn: number; commitHashes: string[]; dateRange: { first: Date; last: Date } }>();

  for (const commit of commits) {
    for (const file of commit.files) {
      if (!fileChurn.has(file.path)) {
        fileChurn.set(file.path, { churn: 0, commitHashes: [], dateRange: { first: commit.date, last: commit.date } });
      }
      const m = fileChurn.get(file.path)!;
      m.churn += file.insertions + file.deletions;
      m.commitHashes.push(commit.hash);
      if (commit.date < m.dateRange.first) m.dateRange.first = commit.date;
      if (commit.date > m.dateRange.last) m.dateRange.last = commit.date;
    }
  }

  const churnValues = Array.from(fileChurn.values()).map(m => m.churn);
  if (churnValues.length === 0) {
    return { type: 'supernova', severity: 'low', description: 'No files to analyze for supernova patterns', files: [] };
  }

  churnValues.sort((a, b) => a - b);
  const median =
    churnValues.length % 2 === 0
      ? (churnValues[churnValues.length / 2 - 1] + churnValues[churnValues.length / 2]) / 2
      : churnValues[Math.floor(churnValues.length / 2)];
  const mean = churnValues.reduce((s, v) => s + v, 0) / churnValues.length;

  const stdDev = Math.sqrt(churnValues.reduce((s, v) => s + (v - mean) ** 2, 0) / churnValues.length);

  const threshold = mean + stdDev * 3;

  const candidates: Array<{ path: string; details: Record<string, unknown> }> = [];

  for (const [path, metrics] of fileChurn) {
    if (metrics.churn > threshold && metrics.churn > 2000) {
      const dateSpan = (metrics.dateRange.last.getTime() - metrics.dateRange.first.getTime()) / (1000 * 60 * 60 * 24);
      candidates.push({
        path,
        details: {
          churn: metrics.churn,
          commits: metrics.commitHashes.length,
          dateSpanDays: Math.round(dateSpan),
          churnPerDay: dateSpan > 0 ? Math.round(metrics.churn / dateSpan) : metrics.churn,
          aboveAverage: `${Math.round((metrics.churn / mean) * 100)}%`,
        },
      });
    }
  }

  candidates.sort((a, b) => (b.details.churn as number) - (a.details.churn as number));

  if (candidates.length === 0) {
    return {
      type: 'supernova',
      severity: 'low',
      description: 'No supernova patterns detected',
      files: [],
    };
  }

  return {
    type: 'supernova',
    severity: 'high',
    description: `Found ${candidates.length} file(s) with anomalously high churn (3+ sigma above mean) — files that "exploded" in activity relative to the rest of the codebase`,
    files: candidates.slice(0, 20),
  };
}
