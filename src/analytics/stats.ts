import { Commit, FileMetrics, StatsResult } from '../types.js';

const EXTENSION_LANGUAGE_MAP: Record<string, string> = {
  ts: 'TypeScript',
  tsx: 'TypeScript React',
  js: 'JavaScript',
  jsx: 'JavaScript React',
  py: 'Python',
  java: 'Java',
  cs: 'C#',
  vb: 'VB.NET',
  fs: 'F#',
  go: 'Go',
  rs: 'Rust',
  rb: 'Ruby',
  php: 'PHP',
  swift: 'Swift',
  kt: 'Kotlin',
  scala: 'Scala',
  c: 'C',
  h: 'C Header',
  cpp: 'C++',
  hpp: 'C++ Header',
  cc: 'C++',
  hh: 'C++ Header',
  css: 'CSS',
  scss: 'SCSS',
  less: 'Less',
  html: 'HTML',
  htm: 'HTML',
  xml: 'XML',
  json: 'JSON',
  yaml: 'YAML',
  yml: 'YAML',
  md: 'Markdown',
  sql: 'SQL',
  sh: 'Shell',
  bash: 'Shell',
  zsh: 'Shell',
  dockerfile: 'Docker',
  tf: 'Terraform',
  vue: 'Vue',
  svelte: 'Svelte',
  dart: 'Dart',
  lua: 'Lua',
  r: 'R',
  pl: 'Perl',
  pm: 'Perl',
};

export function detectLanguage(filePath: string): string {
  const filename = filePath.split('/').pop()?.toLowerCase() || '';
  if (filename === 'dockerfile') return 'Docker';
  const ext = filePath.split('.').pop()?.toLowerCase() || '';
  return EXTENSION_LANGUAGE_MAP[ext] || ext.toUpperCase() || 'Unknown';
}

export function computeStats(commits: Commit[]): StatsResult {
  const fileMetrics = getFileMetrics(commits);
  const totalFiles = fileMetrics.size;
  const totalLines = Array.from(fileMetrics.values()).reduce((sum, f) => sum + f.linesOfCode, 0);
  const totalCommits = commits.length;

  const authors = new Set<string>();
  const commitsByAuthor: Record<string, number> = {};
  const linesByLanguage: Record<string, number> = {};
  const filesByLanguage: Record<string, number> = {};
  const churnByFile: Record<string, number> = {};
  const seenFiles = new Set<string>();

  for (const commit of commits) {
    authors.add(commit.author);
    commitsByAuthor[commit.author] = (commitsByAuthor[commit.author] || 0) + 1;

    for (const file of commit.files) {
      if (!seenFiles.has(file.path)) {
        seenFiles.add(file.path);
        const lang = detectLanguage(file.path);
        filesByLanguage[lang] = (filesByLanguage[lang] || 0) + 1;
      }

      const lang = detectLanguage(file.path);
      linesByLanguage[lang] = (linesByLanguage[lang] || 0) + file.insertions;

      churnByFile[file.path] = (churnByFile[file.path] || 0) + file.insertions + file.deletions;
    }
  }

  const totalAuthors = authors.size;
  const estimatedHours = estimateHours(commits);

  return {
    totalFiles,
    totalLines,
    totalCommits,
    totalAuthors,
    estimatedHours,
    linesByLanguage,
    commitsByAuthor,
    filesByLanguage,
    churnByFile,
  };
}

export function getFileMetrics(commits: Commit[]): Map<string, FileMetrics> {
  const fileMap = new Map<string, FileMetrics>();

  for (const commit of commits) {
    for (const file of commit.files) {
      if (!fileMap.has(file.path)) {
        fileMap.set(file.path, {
          path: file.path,
          totalCommits: 0,
          uniqueAuthors: 0,
          insertions: 0,
          deletions: 0,
          churn: 0,
          commitMessages: [],
          linesOfCode: 0,
          language: detectLanguage(file.path),
        });
      }

      const meta = fileMap.get(file.path)!;
      meta.totalCommits++;
      meta.insertions += file.insertions;
      meta.deletions += file.deletions;
      meta.churn += file.insertions + file.deletions;
      meta.commitMessages.push(commit.message.split('\n')[0]);
    }
  }

  return fileMap;
}

function estimateHours(commits: Commit[]): number {
  if (commits.length === 0) return 0;

  const hoursPerCommit = 1.5;
  const baseHours = commits.length * hoursPerCommit;

  const totalChurn = commits.reduce((sum, c) => {
    return sum + c.files.reduce((s, f) => s + f.insertions + f.deletions, 0);
  }, 0);

  const churnHours = totalChurn * 0.02;

  return Math.round((baseHours + churnHours) * 10) / 10;
}
