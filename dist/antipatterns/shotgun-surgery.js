export function detectShotgunSurgery(commits) {
    if (commits.length === 0) {
        return { type: 'shotgun-surgery', severity: 'low', description: 'No commits to analyze', files: [] };
    }
    const multiFileCommits = commits.filter(c => c.files.length >= 5);
    if (multiFileCommits.length === 0) {
        return {
            type: 'shotgun-surgery',
            severity: 'low',
            description: 'No shotgun surgery patterns detected',
            files: [],
        };
    }
    const commitFiles = multiFileCommits.map(c => ({
        hash: c.hash,
        author: c.author,
        date: c.date,
        message: c.message.split('\n')[0],
        fileCount: c.files.length,
        files: c.files.map(f => f.path),
    }));
    const totalCommits = commits.length;
    const percentage = (multiFileCommits.length / totalCommits) * 100;
    const severity = percentage > 20 ? 'critical' : percentage > 10 ? 'high' : 'medium';
    const topFiles = new Map();
    for (const c of multiFileCommits) {
        for (const f of c.files) {
            topFiles.set(f.path, (topFiles.get(f.path) || 0) + 1);
        }
    }
    const sortedFiles = Array.from(topFiles.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([path, count]) => ({ path, details: { appearingInCommits: count } }));
    return {
        type: 'shotgun-surgery',
        severity,
        description: `Found ${multiFileCommits.length} commits (${percentage.toFixed(1)}% of total) that touch 5+ files — suggests changes are scattered across many files`,
        files: sortedFiles,
    };
}
//# sourceMappingURL=shotgun-surgery.js.map