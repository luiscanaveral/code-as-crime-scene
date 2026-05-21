import { Report, AntiPatternResult, StaticAnalysisResult, TypoResult, StatsResult, CodeVizResult } from '../types.js';

const ANTIPATTERN_REQUIREMENTS: Record<string, string[]> = {
  'fat-controller': ['.ts', '.js', '.py', '.java', '.cs', '.php', '.rb', '.kt', '.go', '.rs', '.c', '.cpp', '.h', '.hpp', '.cc'],
  'supernova': [],
  'god-class': ['.ts', '.js', '.py', '.java', '.cs', '.php', '.rb', '.kt', '.go', '.rs', '.c', '.cpp', '.h', '.hpp', '.cc'],
  'shotgun-surgery': [],
  'divergent-change': [],
  'blob-architecture': [],
  'anemic-domain-model': ['.ts', '.js', '.py', '.java', '.cs', '.php', '.rb', '.kt'],
  'service-locator': ['.ts', '.js', '.py', '.java', '.cs', '.php', '.rb', '.kt', '.go', '.rs'],
  'spaghetti-code': ['.ts', '.tsx', '.js', '.jsx', '.py', '.java', '.cs', '.php', '.rb', '.kt', '.go', '.rs', '.c', '.cpp', '.h', '.hpp'],
  'lava-flow': ['.ts', '.tsx', '.js', '.jsx', '.py', '.java', '.cs', '.php', '.rb', '.kt', '.go', '.rs', '.c', '.cpp', '.h', '.hpp', '.css', '.scss', '.html'],
  'golden-hammer': ['.ts', '.tsx', '.js', '.jsx', '.py', '.java', '.cs', '.php', '.rb', '.kt', '.go'],
  'singleton-abuse': ['.ts', '.js', '.java', '.cs', '.php', '.rb', '.kt'],
  'feature-envy': ['.ts', '.tsx', '.js', '.jsx', '.java', '.cs', '.php', '.rb', '.kt'],
  'refused-bequest': ['.ts', '.tsx', '.js', '.jsx', '.java', '.cs', '.php', '.rb', '.kt'],
  'parallel-inheritance': [],
  'object-cesspool': ['.ts', '.tsx', '.js', '.jsx', '.java', '.cs', '.php', '.rb', '.kt'],
  'massive-component': ['.tsx', '.jsx', '.vue', '.svelte'],
  'prop-drilling': ['.tsx', '.jsx', '.vue', '.svelte'],
  'global-state-abuse': ['.ts', '.tsx', '.js', '.jsx', '.vue', '.svelte'],
  'callback-hell': ['.ts', '.tsx', '.js', '.jsx'],
  'hardcoded-secrets': ['.ts', '.tsx', '.js', '.jsx', '.py', '.java', '.cs', '.rb', '.php', '.kt', '.go', '.rs', '.c', '.cpp', '.h', '.yaml', '.yml', '.json', '.toml', '.ini', '.cfg', '.conf', '.env', '.sh', '.bash', '.zsh'],
  'broken-auth': ['.ts', '.tsx', '.js', '.jsx', '.py', '.java', '.cs', '.php', '.rb', '.kt', '.go'],
  'trusting-client-input': ['.ts', '.tsx', '.js', '.jsx', '.py', '.java', '.cs', '.php', '.rb', '.kt', '.go'],
  'cyclic-dependencies': ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.mts', '.cts'],
};

export function generateMarkdownReport(report: Report): string {
  const lines: string[] = [];

  lines.push(`# ${report.title}`);
  lines.push('');
  lines.push(`**Repository:** \`${report.repository}\``);
  lines.push(`**Branch:** \`${report.branch}\``);
  lines.push(`**Analysis Date:** ${report.date.toISOString().split('T')[0]}`);
  lines.push('');
  lines.push('---');
  lines.push('');

  lines.push(...generateStatsSection(report.stats));
  lines.push(...generateAntiPatternsSection(report.antipatterns, report.fileExtensions));
  lines.push(...generateStaticAnalysisSection(report.staticAnalysis));
  lines.push(...generateTyposSection(report.typos));
  lines.push(...generateCodeVizSection(report.codeViz));

  return lines.join('\n');
}

function generateStatsSection(stats: StatsResult): string[] {
  const lines: string[] = [];

  lines.push('## 📊 Code Statistics');
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('|--------|-------|');
  lines.push(`| **Total Commits** | ${stats.totalCommits} |`);
  lines.push(`| **Total Files** | ${stats.totalFiles} |`);
  lines.push(`| **Total Lines of Code** | ${stats.totalLines.toLocaleString()} |`);
  lines.push(`| **Total Authors** | ${stats.totalAuthors} |`);
  lines.push(`| **Estimated Hours Worked** | ${stats.estimatedHours} |`);
  lines.push('');
  lines.push('### Lines of Code by Language');
  lines.push('');
  lines.push('| Language | Lines | Files |');
  lines.push('|----------|-------|-------|');
  const sortedLangs = Object.entries(stats.linesByLanguage)
    .sort((a, b) => b[1] - a[1]);
  for (const [lang, linesCount] of sortedLangs) {
    const filesCount = stats.filesByLanguage[lang] || 0;
    lines.push(`| ${lang} | ${linesCount.toLocaleString()} | ${filesCount} |`);
  }
  lines.push('');
  lines.push('### Commits by Author');
  lines.push('');
  lines.push('| Author | Commits |');
  lines.push('|--------|---------|');
  const sortedAuthors = Object.entries(stats.commitsByAuthor)
    .sort((a, b) => b[1] - a[1]);
  for (const [author, count] of sortedAuthors) {
    lines.push(`| ${author} | ${count} |`);
  }
  lines.push('');

  lines.push('### Top 10 Files by Churn');
  lines.push('');
  lines.push('| File | Churn |');
  lines.push('|------|-------|');
  const sortedChurn = Object.entries(stats.churnByFile)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  for (const [file, churn] of sortedChurn) {
    lines.push(`| \`${file}\` | ${churn.toLocaleString()} |`);
  }
  lines.push('');

  return lines;
}

