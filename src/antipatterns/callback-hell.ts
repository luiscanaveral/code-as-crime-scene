import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { Commit, AntiPatternResult } from '../types.js';

export function detectCallbackHell(commits: Commit[], repoPath: string): AntiPatternResult {
  const analyzed = new Set<string>();
  const candidates: Array<{ path: string; details: Record<string, unknown> }> = [];

  for (const commit of commits) {
    for (const file of commit.files) {
      if (analyzed.has(file.path)) continue;
      analyzed.add(file.path);

      const ext = file.path.split('.').pop()?.toLowerCase();
      if (!ext || !['ts', 'tsx', 'js', 'jsx'].includes(ext)) continue;

      const fullPath = join(repoPath, file.path);
      if (!existsSync(fullPath)) continue;

      try {
        const content = readFileSync(fullPath, 'utf-8');
        const lines = content.split('\n');

        let callbackDepth = 0;
        let maxCallbackDepth = 0;
        let deepCallbackCount = 0;

        for (const line of lines) {
          const trimmed = line.trim();

          const opens = (trimmed.match(/function\s*\(|=>\s*\{|\.then\s*\(|\.catch\s*\(|\.finally\s*\(|function\s*\w+\s*\(/g) || []).length;
          const closes = (trimmed.match(/\}\);\s*$|\)\s*=>\s*$|\)\s*\{/g) || []).length;

          const arrowOpens = (trimmed.match(/=>\s*\{/g) || []).length;
          const arrowCloses = (trimmed.match(/\}\);\s*$/g) || []).length;

          callbackDepth += opens + arrowOpens - closes - arrowCloses;
          callbackDepth = Math.max(0, callbackDepth);
          maxCallbackDepth = Math.max(maxCallbackDepth, callbackDepth);

          if (callbackDepth >= 3) deepCallbackCount++;

          if (trimmed.startsWith('})') || trimmed === '});') {
            callbackDepth = Math.max(0, callbackDepth - 1);
          }
        }

        const nestedPattern = (content.match(/\.then\s*\(.*\.then\s*\(/g) || []).length;
        const pyramidOfDoom = (content.match(/>\s*\)\s*\)\s*\)\s*\)/g) || []).length;
        const callbackScore = deepCallbackCount + nestedPattern * 3 + pyramidOfDoom * 5;

        if (callbackScore > 0) {
          candidates.push({
            path: file.path,
            details: {
              callbackHellScore: callbackScore,
              maxNestingDepth: maxCallbackDepth,
              deeplyNestedBlocks: deepCallbackCount,
              nestedThenChains: nestedPattern,
              pyramidPatterns: pyramidOfDoom,
            },
          });
        }
      } catch {}
    }
  }

  if (candidates.length === 0) {
    return { type: 'callback-hell', severity: 'low', description: 'No callback hell detected', files: [] };
  }

  candidates.sort((a, b) => (b.details.callbackHellScore as number) - (a.details.callbackHellScore as number));

  const avgScore = candidates.reduce((s, c) => s + (c.details.callbackHellScore as number), 0) / candidates.length;
  const severity = avgScore > 20 ? 'critical' : avgScore > 10 ? 'high' : 'medium';

  return {
    type: 'callback-hell',
    severity,
    description: `Found ${candidates.length} file(s) with deeply nested callbacks or promise chains — consider async/await for readability`,
    files: candidates.slice(0, 15),
  };
}
