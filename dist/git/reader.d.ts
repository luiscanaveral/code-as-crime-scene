import { Commit, Options } from '../types.js';
export declare function readGitLog(options?: Options): {
    commits: Commit[];
    branch: string;
    repoUrl: string;
};
export declare function detectLanguages(commits: Commit[]): Set<string>;
//# sourceMappingURL=reader.d.ts.map