function generateAntiPatternsSection(antipatterns: AntiPatternResult[], fileExtensions: string[]): string[] {
  const lines: string[] = [];

  lines.push('## 🔍 Anti-Pattern Analysis');
  lines.push('');

  const extSet = new Set(fileExtensions);
  const statusRows: Array<{ name: string; status: string }> = [];

  for (const ap of antipatterns) {
    const name = formatAntiPatternName(ap.type);
    const required = ANTIPATTERN_REQUIREMENTS[ap.type] || [];

    let status: string;
    if (ap.files.length > 0) {
      status = '❌ Fail';
    } else if (required.length > 0 && !required.some(r => extSet.has(r))) {
      status = '⏭️ Ignored';
    } else {
      status = '✅ Pass';
    }

    statusRows.push({ name, status });
  }

  const grouped = new Map<string, { name: string; status: string }[]>();
  for (const row of statusRows) {
    const key = row.status;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(row);
  }

  lines.push('| Status | Pattern |');
  lines.push('|--------|---------|');
  for (const [status, items] of grouped) {
    for (const item of items) {
      lines.push(`| ${status} | ${item.name} |`);
    }
  }
  lines.push('');

  const failed = antipatterns.filter(ap => ap.files.length > 0);
  if (failed.length === 0) {
    return lines;
  }

  for (const ap of failed) {
    const severityBadge = getSeverityBadge(ap.severity);
    lines.push(`### ${severityBadge} ${formatAntiPatternName(ap.type)}`);
    lines.push('');
    lines.push(`${ap.description}`);
    lines.push('');
    lines.push('| File | Details |');
    lines.push('|------|---------|');
    for (const file of ap.files) {
      const detailsStr = file.details
        ? Object.entries(file.details)
            .map(([k, v]) => `${k}: ${v}`)
            .join('<br>')
        : '-';
      lines.push(`| \`${file.path}\` | ${detailsStr} |`);
    }
    lines.push('');
  }

  return lines;
}

function generateStaticAnalysisSection(results: StaticAnalysisResult[]): string[] {
  const lines: string[] = [];

  lines.push('## ⚡ Static Analysis');
  lines.push('');

  if (results.length === 0) {
    lines.push('_No static analysis issues found._');
    lines.push('');
    return lines;
  }

  const totalIssues = results.reduce((sum, r) => sum + r.issues.length, 0);
  lines.push(`Found **${totalIssues}** issues across **${results.length}** files.`);
  lines.push('');

  for (const result of results.slice(0, 30)) {
    lines.push(`### \`${result.file}\` (${result.language})`);
    lines.push('');
    if (result.issues.length > 10) {
      lines.push(`<details>`);
      lines.push(`<summary>${result.issues.length} issues — click to expand</summary>`);
      lines.push('');
    }
    lines.push('| Line | Type | Severity | Message |');
    lines.push('|------|------|----------|---------|');
    for (const issue of result.issues) {
      const badge = getSeverityBadge(issue.severity);
      lines.push(`| ${issue.line} | \`${issue.type}\` | ${badge} | ${issue.message} |`);
    }
    if (result.issues.length > 10) {
      lines.push('');
      lines.push(`</details>`);
    }
    lines.push('');
  }

  if (results.length > 30) {
    lines.push(`_... and ${results.length - 30} more files with issues._`);
    lines.push('');
  }

  return lines;
}

function generateTyposSection(typos: TypoResult[]): string[] {
  const lines: string[] = [];

  lines.push('## ✏️ Typo Detection');
  lines.push('');

  if (typos.length === 0) {
    lines.push('_No typos detected in comments._');
    lines.push('');
    return lines;
  }

  lines.push(`Found **${typos.length}** potential typos in comments.`);
  lines.push('');
  lines.push('| File | Line | Typo | Suggestion |');
  lines.push('|------|------|------|------------|');
  for (const typo of typos.slice(0, 50)) {
    lines.push(`| \`${typo.file}\` | ${typo.line} | \`${typo.typo}\` | ${typo.suggestion} |`);
  }
  lines.push('');

  if (typos.length > 50) {
    lines.push(`_... and ${typos.length - 50} more typos._`);
    lines.push('');
  }

  return lines;
}

function generateCodeVizSection(codeViz: CodeVizResult): string[] {
  const lines: string[] = [];

  lines.push('## 🗺️ Code Visualization');
  lines.push('');
  lines.push('### Directory Structure');
  lines.push('');
  lines.push(codeViz.directoryTree);
  lines.push('');
  lines.push('### File Churn');
  lines.push('');
  lines.push(codeViz.churnChart);
  lines.push('');

  return lines;
}

function formatAntiPatternName(name: string): string {
  return name
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function getSeverityBadge(severity: string): string {
  switch (severity) {
    case 'critical': return '🔴 CRITICAL';
    case 'high': return '🟠 HIGH';
    case 'medium': return '🟡 MEDIUM';
    case 'low': return '🟢 LOW';
    default: return severity;
  }
}
