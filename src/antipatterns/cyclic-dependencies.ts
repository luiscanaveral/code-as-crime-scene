import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { Commit, AntiPatternResult } from '../types.js';

interface GraphNode {
  in: Set<string>;
  out: Set<string>;
}

export function detectCyclicDependencies(commits: Commit[], repoPath: string): AntiPatternResult {
  const files = new Set<string>();
  for (const commit of commits) {
    for (const f of commit.files) {
      const ext = f.path.split('.').pop()?.toLowerCase();
      if (ext && ['ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs', 'mts', 'cts'].includes(ext)) {
        files.add(f.path);
      }
    }
  }

  const graph = buildDependencyGraph(repoPath, [...files]);

  const sccResult = findStronglyConnectedComponents(graph, [...files]);

  reportCycles(sccResult);

  const candidates: Array<{ path: string; details: Record<string, unknown> }> = [];

  const instability = new Map<string, number>();
  for (const [file, node] of graph) {
    const fanOut = node.out.size;
    const fanIn = node.in.size;
    const i = fanOut + fanIn > 0 ? fanOut / (fanOut + fanIn) : 0;
    instability.set(file, i);
  }

  for (const scc of sccResult.sccs) {
    if (scc.length > 1) {
      let avgInstability = 0;
      for (const f of scc) {
        avgInstability += instability.get(f) || 0;
      }
      avgInstability /= scc.length;

      candidates.push({
        path: scc.join(' → '),
        details: {
          cycleSize: scc.length,
          avgInstability: avgInstability.toFixed(2),
          members: scc.slice(0, 8).join(', '),
        },
      });
    }
  }

  const moduleTangled = new Map<string, { total: number; cyclic: number }>();
  for (const [file, node] of graph) {
    const module = file.split('/')[0];
    if (!moduleTangled.has(module)) moduleTangled.set(module, { total: 0, cyclic: 0 });
    moduleTangled.get(module)!.total++;
  }

  for (const scc of sccResult.sccs) {
    if (scc.length > 1) {
      const modulesInCycle = new Set(scc.map(f => f.split('/')[0]));
      for (const mod of modulesInCycle) {
        if (!moduleTangled.has(mod)) moduleTangled.set(mod, { total: 0, cyclic: 0 });
        moduleTangled.get(mod)!.cyclic += scc.length;
      }
    }
  }

  const tangleEntries: Array<{ path: string; details: Record<string, unknown> }> = [];
  for (const [module, counts] of moduleTangled) {
    const tangleIndex = counts.cyclic / Math.max(1, counts.total);
    if (tangleIndex > 0) {
      tangleEntries.push({
        path: module + '/',
        details: {
          tangleIndex: tangleIndex.toFixed(2),
          cyclicFiles: counts.cyclic,
          totalFiles: counts.total,
          instability: instability.size > 0
            ? ([...instability.entries()]
                .filter(([f]) => f.startsWith(module))
                .reduce((s, [, i]) => s + i, 0) / Math.max(1, counts.total)).toFixed(2)
            : '0',
        },
      });
    }
  }

  tangleEntries.sort((a, b) => parseFloat(b.details.tangleIndex as string) - parseFloat(a.details.tangleIndex as string));

  const results: AntiPatternResult = {
    type: 'cyclic-dependencies',
    severity: 'low',
    description: 'No cyclic dependencies detected',
    files: [],
  };

  if (candidates.length > 0) {
    const cycleCount = candidates.length;
    results.severity = cycleCount > 5 ? 'critical' : cycleCount > 2 ? 'high' : 'medium';
    results.description = `Found ${candidates.length} cyclic dependency group(s) (SCCs) — circular dependencies between modules increase coupling and hinder independent development`;
    results.files = candidates.slice(0, 10);
  }

  if (tangleEntries.length > 0) {
    results.files = [
      ...results.files,
      {
        path: '📦 Package Tangle Index',
        details: {
          mostTangledModules: tangleEntries.slice(0, 5).map(e => `${e.path} (${e.details.tangleIndex})`).join(', '),
        },
      },
    ];
  }

  return results;
}

function buildDependencyGraph(repoPath: string, files: string[]): Map<string, GraphNode> {
  const graph = new Map<string, GraphNode>();

  for (const file of files) {
    if (!graph.has(file)) graph.set(file, { in: new Set(), out: new Set() });
    const fullPath = join(repoPath, file);
    if (!existsSync(fullPath)) continue;

    try {
      const content = readFileSync(fullPath, 'utf-8');
      const importPattern = /(?:import\s+(?:(?:\{[^}]*\}|[^;{]+)\s+from\s+)?['"]([^'"]+)['"]|require\s*\(\s*['"]([^'"]+)['"]\s*\))/g;
      let match;

      while ((match = importPattern.exec(content)) !== null) {
        const raw = match[1] || match[2];
        if (!raw.startsWith('.')) continue;

        const resolved = resolvePath(file, raw);
        if (resolved && files.some(f => f === resolved || f === resolved + '.ts' || f === resolved + '.js' || f === resolved + '.tsx' || f === resolved + '.jsx')) {
          const target = files.find(f => f === resolved || f === resolved + '.ts' || f === resolved + '.js' || f === resolved + '.tsx' || f === resolved + '.jsx');
          if (target) {
            if (!graph.has(target)) graph.set(target, { in: new Set(), out: new Set() });
            graph.get(file)!.out.add(target);
            graph.get(target)!.in.add(file);
          }
        }
      }
    } catch {}
  }

  return graph;
}

function resolvePath(from: string, to: string): string {
  const parts = from.split('/');
  parts.pop();
  for (const seg of to.split('/')) {
    if (seg === '.') continue;
    if (seg === '..') { if (parts.length > 0) parts.pop(); }
    else parts.push(seg);
  }
  return parts.join('/');
}

function findStronglyConnectedComponents(graph: Map<string, GraphNode>, files: string[]): { sccs: string[][]; index: number; stack: string[]; onStack: Set<string>; lowlink: Map<string, number>; indices: Map<string, number> } {
  let index = 0;
  const stack: string[] = [];
  const onStack = new Set<string>();
  const lowlink = new Map<string, number>();
  const indices = new Map<string, number>();
  const sccs: string[][] = [];

  function strongConnect(v: string) {
    indices.set(v, index);
    lowlink.set(v, index);
    index++;
    stack.push(v);
    onStack.add(v);

    const node = graph.get(v);
    if (node) {
      for (const w of node.out) {
        if (!indices.has(w)) {
          strongConnect(w);
          lowlink.set(v, Math.min(lowlink.get(v)!, lowlink.get(w)!));
        } else if (onStack.has(w)) {
          lowlink.set(v, Math.min(lowlink.get(v)!, indices.get(w)!));
        }
      }
    }

    if (lowlink.get(v) === indices.get(v)) {
      const scc: string[] = [];
      let w: string;
      do {
        w = stack.pop()!;
        onStack.delete(w);
        scc.push(w);
      } while (w !== v);
      sccs.push(scc);
    }
  }

  for (const file of files) {
    if (!indices.has(file)) {
      strongConnect(file);
    }
  }

  return { sccs, index, stack, onStack, lowlink, indices };
}

function reportCycles(sccResult: { sccs: string[][] }) {
  // Side-effect free; cycles are captured in the returning SCCs
}
