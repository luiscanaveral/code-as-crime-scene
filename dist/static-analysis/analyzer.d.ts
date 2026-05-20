import { Commit, StaticAnalysisResult, AnalysisIssue } from '../types.js';
export declare function analyzeFileContent(filePath: string, language: string): AnalysisIssue[];
export declare function runStaticAnalysis(commits: Commit[], repoPath?: string): StaticAnalysisResult[];
//# sourceMappingURL=analyzer.d.ts.map