import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { Commit, AntiPatternResult } from '../types.js';

const SECRET_PATTERNS: [string, RegExp][] = [
  ['API Key', /(?:api[_-]?key|apikey|api_key)\s*[=:]\s*['"][A-Za-z0-9_\-]{16,}['"]/i],
  ['Password', /(?:password|pwd|passwd|secret)\s*[=:]\s*['"][^'"]{6,}['"]/i],
  ['Token', /(?:token|auth_token|access_token|bearer)\s*[=:]\s*['"][A-Za-z0-9_\-\.]{16,}['"]/i],
  ['JWT', /eyJ[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}/],
  ['AWS Key', /(?:AKIA|ASIA)[A-Z0-9]{16}/],
  ['Private Key', /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----/],
  ['Connection String', /(?:mongodb|postgres|mysql|redis|amqp):\/\/[^@]+@/i],
  ['Slack Token', /xox[abp]\-[A-Za-z0-9\-]{10,}/],
  ['SSH Key', /ssh-rsa\s+A-Za-z0-9+\/=]{20,}/],
  ['OAuth', /(?:client_secret|client_secret|oauth)[=:]\s*['"][A-Za-z0-9_\-]{8,}['"]/i],
];

export function detectHardcodedSecrets(commits: Commit[], repoPath: string): AntiPatternResult {
  const analyzed = new Set<string>();
  const candidates: Array<{ path: string; details: Record<string, unknown> }> = [];

  for (const commit of commits) {
    for (const file of commit.files) {
      if (analyzed.has(file.path)) continue;
      analyzed.add(file.path);

      if (file.path.includes('node_modules') || file.path.includes('.git')) continue;

      const ext = file.path.split('.').pop()?.toLowerCase();
      if (!ext || !['ts', 'tsx', 'js', 'jsx', 'py', 'java', 'cs', 'rb', 'php', 'kt', 'go', 'rs', 'c', 'cpp', 'h', 'yaml', 'yml', 'json', 'toml', 'ini', 'cfg', 'conf', 'env', 'sh', 'bash', 'zsh', 'yml', 'yaml'].includes(ext)) continue;

      const fullPath = join(repoPath, file.path);
      if (!existsSync(fullPath)) continue;

      try {
        const content = readFileSync(fullPath, 'utf-8');
        const findings: string[] = [];

        for (const [name, pattern] of SECRET_PATTERNS) {
          const matches = content.match(pattern);
          if (matches) {
            findings.push(`${name} (${matches.length}x)`);
          }
        }

        if (findings.length > 0) {
          candidates.push({
            path: file.path,
            details: {
              secretCount: findings.length,
              types: findings.slice(0, 5).join(', '),
            },
          });
        }
      } catch {}
    }
  }

  if (candidates.length === 0) {
    return { type: 'hardcoded-secrets', severity: 'low', description: 'No hardcoded secrets detected', files: [] };
  }

  const severity = candidates.some(c => (c.details.secretCount as number) >= 2) ? 'critical' : 'high';

  return {
    type: 'hardcoded-secrets',
    severity,
    description: `Found ${candidates.length} file(s) with potential hardcoded secrets — these should be in environment variables or a secrets manager`,
    files: candidates,
  };
}
