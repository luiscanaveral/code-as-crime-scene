import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { Commit, AntiPatternResult } from '../types.js';

export function detectTrustingClientInput(commits: Commit[], repoPath: string): AntiPatternResult {
  const analyzed = new Set<string>();
  const candidates: Array<{ path: string; details: Record<string, unknown> }> = [];

  for (const commit of commits) {
    for (const file of commit.files) {
      if (analyzed.has(file.path)) continue;
      analyzed.add(file.path);

      const ext = file.path.split('.').pop()?.toLowerCase();
      if (!ext || !['ts', 'tsx', 'js', 'jsx', 'py', 'java', 'cs', 'php', 'rb', 'kt', 'go'].includes(ext)) continue;

      const fullPath = join(repoPath, file.path);
      if (!existsSync(fullPath)) continue;

      try {
        const content = readFileSync(fullPath, 'utf-8');
        let riskCount = 0;
        const risks: string[] = [];

        const unsafePatterns: [string, RegExp][] = [
          ['query params direct', /\b(?:req\.query|request\.query|params\[|query\[)\b/i],
          ['body direct', /\b(?:req\.body|request\.body)\b/i],
          ['eval usage', /\beval\s*\(/i],
          ['innerHTML', /\.innerHTML\s*=/],
          ['sql concat', /`[^`]*\$\{[^}]*\}[^`]*(?:SELECT|INSERT|UPDATE|DELETE|DROP|CREATE)/gi],
          ['sql concat 2', /['"]\s*\+\s*['"]*(?:SELECT|INSERT|UPDATE|DELETE|DROP)/gi],
          ['nosql injection', /\$\s*where\s*:/i],
          ['path traversal', /\b(?:req\.files|upload|file\s*=\s*req)/i],
          ['no validation', /\b(?:req|request|ctx|context)\.(?:body|query|params)\b[^;]*?(?!\.(?:validate|sanitize|escape))/gi],
        ];

        const hasValidator = /\b(?:validate|sanitize|z\.|yup\.|joi\.|class-validator|express-validator|assert|check\s*\(|body\s*\()/i.test(content);

        for (const [name, pattern] of unsafePatterns) {
          const matches = content.match(pattern);
          if (matches) {
            if (!hasValidator || name === 'eval usage' || name === 'innerHTML') {
              riskCount += matches.length;
              risks.push(name);
            }
          }
        }

        if (riskCount > 0) {
          candidates.push({
            path: file.path,
            details: {
              riskCount,
              risks: [...new Set(risks)].slice(0, 5).join(', '),
              hasInputValidation: hasValidator,
            },
          });
        }
      } catch {}
    }
  }

  if (candidates.length === 0) {
    return { type: 'trusting-client-input', severity: 'low', description: 'No trusting client input detected', files: [] };
  }

  candidates.sort((a, b) => (b.details.riskCount as number) - (a.details.riskCount as number));

  const noValidation = candidates.filter(c => !c.details.hasInputValidation);
  const severity = noValidation.length > candidates.length / 2 ? 'critical' : 'high';

  return {
    type: 'trusting-client-input',
    severity,
    description: `Found ${candidates.length} file(s) using client input without proper validation — potential injection, XSS, or path traversal vulnerabilities`,
    files: candidates.slice(0, 15),
  };
}
