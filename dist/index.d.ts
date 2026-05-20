import { Options, Report } from './types.js';
export declare function analyze(options?: Options): Promise<Report>;
export declare function generateReport(options?: Options): Promise<string>;
export { readGitLog } from './git/reader.js';
export { computeStats, detectLanguage } from './analytics/stats.js';
export { detectAntiPatterns } from './antipatterns/index.js';
export { runStaticAnalysis } from './static-analysis/analyzer.js';
export { detectTypos } from './typos/detector.js';
export { generateMarkdownReport } from './report/generator.js';
export * from './types.js';
//# sourceMappingURL=index.d.ts.map