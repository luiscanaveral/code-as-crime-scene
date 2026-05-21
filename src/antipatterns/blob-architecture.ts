import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { Commit, AntiPatternResult } from '../types.js';

export function detectBlobArchitecture(commits: Commit[], repoPath: string): AntiPatternResult {
  const moduleSizes = new Map<string, { files: number; lines: number; commits: number }>();

  for (const commit of commits) {
    for (const file of commit.files) {
      const module = file.path.split('/')[0] || '(root)';
      if (!moduleSizes.has(module)) {
        moduleSizes.set(module, { files: 0, lines: 0, commits: 0 });
      }
      const m = moduleSizes.get(module)!;
      m.files++;
      m.commits++;

      const fullPath = join(repoPath, file.path);
      if (existsSync(fullPath)) {
        try {
          const content = readFileSync(fullPath, 'utf-8');
          m.lines += content.split('\n').length;
        } catch {
          m.lines += file.insertions;
        }
      } else {
        m.lines += file.insertions;
      }
    }
  }

  const totalLines = Array.from(moduleSizes.values()).reduce((s, m) => s + m.lines, 0);
  if (totalLines === 0) {
    return { type: 'blob-architecture', severity: 'low', description: 'No files to analyze', files: [] };
  }

  const candidates: Array<{ path: string; details: Record<string, unknown> }> = [];
  for (const [module, metrics] of moduleSizes) {
    const pct = (metrics.lines / totalLines) * 100;
    if (pct > 40) {
      candidates.push({
        path: module + '/',
        details: {
          percentageOfCodebase: `${pct.toFixed(1)}%`,
          files: metrics.files,
          lines: metrics.lines,
          commits: metrics.commits,
        },
      });
    }
  }

  candidates.sort((a, b) => parseFloat(b.details.percentageOfCodebase as string) - parseFloat(a.details.percentageOfCodebase as string));

  if (candidates.length === 0) {
    return { type: 'blob-architecture', severity: 'low', description: 'No blob architecture detected — code is reasonably distributed', files: [] };
  }

  const topPct = parseFloat(candidates[0].details.percentageOfCodebase as string);
  const severity = topPct > 60 ? 'critical' : topPct > 50 ? 'high' : 'medium';

  return {
    type: 'blob-architecture',
    severity,
    description: `Found ${candidates.length} module(s) containing 40%+ of the codebase — indicates a dominant module that may concentrate too many responsibilities`,
    files: candidates,
  };
}
