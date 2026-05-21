import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { Commit, AntiPatternResult } from '../types.js';

export function detectSingletonAbuse(commits: Commit[], repoPath: string): AntiPatternResult {
  const analyzed = new Set<string>();
  const candidates: Array<{ path: string; details: Record<string, unknown> }> = [];

  for (const commit of commits) {
    for (const file of commit.files) {
      if (analyzed.has(file.path)) continue;
      analyzed.add(file.path);

      const ext = file.path.split('.').pop()?.toLowerCase();
      if (!ext || !['ts', 'js', 'java', 'cs', 'php', 'rb', 'kt'].includes(ext)) continue;

      const fullPath = join(repoPath, file.path);
      if (!existsSync(fullPath)) continue;

      try {
        const content = readFileSync(fullPath, 'utf-8');

        const instancePattern = /(?:private\s+static|protected\s+static|public\s+static)\s+\w+\s+instance\b|static\s+(?:readonly\s+)?instance\s*[=:]|getInstance\s*\(\s*\)/g;
        const instanceMatches = content.match(instancePattern);

        const constructorPattern = /(?:private|protected)\s+(?:constructor|new\s+\w+)\s*\(/g;
        const constructorMatches = content.match(constructorPattern);

        if (instanceMatches && constructorMatches) {
          candidates.push({
            path: file.path,
            details: {
              instanceRefs: instanceMatches.length,
              privateConstructor: constructorMatches.length > 0,
            },
          });
        }
      } catch {}
    }
  }

  if (candidates.length === 0) {
    return { type: 'singleton-abuse', severity: 'low', description: 'No singleton abuse detected', files: [] };
  }

  candidates.sort((a, b) => (b.details.instanceRefs as number) - (a.details.instanceRefs as number));

  const totalSingletons = candidates.length;
  const severity = totalSingletons > 10 ? 'critical' : totalSingletons > 5 ? 'high' : 'medium';

  return {
    type: 'singleton-abuse',
    severity,
    description: `Found ${candidates.length} singleton(s) — overuse of singletons introduces global state and tight coupling`,
    files: candidates.slice(0, 15),
  };
}
