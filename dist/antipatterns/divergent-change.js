export function detectDivergentChange(commits) {
    const fileTopicMap = new Map();
    for (const commit of commits) {
        const topic = getCommitTopic(commit.message);
        for (const file of commit.files) {
            if (!fileTopicMap.has(file.path)) {
                fileTopicMap.set(file.path, new Set());
            }
            fileTopicMap.get(file.path).add(topic);
        }
    }
    const candidates = [];
    for (const [path, topics] of fileTopicMap) {
        if (topics.size >= 3) {
            candidates.push({
                path,
                details: {
                    distinctReasons: topics.size,
                    reasons: Array.from(topics).slice(0, 8),
                },
            });
        }
    }
    candidates.sort((a, b) => b.details.distinctReasons - a.details.distinctReasons);
    if (candidates.length === 0) {
        return {
            type: 'divergent-change',
            severity: 'low',
            description: 'No divergent change patterns detected',
            files: [],
        };
    }
    const avgReasons = candidates.reduce((s, c) => s + c.details.distinctReasons, 0) / candidates.length;
    const severity = avgReasons > 8 ? 'critical' : avgReasons > 5 ? 'high' : 'medium';
    return {
        type: 'divergent-change',
        severity,
        description: `Found ${candidates.length} file(s) modified for 3+ different reasons — these files handle too many concerns`,
        files: candidates.slice(0, 20),
    };
}
const TOPIC_KEYWORDS = {
    'feature': ['feat', 'feature', 'add', 'implement', 'new'],
    'bugfix': ['fix', 'bug', 'issue', 'defect', 'hotfix', 'patch'],
    'refactor': ['refactor', 'restructure', 'clean', 'reorganize'],
    'performance': ['perf', 'performance', 'optimize', 'speed', 'fast'],
    'security': ['security', 'secure', 'vuln', 'cve', 'auth'],
    'dependencies': ['deps', 'dependency', 'upgrade', 'bump', 'update'],
    'documentation': ['docs', 'documentation', 'readme', 'comment'],
    'testing': ['test', 'spec', 'assert', 'mock'],
    'config': ['config', 'configure', 'setup'],
    'style': ['style', 'format', 'lint', 'prettier'],
};
function getCommitTopic(message) {
    const lower = message.toLowerCase();
    for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
        for (const kw of keywords) {
            if (lower.includes(kw))
                return topic;
        }
    }
    return 'other';
}
//# sourceMappingURL=divergent-change.js.map