import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { Commit, AntiPatternResult } from '../types.js';

export function detectPropDrilling(commits: Commit[], repoPath: string): AntiPatternResult {
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

        const props = new Map<string, { defined: number; forwarded: number }>();

        for (const line of lines) {
          const destructured = line.match(/\{\s*([^}]+)\}\s*(?::\s*\w+)?\s*=|props\.(\w+)/g);
          if (destructured) {
            for (const match of destructured) {
              const propNames = match.match(/\b(\w+)\s*(?::|,|\}|$)/g);
              if (propNames) {
                for (const pn of propNames) {
                  const name = pn.replace(/[:,}\s]/g, '');
                  if (name && name.length > 1) {
                    if (!props.has(name)) props.set(name, { defined: 0, forwarded: 0 });
                    props.get(name)!.defined++;
                  }
                }
              }
            }
          }

          const forwarded = line.match(/<(\w+)\s[^>]*\{?(\w+)\}?=/g);
          if (forwarded) {
            for (const f of forwarded) {
              const propName = f.match(/(\w+)=/);
              if (propName && props.has(propName[1])) {
                props.get(propName[1])!.forwarded++;
              }
            }
          }
        }

        const drilledProps = [...props.entries()]
          .filter(([, counts]) => counts.defined > 0 && counts.forwarded === counts.defined);

        if (drilledProps.length > 3) {
          candidates.push({
            path: file.path,
            details: {
              propsPassedThrough: drilledProps.length,
              propNames: drilledProps.map(([n]) => n).slice(0, 8).join(', '),
              totalProps: props.size,
            },
          });
        }
      } catch {}
    }
  }

  if (candidates.length === 0) {
    return { type: 'prop-drilling', severity: 'low', description: 'No prop drilling detected', files: [] };
  }

  candidates.sort((a, b) => (b.details.propsPassedThrough as number) - (a.details.propsPassedThrough as number));

  const avgDrilled = candidates.reduce((s, c) => s + (c.details.propsPassedThrough as number), 0) / candidates.length;
  const severity = avgDrilled > 8 ? 'critical' : avgDrilled > 5 ? 'high' : 'medium';

  return {
    type: 'prop-drilling',
    severity,
    description: `Found ${candidates.length} component(s) passing 4+ props straight through to children — consider context or component composition`,
    files: candidates.slice(0, 10),
  };
}
