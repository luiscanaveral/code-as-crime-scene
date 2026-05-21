import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { Commit, AntiPatternResult } from '../types.js';

export function detectAnemicDomainModel(commits: Commit[], repoPath: string): AntiPatternResult {
  const analyzed = new Set<string>();
  const candidates: Array<{ path: string; details: Record<string, unknown> }> = [];

  for (const commit of commits) {
    for (const file of commit.files) {
      if (analyzed.has(file.path)) continue;
      analyzed.add(file.path);

      const ext = file.path.split('.').pop()?.toLowerCase();
      if (!ext || !['ts', 'js', 'py', 'java', 'cs', 'php', 'rb', 'kt'].includes(ext)) continue;

      const fullPath = join(repoPath, file.path);
      if (!existsSync(fullPath)) continue;

      try {
        const content = readFileSync(fullPath, 'utf-8');
        const classMatches = content.matchAll(/\bclass\s+(\w+)[\s\S]*?\{/g);
        for (const classMatch of classMatches) {
          const classStart = classMatch.index!;
          const className = classMatch[1];
          const braceStack: number[] = [];
          let classEnd = classStart;

          for (let i = classStart; i < content.length; i++) {
            if (content[i] === '{') braceStack.push(i);
            else if (content[i] === '}') {
              braceStack.pop();
              if (braceStack.length === 0) { classEnd = i; break; }
            }
          }

          const classBody = content.slice(classStart, classEnd + 1);
          const fields = (classBody.match(/(?:private|public|protected|readonly|static)?\s+\w+\s+\w+\s*[;=]/g) || []).length;
          const methods = (classBody.match(/(?:async\s+)?(?:private|public|protected|static)?\s*(?:get |set )?(?:function\s+)?\w+\s*\([^)]*\)\s*(?::\s*\w+)?\s*\{/g) || []).length;
          const constructor = classBody.includes('constructor') ? 1 : 0;
          const totalMethods = methods + constructor;

          if (totalMethods === 0 && fields > 2) {
            candidates.push({
              path: file.path,
              details: {
                className,
                fields,
                methods: totalMethods,
                ratio: '0:' + fields,
              },
            });
          } else if (fields > 0 && fields > totalMethods * 3 && fields > 3) {
            candidates.push({
              path: file.path,
              details: {
                className,
                fields,
                methods: totalMethods,
                ratio: `${totalMethods}:${fields}`,
              },
            });
          }
        }
      } catch {}
    }
  }

  if (candidates.length === 0) {
    return { type: 'anemic-domain-model', severity: 'low', description: 'No anemic domain models detected', files: [] };
  }

  candidates.sort((a, b) => (b.details.fields as number) - (a.details.fields as number));

  const avgRatio = candidates.reduce((s, c) => {
    const ratio = (c.details.ratio as string).split(':');
    return s + (parseInt(ratio[1]) / Math.max(1, parseInt(ratio[0])));
  }, 0) / candidates.length;

  const severity = avgRatio > 10 ? 'critical' : avgRatio > 5 ? 'high' : 'medium';

  return {
    type: 'anemic-domain-model',
    severity,
    description: `Found ${candidates.length} class(es) with far more fields than methods — domain objects that are mere data bags without behavior`,
    files: candidates.slice(0, 20),
  };
}
