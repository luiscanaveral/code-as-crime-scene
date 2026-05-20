import { Commit } from '../types.js';
import { detectLanguage } from '../analytics/stats.js';
import { AntiPatternResult } from '../types.js';

export function detectFatController(commits: Commit[]): AntiPatternResult {
  const fileMetrics = new Map<string, { commits: number; insertions: number; authors: Set<string>; messages: string[] }>();

  for (const commit of commits) {
    for (const file of commit.files) {
      if (!fileMetrics.has(file.path)) {
        fileMetrics.set(file.path, { commits: 0, insertions: 0, authors: new Set(), messages: [] });
      }
      const m = fileMetrics.get(file.path)!;
      m.commits++;
      m.insertions += file.insertions;
      m.authors.add(commit.author);
      m.messages.push(commit.message.split('\n')[0]);
    }
  }

  const candidates: Array<{ path: string; details: Record<string, unknown> }> = [];

  for (const [path, metrics] of fileMetrics) {
    const lang = detectLanguage(path);
    if (!['TypeScript', 'JavaScript', 'Java', 'C#', 'Python', 'PHP', 'Ruby', 'Kotlin', 'Scala'].includes(lang)) continue;

    const isController =
      path.toLowerCase().includes('controller') ||
      path.toLowerCase().includes('handler') ||
      path.toLowerCase().includes('service') ||
      path.toLowerCase().includes('manager');

    if (!isController) continue;

    if (metrics.commits > 20 && metrics.insertions > 1000 && metrics.authors.size > 1) {
      candidates.push({
        path,
        details: {
          commits: metrics.commits,
          insertions: metrics.insertions,
          authors: metrics.authors.size,
          avgInsertionsPerCommit: Math.round(metrics.insertions / metrics.commits),
        },
      });
    }
  }

  if (candidates.length === 0) {
    return {
      type: 'fat-controller',
      severity: 'low',
      description: 'No fat controllers detected',
      files: [],
    };
  }

  const avgInsertions = candidates.reduce((s, c) => s + (c.details.insertions as number), 0) / candidates.length;
  const severity = avgInsertions > 5000 ? 'critical' : avgInsertions > 2500 ? 'high' : 'medium';

  return {
    type: 'fat-controller',
    severity,
    description: `Found ${candidates.length} controller/service file(s) with excessive size and change frequency — indicates too many responsibilities concentrated in one file`,
    files: candidates,
  };
}
