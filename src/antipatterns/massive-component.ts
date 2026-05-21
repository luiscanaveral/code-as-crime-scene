import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { Commit, AntiPatternResult } from '../types.js';

export function detectMassiveComponent(commits: Commit[], repoPath: string): AntiPatternResult {
  const analyzed = new Set<string>();
  const candidates: Array<{ path: string; details: Record<string, unknown> }> = [];

  for (const commit of commits) {
    for (const file of commit.files) {
      if (analyzed.has(file.path)) continue;
      analyzed.add(file.path);

      const ext = file.path.split('.').pop()?.toLowerCase();
      if (!ext || !['tsx', 'jsx', 'vue', 'svelte'].includes(ext)) continue;

      const fullPath = join(repoPath, file.path);
      if (!existsSync(fullPath)) continue;

      try {
        const content = readFileSync(fullPath, 'utf-8');
        const lines = content.split('\n');

        const isComponent = /\b(?:React\.)?(?:Component|createContext|useState|useEffect|useReducer|defineComponent|export\s+default\s+(?:function\s+)?\w+)\b/.test(content) ||
          /\b(?:<\w+>|<\/\w+>)/.test(content);

        if (!isComponent) continue;

        const jsxElements = (content.match(/<[A-Z]\w+/g) || []).length;
        const stateHooks = (content.match(/\b(?:useState|useReducer|useRef|useContext)\s*\(/g) || []).length;
        const effectHooks = (content.match(/\buseEffect\s*\(/g) || []).length;
        const handlers = (content.match(/\b(?:handle|on)\w+\s*(?:=|:)/g) || []).length;
        const conditionals = (content.match(/\b(?:if|else|switch|case)\b/g) || []).length;

        const componentScore = lines.length + handlers * 5 + jsxElements * 3 + conditionals * 2;

        if (lines.length > 200 || componentScore > 300) {
          candidates.push({
            path: file.path,
            details: {
              lines: lines.length,
              componentScore,
              jsxElements,
              stateHooks,
              effectHooks,
              eventHandlers: handlers,
            },
          });
        }
      } catch {}
    }
  }

  if (candidates.length === 0) {
    return { type: 'massive-component', severity: 'low', description: 'No massive components detected', files: [] };
  }

  candidates.sort((a, b) => (b.details.lines as number) - (a.details.lines as number));

  const maxLines = candidates[0].details.lines as number;
  const severity = maxLines > 500 ? 'critical' : maxLines > 300 ? 'high' : 'medium';

  return {
    type: 'massive-component',
    severity,
    description: `Found ${candidates.length} component(s) with 200+ lines — large components are harder to test, reason about, and reuse`,
    files: candidates.slice(0, 15),
  };
}
