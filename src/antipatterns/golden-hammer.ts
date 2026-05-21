import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { Commit, AntiPatternResult } from '../types.js';

const OVERUSE_PATTERNS: [string, RegExp, string][] = [
  ['Singleton', /\bgetInstance\s*\(/g, 'Excessive singleton usage — consider dependency injection instead'],
  ['Factory', /\bFactory\b/g, 'Excessive factory pattern usage — consider simpler construction'],
  ['Observer', /\b(?:subscribe|emit|on|addListener|dispatch)\b/g, 'Excessive event/observer usage — can obscure control flow'],
  ['Static Method', /\bstatic\s+\w+\s*\(/g, 'Excessive static method usage — indicates procedural style'],
  ['Abstract Class', /\babstract\s+(?:class|function)\b/g, 'Excessive abstraction — may indicate over-engineering'],
  ['Interface Segregation', /\binterface\s+\w+\s*\{/g, 'Many small interfaces — may indicate over-abstraction'],
];

export function detectGoldenHammer(commits: Commit[], repoPath: string): AntiPatternResult {
  const analyzed = new Set<string>();
  const candidates: Array<{ path: string; details: Record<string, unknown> }> = [];

  for (const commit of commits) {
    for (const file of commit.files) {
      if (analyzed.has(file.path)) continue;
      analyzed.add(file.path);

      const ext = file.path.split('.').pop()?.toLowerCase();
      if (!ext || !['ts', 'tsx', 'js', 'jsx', 'py', 'java', 'cs', 'php', 'rb', 'kt', 'go'].includes(ext)) continue;

      const fullPath = join(repoPath, file.path);
      if (!existsSync(fullPath)) continue;

      try {
        const content = readFileSync(fullPath, 'utf-8');

        for (const [name, pattern] of OVERUSE_PATTERNS) {
          const matches = content.match(pattern);
          const count = matches ? matches.length : 0;
          if (count >= 10) {
            candidates.push({
              path: file.path,
              details: {
                pattern: name,
                occurrences: count,
                description: name,
              },
            });
          }
        }
      } catch {}
    }
  }

  if (candidates.length === 0) {
    return { type: 'golden-hammer', severity: 'low', description: 'No golden hammer patterns detected', files: [] };
  }

  candidates.sort((a, b) => (b.details.occurrences as number) - (a.details.occurrences as number));

  const totalOccurrences = candidates.reduce((s, c) => s + (c.details.occurrences as number), 0);
  const severity = totalOccurrences > 100 ? 'critical' : totalOccurrences > 50 ? 'high' : 'medium';

  return {
    type: 'golden-hammer',
    severity,
    description: `Found ${candidates.length} case(s) of heavily overused patterns (10+ occurrences per file) — a familiar hammer applied to every problem`,
    files: candidates.slice(0, 15),
  };
}
