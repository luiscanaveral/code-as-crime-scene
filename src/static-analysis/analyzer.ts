import { readFileSync, existsSync } from 'node:fs';
import { Commit, StaticAnalysisResult, AnalysisIssue, Severity } from '../types.js';
import { detectLanguage } from '../analytics/stats.js';

const EXCLUDED_DIRS = ['node_modules', 'dist', '.git', '.next', 'build', '.venv', 'venv', '__pycache__', '.tox'];

interface LanguageRule {
  type: string;
  pattern: RegExp;
  message: string;
  severity: Severity;
}

const LANGUAGE_RULES: Record<string, LanguageRule[]> = {
  TypeScript: [
    { type: 'any', pattern: /any/, message: 'Usage of `any` type — consider using `unknown` or a proper type', severity: 'medium' },
    { type: 'todo', pattern: /\/\/\s*(TODO|FIXME|HACK|XXX)\b/i, message: 'Code contains TODO/FIXME/HACK comment', severity: 'low' },
    { type: 'console', pattern: /console\.(log|debug|info|warn|error)\(/, message: 'Console statement left in code', severity: 'low' },
    { type: 'long-function', pattern: /function\s+\w+\s*\([^)]*\)\s*\{[^}]*\{[^}]*\{[^}]*\{/, message: 'Deeply nested function — may need refactoring', severity: 'medium' },
    { type: 'nested-callback', pattern: /\.then\(.*\.then\(/, message: 'Nested .then() — consider async/await', severity: 'medium' },
    { type: 'non-null', pattern: /!/, message: 'Non-null assertion operator used', severity: 'low' },
  ],
  JavaScript: [
    { type: 'todo', pattern: /\/\/\s*(TODO|FIXME|HACK|XXX)\b/i, message: 'Code contains TODO/FIXME/HACK comment', severity: 'low' },
    { type: 'console', pattern: /console\.(log|debug|info|warn|error)\(/, message: 'Console statement left in code', severity: 'low' },
    { type: 'var', pattern: /\bvar\s+\w+/, message: 'Usage of `var` — prefer `const` or `let`', severity: 'low' },
    { type: 'nested-callback', pattern: /\.then\(.*\.then\(/, message: 'Nested .then() — consider async/await', severity: 'medium' },
    { type: 'long-function', pattern: /function\s+\w+\s*\([^)]*\)\s*\{[^}]*\{[^}]*\{[^}]*\{/, message: 'Deeply nested function — may need refactoring', severity: 'medium' },
    { type: 'eqeq', pattern: /==[^=]|!=([^=]|$)/, message: 'Usage of == instead of ===', severity: 'medium' },
  ],
  Java: [
    { type: 'todo', pattern: /\/\/\s*(TODO|FIXME|HACK|XXX)\b/i, message: 'Code contains TODO/FIXME/HACK comment', severity: 'low' },
    { type: 'system-out', pattern: /System\.(out|err)\.(print|println|printf)\(/, message: 'System.out/err used — use a logger instead', severity: 'low' },
    { type: 'null-check', pattern: /\bnull\b/, message: 'Explicit null reference — consider Optional', severity: 'low' },
    { type: 'raw-type', pattern: /(List|Map|Set|ArrayList|HashMap)\s*[^<]/, message: 'Raw type usage — specify generic type parameter', severity: 'medium' },
    { type: 'exception', pattern: /catch\s*\(\s*\w+\s+\)/, message: 'Exception variable name too generic', severity: 'low' },
  ],
  Python: [
    { type: 'todo', pattern: /#\s*(TODO|FIXME|HACK|XXX)\b/i, message: 'Code contains TODO/FIXME/HACK comment', severity: 'low' },
    { type: 'print', pattern: /print\(/, message: 'print() statement left in code — use logging', severity: 'low' },
    { type: 'bare-except', pattern: /except\s*:/, message: 'Bare except clause — catches all exceptions', severity: 'high' },
    { type: 'wildcard-import', pattern: /from\s+\w+\s+import\s+\*/, message: 'Wildcard import — unclear namespace', severity: 'medium' },
    { type: 'mutable-default', pattern: /def\s+\w+\s*\([^)]*=\s*(\[|\{)/, message: 'Mutable default argument — can cause unexpected behavior', severity: 'high' },
    { type: 'global', pattern: /\bglobal\b/, message: 'Usage of global — indicates poor encapsulation', severity: 'medium' },
  ],
  'C#': [
    { type: 'todo', pattern: /\/\/\s*(TODO|FIXME|HACK|XXX)\b/i, message: 'Code contains TODO/FIXME/HACK comment', severity: 'low' },
    { type: 'console', pattern: /Console\.(WriteLine|Write|Debug)\(/, message: 'Console output in code — use logging', severity: 'low' },
    { type: 'var-any', pattern: /\bvar\b/, message: 'Usage of `var` — consider explicit type', severity: 'low' },
    { type: 'null-forgiving', pattern: /!/, message: 'Null-forgiving operator — possible null reference', severity: 'medium' },
    { type: 'exception', pattern: /catch\s*\(\s*\)/, message: 'Empty catch block — silently swallows exceptions', severity: 'high' },
  ],
  Go: [
    { type: 'todo', pattern: /\/\/\s*(TODO|FIXME|HACK|XXX)\b/i, message: 'Code contains TODO/FIXME/HACK comment', severity: 'low' },
    { type: 'panic', pattern: /\bpanic\(/, message: 'panic() used — consider error return', severity: 'high' },
    { type: 'print', pattern: /fmt\.(Print|Println|Printf)\(/, message: 'fmt.Print* used — consider structured logging', severity: 'low' },
    { type: 'naked-return', pattern: /func\s+\w+.*\)\s+\([^)]+\)\s*\{[^}]*\breturn\b(?!\s+\w)/, message: 'Naked return — can reduce readability', severity: 'low' },
  ],
  Ruby: [
    { type: 'todo', pattern: /#\s*(TODO|FIXME|HACK|XXX)\b/i, message: 'Code contains TODO/FIXME/HACK comment', severity: 'low' },
    { type: 'puts', pattern: /\bputs?\s/, message: 'puts/print left in code — use logger', severity: 'low' },
    { type: 'rescue', pattern: /rescue\s*$/, message: 'Bare rescue clause', severity: 'high' },
  ],
};

export function analyzeFileContent(filePath: string, language: string): AnalysisIssue[] {
  const issues: AnalysisIssue[] = [];
  const rules = LANGUAGE_RULES[language] || [];

  if (!existsSync(filePath)) return issues;

  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  for (const rule of rules) {
    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(rule.pattern);
      if (match) {
        issues.push({
          type: rule.type,
          line: i + 1,
          column: (match.index || 0) + 1,
          message: rule.message,
          severity: rule.severity,
        });
      }
    }
  }

  return issues;
}

export function runStaticAnalysis(commits: Commit[], repoPath: string = process.cwd()): StaticAnalysisResult[] {
  const results: StaticAnalysisResult[] = [];
  const analyzedFiles = new Set<string>();

  for (const commit of commits) {
    for (const file of commit.files) {
      if (analyzedFiles.has(file.path)) continue;
      if (EXCLUDED_DIRS.some(dir => file.path.startsWith(`${dir}/`) || file.path.includes(`/${dir}/`))) continue;
      analyzedFiles.add(file.path);

      const fullPath = `${repoPath}/${file.path}`;
      const language = detectLanguage(file.path);
      const rules = LANGUAGE_RULES[language];
      if (!rules) continue;

      const issues = analyzeFileContent(fullPath, language);
      if (issues.length > 0) {
        results.push({ file: file.path, language, issues });
      }
    }
  }

  results.sort((a, b) => b.issues.length - a.issues.length);
  return results;
}
