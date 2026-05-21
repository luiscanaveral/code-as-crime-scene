import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { Commit, AntiPatternResult } from '../types.js';

const GLOBAL_STATE_PATTERNS: [string, RegExp][] = [
  ['Redux Store', /\bcreateStore\b|\bconfigureStore\b|\buseDispatch\b|\bdispatch\s*\(/],
  ['Context Provider', /\bcreateContext\b|\bProvider\b|\buseContext\b/],
  ['Global Variable', /\bglobal\.\w+|window\.\w+|process\.env\.\w+|globalThis\.\w+/],
  ['Zustand Store', /\bcreate\s*\(|\buseStore\b/],
  ['MobX', /\bobservable\b|\b@observable\b|\baction\b|\bcomputed\b/],
  ['Vuex/Pinia', /\buseStore\b|\bcreateStore\b|\bdefineStore\b/],
  ['Reflux', /\bReflux\b/],
  ['Module-level State', /\b(?:let|const|var)\s+\w+\s*[=:].*(?:\n|.){0,100}\bexport\b/],
];

export function detectGlobalStateAbuse(commits: Commit[], repoPath: string): AntiPatternResult {
  const analyzed = new Set<string>();
  const candidates: Array<{ path: string; details: Record<string, unknown> }> = [];

  for (const commit of commits) {
    for (const file of commit.files) {
      if (analyzed.has(file.path)) continue;
      analyzed.add(file.path);

      const ext = file.path.split('.').pop()?.toLowerCase();
      if (!ext || !['ts', 'tsx', 'js', 'jsx', 'vue', 'svelte'].includes(ext)) continue;

      const fullPath = join(repoPath, file.path);
      if (!existsSync(fullPath)) continue;

      try {
        const content = readFileSync(fullPath, 'utf-8');
        let totalRefs = 0;
        const patterns: string[] = [];

        for (const [name, pattern] of GLOBAL_STATE_PATTERNS) {
          const matches = content.match(pattern);
          if (matches) {
            totalRefs += matches.length;
            patterns.push(name);
          }
        }

        if (totalRefs > 0) {
          candidates.push({
            path: file.path,
            details: {
              globalStateRefs: totalRefs,
              patterns: [...new Set(patterns)].join(', '),
            },
          });
        }
      } catch {}
    }
  }

  if (candidates.length === 0) {
    return { type: 'global-state-abuse', severity: 'low', description: 'No global state abuse detected', files: [] };
  }

  candidates.sort((a, b) => (b.details.globalStateRefs as number) - (a.details.globalStateRefs as number));

  const totalRefs = candidates.reduce((s, c) => s + (c.details.globalStateRefs as number), 0);
  const severity = totalRefs > 30 ? 'critical' : totalRefs > 15 ? 'high' : 'medium';

  return {
    type: 'global-state-abuse',
    severity,
    description: `Found ${candidates.length} file(s) with ${totalRefs} global state references — global state makes data flow hard to trace and debug`,
    files: candidates.slice(0, 15),
  };
}
