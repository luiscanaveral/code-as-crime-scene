import { readGitLog } from './git/reader.js';
import { computeStats } from './analytics/stats.js';
import { detectAntiPatterns } from './antipatterns/index.js';
import { runStaticAnalysis } from './static-analysis/analyzer.js';
import { detectTypos } from './typos/detector.js';
import { generateMarkdownReport } from './report/generator.js';
import { loadGitignore } from './utils/ignore.js';
import { generateCodeViz } from './codeviz/index.js';
import { Options, Report } from './types.js';

const EXCLUDED_DIRS = ['node_modules', 'dist', '.git', '.next', 'build', '.venv', 'venv', '__pycache__', '.tox'];

export async function analyze(options: Options = {}): Promise<Report> {
  const { commits, branch, repoUrl } = readGitLog(options);
  const repoPath = options.repoPath || process.cwd();

  const isIgnored = loadGitignore(repoPath);
  const isExcludedDir = (path: string) =>
    EXCLUDED_DIRS.some(dir => path.startsWith(`${dir}/`) || path.includes(`/${dir}/`));

  const filteredCommits = commits.map(commit => ({
    ...commit,
    files: commit.files.filter(f => !isIgnored(f.path) && !isExcludedDir(f.path)),
  }));

  const stats = computeStats(filteredCommits, repoPath);
  const antipatterns = detectAntiPatterns(filteredCommits, repoPath);
  const staticAnalysis = runStaticAnalysis(filteredCommits, repoPath);
  const typos = detectTypos(filteredCommits, repoPath);

  const repoName = repoUrl.split('/').pop()?.replace('.git', '') || 'code-as-crime-scene';

  const allFiles = new Set<string>();
  const fileExtensions = new Set<string>();
  for (const commit of filteredCommits) {
    for (const file of commit.files) {
      allFiles.add(file.path);
      const ext = file.path.split('.').pop()?.toLowerCase();
      if (ext) fileExtensions.add('.' + ext);
    }
  }

  const codeViz = generateCodeViz(
    [...allFiles],
    stats.churnByFile,
    repoPath,
    repoName,
  );

  const report: Report = {
    title: `Code Crime Scene Report: ${repoName}`,
    date: new Date(),
    repository: repoUrl,
    branch,
    stats,
    antipatterns,
    staticAnalysis,
    typos,
    codeViz,
    fileExtensions: [...fileExtensions],
  };

  return report;
}

export async function generateReport(options: Options = {}): Promise<string> {
  const report = await analyze(options);
  return generateMarkdownReport(report);
}

export { readGitLog } from './git/reader.js';
export { computeStats, detectLanguage } from './analytics/stats.js';
export { detectAntiPatterns } from './antipatterns/index.js';
export { runStaticAnalysis } from './static-analysis/analyzer.js';
export { detectTypos } from './typos/detector.js';
export { generateMarkdownReport } from './report/generator.js';
export { generateCodeViz } from './codeviz/index.js';
export * from './types.js';
