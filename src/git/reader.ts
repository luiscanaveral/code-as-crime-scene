import { execSync } from 'node:child_process';
import { Commit, CommitFile, Options } from '../types.js';

export function readGitLog(options: Options = {}): { commits: Commit[]; branch: string; repoUrl: string } {
  const repoPath = options.repoPath || process.cwd();

  const branch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: repoPath }).toString().trim();

  let repoUrl = '';
  try {
    repoUrl = execSync('git config --get remote.origin.url', { cwd: repoPath }).toString().trim();
  } catch {
    repoUrl = 'unknown';
  }

  let gitLogCmd = 'git log --format="COMMIT%n%H%n%an%n%ae%n%aI%n%s%nBODY_START%n%b%nBODY_END%nFILES" --numstat';
  if (options.since) gitLogCmd += ` --since="${options.since}"`;
  if (options.until) gitLogCmd += ` --until="${options.until}"`;
  if (options.maxCommits) gitLogCmd += ` -${options.maxCommits}`;

  const rawOutput = execSync(gitLogCmd, { cwd: repoPath, maxBuffer: 50 * 1024 * 1024 }).toString();

  const commits = parseGitLog(rawOutput);

  return { commits, branch, repoUrl };
}

function parseGitLog(raw: string): Commit[] {
  const commits: Commit[] = [];
  const blocks = raw.split('COMMIT\n').filter(b => b.trim().length > 0);

  for (const block of blocks) {
    const lines = block.split('\n');
    if (lines.length < 5) continue;

    const hash = lines[0].trim();
    const author = lines[1].trim();
    const email = lines[2].trim();
    const date = new Date(lines[3].trim());
    const subject = lines[4].trim();

    let bodyEndIdx = -1;
    let bodyStartIdx = -1;
    for (let i = 5; i < lines.length; i++) {
      if (lines[i].trim() === 'BODY_START') bodyStartIdx = i;
      if (lines[i].trim() === 'BODY_END') bodyEndIdx = i;
    }

    let message = subject;
    if (bodyStartIdx !== -1 && bodyEndIdx !== -1) {
      const bodyLines = lines.slice(bodyStartIdx + 1, bodyEndIdx);
      const body = bodyLines.join('\n').trim();
      if (body) message = `${subject}\n\n${body}`;
    }

    const filesStartIdx = bodyEndIdx !== -1 ? bodyEndIdx + 1 : 5;
    const fileLines = lines.slice(filesStartIdx).filter(l => l.trim().length > 0);

    const files: CommitFile[] = [];
    for (const line of fileLines) {
      const parts = line.split('\t');
      if (parts.length !== 3) continue;
      const insertions = parts[0] === '-' ? 0 : parseInt(parts[0], 10) || 0;
      const deletions = parts[1] === '-' ? 0 : parseInt(parts[1], 10) || 0;
      const path = parts[2].trim();
      if (!path) continue;

      files.push({
        path,
        insertions,
        deletions,
        changeType: 'modified',
      });
    }

    commits.push({ hash, author, email, date, message, files });
  }

  return commits;
}

export function detectLanguages(commits: Commit[]): Set<string> {
  const extensions = new Set<string>();
  const seen = new Set<string>();
  for (const commit of commits) {
    for (const file of commit.files) {
      if (seen.has(file.path)) continue;
      seen.add(file.path);
      const ext = file.path.split('.').pop()?.toLowerCase();
      if (ext) extensions.add(ext);
    }
  }
  return extensions;
}
