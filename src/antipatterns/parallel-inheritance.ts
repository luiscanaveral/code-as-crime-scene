import { Commit, AntiPatternResult } from '../types.js';

export function detectParallelInheritance(commits: Commit[]): AntiPatternResult {
  const fileCoChange = new Map<string, Map<string, number>>();

  for (const commit of commits) {
    const files = commit.files.map(f => f.path);
    for (let i = 0; i < files.length; i++) {
      for (let j = i + 1; j < files.length; j++) {
        if (!fileCoChange.has(files[i])) fileCoChange.set(files[i], new Map());
        if (!fileCoChange.has(files[j])) fileCoChange.set(files[j], new Map());
        fileCoChange.get(files[i])!.set(files[j], (fileCoChange.get(files[i])!.get(files[j]) || 0) + 1);
        fileCoChange.get(files[j])!.set(files[i], (fileCoChange.get(files[j])!.get(files[i]) || 0) + 1);
      }
    }
  }

  const candidates: Array<{ path: string; details: Record<string, unknown> }> = [];

  for (const [file, coChanges] of fileCoChange) {
    const parts = file.split('/');
    const fileName = parts.pop() || '';
    const dir = parts.join('/');

    const partners = [...coChanges.entries()]
      .filter(([other]) => {
        const otherParts = other.split('/');
        const otherName = otherParts.pop() || '';
        const otherDir = otherParts.join('/');
        return otherDir !== dir && otherName.replace(/\.[^.]+$/, '') === fileName.replace(/\.[^.]+$/, '');
      })
      .sort((a, b) => b[1] - a[1]);

    if (partners.length > 0 && partners[0][1] >= 2) {
      candidates.push({
        path: file,
        details: {
          parallelFiles: partners.map(([p, n]) => `${p} (${n}x)`).slice(0, 5).join(', '),
          coChangeCount: partners.length,
        },
      });
    }
  }

  if (candidates.length === 0) {
    return { type: 'parallel-inheritance', severity: 'low', description: 'No parallel inheritance hierarchies detected', files: [] };
  }

  const severity = candidates.length > 10 ? 'critical' : candidates.length > 5 ? 'high' : 'medium';

  return {
    type: 'parallel-inheritance',
    severity,
    description: `Found ${candidates.length} file(s) with corresponding files in different directories that always change together — suggesting parallel hierarchies that must be extended in lockstep`,
    files: candidates.slice(0, 15),
  };
}
