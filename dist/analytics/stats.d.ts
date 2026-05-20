import { Commit, FileMetrics, StatsResult } from '../types.js';
export declare function detectLanguage(filePath: string): string;
export declare function computeStats(commits: Commit[]): StatsResult;
export declare function getFileMetrics(commits: Commit[]): Map<string, FileMetrics>;
//# sourceMappingURL=stats.d.ts.map