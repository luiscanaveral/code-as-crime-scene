import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { Commit, AntiPatternResult } from '../types.js';

export function detectObjectCesspool(commits: Commit[], repoPath: string): AntiPatternResult {
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

        const objectPoolPattern = /(?:pool|reuse|recycle|objectPool|object_pool)\s*[:=]\s*\[|\b(?:createPool|getFromPool|releaseToPool|pool\.acquire|pool\.release)\b/gi;
        const poolMatches = content.match(objectPoolPattern);

        const mutableStatic = content.match(/(?:static|global)\s+\w+\s*[=:]\s*(?:new\s+\w+|\[\]|\{\})/g);

        if (poolMatches && poolMatches.length > 0) {
          candidates.push({
            path: file.path,
            details: {
              poolOperations: poolMatches.length,
              mutableStaticRefs: mutableStatic ? mutableStatic.length : 0,
            },
          });
        }
      } catch {}
    }
  }

  if (candidates.length === 0) {
    return { type: 'object-cesspool', severity: 'low', description: 'No object cesspool patterns detected', files: [] };
  }

  candidates.sort((a, b) => (b.details.poolOperations as number) - (a.details.poolOperations as number));

  const totalOps = candidates.reduce((s, c) => s + (c.details.poolOperations as number), 0);
  const severity = totalOps > 20 ? 'critical' : totalOps > 10 ? 'high' : 'medium';

  return {
    type: 'object-cesspool',
    severity,
    description: `Found ${candidates.length} file(s) with object pool/reuse patterns — pooled objects with mutable state can leak data between requests`,
    files: candidates.slice(0, 10),
  };
}
