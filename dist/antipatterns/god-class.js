import { detectLanguage } from '../analytics/stats.js';
export function detectGodClass(commits) {
    const fileMetrics = new Map();
    for (const commit of commits) {
        for (const file of commit.files) {
            if (!fileMetrics.has(file.path)) {
                fileMetrics.set(file.path, { insertions: 0, commits: 0, authors: new Set() });
            }
            const m = fileMetrics.get(file.path);
            m.insertions += file.insertions;
            m.commits++;
            m.authors.add(commit.author);
        }
    }
    const candidates = [];
    for (const [path, metrics] of fileMetrics) {
        const lang = detectLanguage(path);
        if (!['TypeScript', 'JavaScript', 'Java', 'C#', 'Python', 'PHP', 'Ruby', 'Kotlin', 'Scala', 'Go', 'Rust', 'C++', 'C'].includes(lang))
            continue;
        if (metrics.insertions > 2000 && metrics.commits > 10) {
            candidates.push({
                path,
                details: {
                    estimatedLines: metrics.insertions,
                    commits: metrics.commits,
                    authors: metrics.authors.size,
                },
            });
        }
    }
    candidates.sort((a, b) => b.details.estimatedLines - a.details.estimatedLines);
    if (candidates.length === 0) {
        return {
            type: 'god-class',
            severity: 'low',
            description: 'No god classes detected',
            files: [],
        };
    }
    const avgLines = candidates.reduce((s, c) => s + c.details.estimatedLines, 0) / candidates.length;
    const severity = avgLines > 10000 ? 'critical' : avgLines > 5000 ? 'high' : 'medium';
    return {
        type: 'god-class',
        severity,
        description: `Found ${candidates.length} file(s) with 2000+ estimated lines — classes/files that may have too many responsibilities`,
        files: candidates.slice(0, 20),
    };
}
//# sourceMappingURL=god-class.js.map