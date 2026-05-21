import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { Commit, AntiPatternResult } from '../types.js';

export function detectFeatureEnvy(commits: Commit[], repoPath: string): AntiPatternResult {
  const analyzed = new Set<string>();
  const candidates: Array<{ path: string; details: Record<string, unknown> }> = [];

  for (const commit of commits) {
    for (const file of commit.files) {
      if (analyzed.has(file.path)) continue;
      analyzed.add(file.path);

      const ext = file.path.split('.').pop()?.toLowerCase();
      if (!ext || !['ts', 'tsx', 'js', 'jsx', 'java', 'cs', 'php', 'rb', 'kt'].includes(ext)) continue;

      const fullPath = join(repoPath, file.path);
      if (!existsSync(fullPath)) continue;

      try {
        const content = readFileSync(fullPath, 'utf-8');
        const lines = content.split('\n');

        const localMethods = new Set<string>();
        const localMethodPattern = /(?:async\s+)?(?:private|public|protected)?\s*(?:get |set )?(?:function\s+)?(\w+)\s*\([^)]*\)\s*(?::\s*\w+)?\s*(?:\{|=>)/g;
        let methodMatch;
        while ((methodMatch = localMethodPattern.exec(content)) !== null) {
          localMethods.add(methodMatch[1]);
        }

        let externalRefs = 0;
        let ownRefs = 0;
        for (const line of lines) {
          const dotCalls = line.match(/(\w+)\.(\w+)\s*\(/g);
          if (dotCalls) {
            for (const call of dotCalls) {
              const parts = call.split('.');
              if (parts.length === 2) {
                const obj = parts[0];
                const method = parts[1].replace('(', '');
                if (/\b(?:this|self|_this)\b/.test(obj)) {
                  ownRefs++;
                } else if (/^[a-z]/.test(obj) && obj !== 'console' && obj !== 'Math' && obj !== 'JSON' && obj !== 'Object' && obj !== 'Array' && obj !== 'String' && obj !== 'Number' && !localMethods.has(obj)) {
                  try { JSON.parse(obj); } catch { externalRefs++; }
                }
              }
            }
          }

          const paramCount = (line.match(/\b(\w+)\s*:\s*(?:\w+)/g) || []).length;
          if (paramCount > 3 && dotCalls && dotCalls.length > paramCount) {
            externalRefs += 2;
          }
        }

        if (externalRefs > ownRefs * 2 && externalRefs > 5) {
          candidates.push({
            path: file.path,
            details: {
              envyScore: externalRefs / Math.max(1, ownRefs),
              externalMethodCalls: externalRefs,
              ownMethodCalls: ownRefs,
            },
          });
        }
      } catch {}
    }
  }

  if (candidates.length === 0) {
    return { type: 'feature-envy', severity: 'low', description: 'No feature envy detected', files: [] };
  }

  candidates.sort((a, b) => (b.details.envyScore as number) - (a.details.envyScore as number));

  const avgScore = candidates.reduce((s, c) => s + (c.details.envyScore as number), 0) / candidates.length;
  const severity = avgScore > 10 ? 'critical' : avgScore > 5 ? 'high' : 'medium';

  return {
    type: 'feature-envy',
    severity,
    description: `Found ${candidates.length} file(s) where methods call out to other objects' methods far more than their own — indicating misplaced behavior`,
    files: candidates.slice(0, 15),
  };
}
