import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { Commit, AntiPatternResult } from '../types.js';

export function detectRefusedBequest(commits: Commit[], repoPath: string): AntiPatternResult {
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

        const classMatch = content.match(/\bclass\s+(\w+)\s+extends\s+(\w+)/);
        if (!classMatch) continue;

        const begin = classMatch.index!;
        const braceStack: number[] = [];
        let classEnd = begin;
        for (let i = begin; i < content.length; i++) {
          if (content[i] === '{') braceStack.push(i);
          else if (content[i] === '}') {
            braceStack.pop();
            if (braceStack.length === 0) { classEnd = i; break; }
          }
        }

        const classBody = content.slice(begin, classEnd + 1);
        const overrideCalls = (classBody.match(/\bsuper\.\w+\s*\(/g) || []).length;

        const ownMethods = (classBody.match(/(?:async\s+)?(?:private|public|protected)?\s*(?:get |set )?(?:function\s+)?(\w+)\s*\([^)]*\)\s*(?::\s*\w+)?\s*(?:\{|=>)/g) || []).length;
        const overrideCount = (classBody.match(/(?:override|Overrides)\s/gi) || []).length + overrideCalls;

        if (ownMethods > 0 && overrideCount > ownMethods / 2) {
          candidates.push({
            path: file.path,
            details: {
              className: classMatch[1],
              parentClass: classMatch[2],
              totalMethods: ownMethods,
              overridesOrSuperCalls: overrideCount,
              overrideRatio: `${overrideCount}/${ownMethods}`,
            },
          });
        }
      } catch {}
    }
  }

  if (candidates.length === 0) {
    return { type: 'refused-bequest', severity: 'low', description: 'No refused bequest detected', files: [] };
  }

  candidates.sort((a, b) => (b.details.totalMethods as number) - (a.details.totalMethods as number));

  const manyOverrides = candidates.filter(c => (c.details.overridesOrSuperCalls as number) >= (c.details.totalMethods as number) * 0.7).length;
  const severity = manyOverrides > 5 ? 'critical' : manyOverrides > 2 ? 'high' : 'medium';

  return {
    type: 'refused-bequest',
    severity,
    description: `Found ${candidates.length} subclass(es) that override most inherited methods — the subclass rejects its parent's contract, suggesting the hierarchy is wrong`,
    files: candidates.slice(0, 15),
  };
}
