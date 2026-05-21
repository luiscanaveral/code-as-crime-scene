import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { Commit, AntiPatternResult } from '../types.js';

const SERVICE_LOCATOR_PATTERNS = [
  /\b(?:service|svc)Locator\b/i,
  /\bcontainer\s*\.\s*(?:get|resolve|make)\s*\(/i,
  /\bgetService\s*\(/i,
  /\bresolve\s*\(/i,
  /\bServiceLocator\b/i,
  /\bapp\s*\[\s*['"]\w+['"]\s*\]/,
  /\bDependencyResolver\b/i,
  /\bServiceContainer\b/i,
  /\b(?:Module|Plugin|Extension)\s*Manager\b/,
];

export function detectServiceLocator(commits: Commit[], repoPath: string): AntiPatternResult {
  const analyzed = new Set<string>();
  const candidates: Array<{ path: string; details: Record<string, unknown> }> = [];

  for (const commit of commits) {
    for (const file of commit.files) {
      if (analyzed.has(file.path)) continue;
      analyzed.add(file.path);

      const ext = file.path.split('.').pop()?.toLowerCase();
      if (!ext || !['ts', 'js', 'py', 'java', 'cs', 'php', 'rb', 'kt', 'go', 'rs'].includes(ext)) continue;

      const fullPath = join(repoPath, file.path);
      if (!existsSync(fullPath)) continue;

      try {
        const content = readFileSync(fullPath, 'utf-8');
        let count = 0;
        for (const pattern of SERVICE_LOCATOR_PATTERNS) {
          const matches = content.match(pattern);
          if (matches) count += matches.length;
        }

        if (count > 0) {
          candidates.push({
            path: file.path,
            details: { serviceLocatorCalls: count },
          });
        }
      } catch {}
    }
  }

  if (candidates.length === 0) {
    return { type: 'service-locator', severity: 'low', description: 'No service locator usage detected', files: [] };
  }

  candidates.sort((a, b) => (b.details.serviceLocatorCalls as number) - (a.details.serviceLocatorCalls as number));

  const totalCalls = candidates.reduce((s, c) => s + (c.details.serviceLocatorCalls as number), 0);
  const avgCalls = totalCalls / candidates.length;
  const severity = avgCalls > 20 ? 'critical' : avgCalls > 10 ? 'high' : 'medium';

  return {
    type: 'service-locator',
    severity,
    description: `Found ${candidates.length} file(s) with ${totalCalls} service locator calls — this hides dependencies and makes testing harder`,
    files: candidates.slice(0, 15),
  };
}
