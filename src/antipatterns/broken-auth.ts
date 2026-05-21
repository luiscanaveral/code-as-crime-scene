import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { Commit, AntiPatternResult } from '../types.js';

export function detectBrokenAuth(commits: Commit[], repoPath: string): AntiPatternResult {
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
        const lines = content.split('\n');

        let routesFound = 0;
        let authProtected = 0;
        let authMarkers = 0;

        const routePatterns = [
          /\b(?:router|route|app|server)\.(?:get|post|put|delete|patch|all)\s*\(\s*['"]/g,
          /\b(?:@Get|@Post|@Put|@Delete|@Patch)\b/g,
          /\b(?:def|function)\s+\w+\s*\([^)]*request[^)]*\)/g,
        ];

        const authPatterns = [
          /\b(?:authenticate|authorize|requireAuth|isAuthenticated|verifyToken|checkAuth|authMiddleware)\b/gi,
          /\b(?:@Authenticated|@Authorized|@Secured|@RequiresAuth)\b/g,
          /\b(?:passport\.authenticate|jwt\.verify|verifyIdToken|validateSession)\b/g,
          /\b(?:guard|canActivate|hasRole|hasPermission)\b/gi,
          /\b(?:req\.user|request\.user|context\.identity|context\.user)\b/g,
        ];

        for (const pattern of routePatterns) {
          const matches = content.match(pattern);
          if (matches) routesFound += matches.length;
        }

        for (const pattern of authPatterns) {
          const matches = content.match(pattern);
          if (matches) {
            authMarkers += matches.length;
            authProtected += matches.length;
          }
        }

        if (routesFound > 0 && authProtected === 0) {
          candidates.push({
            path: file.path,
            details: {
              routesEndpoints: routesFound,
              authChecks: 0,
              issue: 'Endpoints found without any authentication',
            },
          });
        } else if (routesFound > 0 && authProtected < routesFound / 2) {
          candidates.push({
            path: file.path,
            details: {
              routesEndpoints: routesFound,
              authChecks: authProtected,
              coverage: `${Math.round((authProtected / routesFound) * 100)}%`,
            },
          });
        }
      } catch {}
    }
  }

  if (candidates.length === 0) {
    return { type: 'broken-auth', severity: 'low', description: 'No broken authorization boundaries detected', files: [] };
  }

  const unprotected = candidates.filter(c => (c.details.authChecks as number) === 0);
  const severity = unprotected.length > 0 ? 'critical' : 'high';

  return {
    type: 'broken-auth',
    severity,
    description: `Found ${candidates.length} file(s) with routes/endpoints that lack authorization checks — potential broken access control`,
    files: candidates.slice(0, 15),
  };
}
