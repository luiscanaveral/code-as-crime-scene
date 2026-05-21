import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { Commit, AntiPatternResult } from '../types.js';

export function detectSpaghettiCode(commits: Commit[], repoPath: string): AntiPatternResult {
  const analyzed = new Set<string>();
  const candidates: Array<{ path: string; details: Record<string, unknown> }> = [];

  for (const commit of commits) {
    for (const file of commit.files) {
      if (analyzed.has(file.path)) continue;
      analyzed.add(file.path);

      const ext = file.path.split('.').pop()?.toLowerCase();
      if (!ext || !['ts', 'tsx', 'js', 'jsx', 'py', 'java', 'cs', 'php', 'rb', 'kt', 'go', 'rs', 'c', 'cpp', 'h', 'hpp'].includes(ext)) continue;

      const fullPath = join(repoPath, file.path);
      if (!existsSync(fullPath)) continue;

      try {
        const content = readFileSync(fullPath, 'utf-8');
        const lines = content.split('\n');

        let deepNesting = 0;
        let longFunctions = 0;
        let highComplexity = 0;
        let maxDepth = 0;

        let currentDepth = 0;
        let functionLineStart = 0;
        let functionBraceCount = 0;
        let inFunction = false;

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const stripped = line.replace(/\/\/.*/, '').trim();

          if (stripped.includes('{')) {
            currentDepth++;
            maxDepth = Math.max(maxDepth, currentDepth);

            if (!inFunction && /\b(?:function|if|for|while|switch|catch|=>)\s*\{/.test(stripped.replace(/\/\/.*/, ''))) {
              inFunction = true;
              functionLineStart = i;
              functionBraceCount = 1;
            } else if (inFunction) {
              functionBraceCount++;
            }
          }

          if (stripped.includes('}')) {
            currentDepth = Math.max(0, currentDepth - 1);
            if (inFunction) {
              functionBraceCount--;
              if (functionBraceCount <= 0 && i - functionLineStart > 50) {
                longFunctions++;
                inFunction = false;
              } else if (functionBraceCount <= 0) {
                inFunction = false;
              }
            }
          }

          if (currentDepth > 4) deepNesting++;

          const complexityIndicators = (line.match(/\b(?:if|else if|for|while|catch|case |&&|\|\|)\b/g) || []).length;
          if (complexityIndicators > 5) highComplexity++;
        }

        if (inFunction && lines.length - functionLineStart > 50) {
          longFunctions++;
        }

        const score = deepNesting * 2 + longFunctions * 3 + highComplexity * 2;
        if (score > 0) {
          candidates.push({
            path: file.path,
            details: {
              spaghettiScore: score,
              deepNestingCount: deepNesting,
              longFunctions,
              highComplexityLines: highComplexity,
              maxNestingDepth: maxDepth,
            },
          });
        }
      } catch {}
    }
  }

  if (candidates.length === 0) {
    return { type: 'spaghetti-code', severity: 'low', description: 'No spaghetti code detected', files: [] };
  }

  candidates.sort((a, b) => (b.details.spaghettiScore as number) - (a.details.spaghettiScore as number));

  const topScore = candidates[0].details.spaghettiScore as number;
  const severity = topScore > 100 ? 'critical' : topScore > 50 ? 'high' : 'medium';

  return {
    type: 'spaghetti-code',
    severity,
    description: `Found ${candidates.length} file(s) with excessive nesting, long functions, or high cyclomatic complexity — indicating tangled, hard-to-maintain code`,
    files: candidates.slice(0, 15),
  };
}
