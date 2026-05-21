import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { Commit, AntiPatternResult } from '../types.js';

export function detectLavaFlow(commits: Commit[], repoPath: string): AntiPatternResult {
  const analyzed = new Set<string>();
  const candidates: Array<{ path: string; details: Record<string, unknown> }> = [];

  for (const commit of commits) {
    for (const file of commit.files) {
      if (analyzed.has(file.path)) continue;
      analyzed.add(file.path);

      const ext = file.path.split('.').pop()?.toLowerCase();
      if (!ext || !['ts', 'tsx', 'js', 'jsx', 'py', 'java', 'cs', 'php', 'rb', 'kt', 'go', 'rs', 'c', 'cpp', 'h', 'hpp', 'css', 'scss', 'html'].includes(ext)) continue;

      const fullPath = join(repoPath, file.path);
      if (!existsSync(fullPath)) continue;

      try {
        const content = readFileSync(fullPath, 'utf-8');
        const lines = content.split('\n');

        let commentedCode = 0;
        let deadCodeMarkers = 0;
        let deprecationMarkers = 0;
        const commentLineThreshold = 3;

        let consecutiveComments = 0;
        for (const line of lines) {
          const trimmed = line.trim();

          if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*') || trimmed.startsWith('#') || trimmed.startsWith('<!--')) {
            consecutiveComments++;
            if (consecutiveComments >= commentLineThreshold) {
              const codeLike = /\b(?:function|class|if|for|while|return|import|export|const|let|var)\b/i.test(trimmed);
              if (codeLike) commentedCode++;
            }
          } else if (trimmed.startsWith('*/') || trimmed.endsWith('*/')) {
            consecutiveComments++;
          } else {
            consecutiveComments = 0;
          }
        }

        deadCodeMarkers = (content.match(/\b(?:TODO\s*:\s*remove|FIXME|HACK|XXX|@deprecated|DEPRECATED|dead.code|unused|obsolete|legacy)\b/gi) || []).length;
        deprecationMarkers = (content.match(/\@deprecated|\bdeprecated\b/gi) || []).length;

        const totalFlags = commentedCode + deadCodeMarkers;
        if (totalFlags > 0) {
          candidates.push({
            path: file.path,
            details: {
              lavaFlowScore: totalFlags,
              commentedOutCode: commentedCode,
              deadCodeMarkers: deadCodeMarkers,
              deprecationMarkers,
            },
          });
        }
      } catch {}
    }
  }

  if (candidates.length === 0) {
    return { type: 'lava-flow', severity: 'low', description: 'No lava flow patterns detected', files: [] };
  }

  candidates.sort((a, b) => (b.details.lavaFlowScore as number) - (a.details.lavaFlowScore as number));

  const totalScore = candidates.reduce((s, c) => s + (c.details.lavaFlowScore as number), 0);
  const severity = totalScore > 50 ? 'critical' : totalScore > 20 ? 'high' : 'medium';

  return {
    type: 'lava-flow',
    severity,
    description: `Found ${candidates.length} file(s) with commented-out code, dead code markers, or deprecation annotations — leftover artifacts that increase maintenance burden`,
    files: candidates.slice(0, 15),
  };
}
