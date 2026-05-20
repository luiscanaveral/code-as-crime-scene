import { readGitLog } from './git/reader.js';
import { computeStats } from './analytics/stats.js';
import { detectAntiPatterns } from './antipatterns/index.js';
import { runStaticAnalysis } from './static-analysis/analyzer.js';
import { detectTypos } from './typos/detector.js';
import { generateMarkdownReport } from './report/generator.js';
export async function analyze(options = {}) {
    const { commits, branch, repoUrl } = readGitLog(options);
    const repoPath = options.repoPath || process.cwd();
    const stats = computeStats(commits);
    const antipatterns = detectAntiPatterns(commits);
    const staticAnalysis = runStaticAnalysis(commits, repoPath);
    const typos = detectTypos(commits, repoPath);
    const repoName = repoUrl.split('/').pop()?.replace('.git', '') || 'code-as-crime-scene';
    const report = {
        title: `Code Crime Scene Report: ${repoName}`,
        date: new Date(),
        repository: repoUrl,
        branch,
        stats,
        antipatterns,
        staticAnalysis,
        typos,
    };
    return report;
}
export async function generateReport(options = {}) {
    const report = await analyze(options);
    return generateMarkdownReport(report);
}
export { readGitLog } from './git/reader.js';
export { computeStats, detectLanguage } from './analytics/stats.js';
export { detectAntiPatterns } from './antipatterns/index.js';
export { runStaticAnalysis } from './static-analysis/analyzer.js';
export { detectTypos } from './typos/detector.js';
export { generateMarkdownReport } from './report/generator.js';
export * from './types.js';
//# sourceMappingURL=index.js.map