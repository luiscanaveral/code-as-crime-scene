export interface Commit {
    hash: string;
    author: string;
    email: string;
    date: Date;
    message: string;
    files: CommitFile[];
}
export interface CommitFile {
    path: string;
    insertions: number;
    deletions: number;
    changeType: 'added' | 'modified' | 'deleted' | 'renamed';
}
export interface FileMetrics {
    path: string;
    totalCommits: number;
    uniqueAuthors: number;
    insertions: number;
    deletions: number;
    churn: number;
    commitMessages: string[];
    linesOfCode: number;
    language: string;
}
export type Severity = 'low' | 'medium' | 'high' | 'critical';
export interface AntiPatternResult {
    type: string;
    severity: Severity;
    description: string;
    files: Array<{
        path: string;
        details?: Record<string, unknown>;
    }>;
}
export interface TypoResult {
    file: string;
    line: number;
    column: number;
    typo: string;
    suggestion: string;
    context: string;
}
export interface AnalysisIssue {
    type: string;
    line: number;
    column: number;
    message: string;
    severity: Severity;
}
export interface StaticAnalysisResult {
    file: string;
    language: string;
    issues: AnalysisIssue[];
}
export interface StatsResult {
    totalFiles: number;
    totalLines: number;
    totalCommits: number;
    totalAuthors: number;
    estimatedHours: number;
    linesByLanguage: Record<string, number>;
    commitsByAuthor: Record<string, number>;
    filesByLanguage: Record<string, number>;
    churnByFile: Record<string, number>;
}
export interface Report {
    title: string;
    date: Date;
    repository: string;
    branch: string;
    stats: StatsResult;
    antipatterns: AntiPatternResult[];
    staticAnalysis: StaticAnalysisResult[];
    typos: TypoResult[];
}
export interface Options {
    repoPath?: string;
    maxCommits?: number;
    since?: string;
    until?: string;
    language?: string;
    verbose?: boolean;
}
//# sourceMappingURL=types.d.ts.map