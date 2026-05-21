import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

interface GitignorePattern {
  regex: RegExp;
  negation: boolean;
}

export function loadGitignore(repoPath: string): (filePath: string) => boolean {
  const gitignorePath = join(repoPath, '.gitignore');

  if (!existsSync(gitignorePath)) {
    return () => false;
  }

  const content = readFileSync(gitignorePath, 'utf-8');
  const patterns = parseGitignore(content);

  return (filePath: string) => {
    let ignored = false;
    for (const p of patterns) {
      if (p.regex.test(filePath)) {
        ignored = !p.negation;
      }
    }
    return ignored;
  };
}

function parseGitignore(content: string): GitignorePattern[] {
  const patterns: GitignorePattern[] = [];

  for (let line of content.split('\n')) {
    line = line.trim();
    if (line === '' || line.startsWith('#')) continue;

    let negation = false;
    if (line.startsWith('!')) {
      negation = true;
      line = line.slice(1);
    }

    let dirOnly = false;
    if (line.endsWith('/')) {
      dirOnly = true;
      line = line.slice(0, -1);
    }

    let anchored = false;
    if (line.startsWith('/')) {
      anchored = true;
      line = line.slice(1);
    } else if (line.includes('/')) {
      anchored = true;
    }

    const regex = gitignoreToRegExp(line, anchored, dirOnly);
    patterns.push({ regex, negation });
  }

  return patterns;
}

function gitignoreToRegExp(pattern: string, anchored: boolean, dirOnly: boolean): RegExp {
  let str = '';
  let i = 0;

  while (i < pattern.length) {
    const ch = pattern[i];

    if (ch === '*') {
      if (i + 1 < pattern.length && pattern[i + 1] === '*') {
        str += '.*';
        i += 2;
        if (i < pattern.length && pattern[i] === '/') {
          i++;
        }
      } else {
        str += '[^/]*';
        i++;
      }
    } else if (ch === '?') {
      str += '[^/]';
      i++;
    } else if (ch === '.') {
      str += '\\.';
      i++;
    } else if ('+^${}()|\\'.includes(ch)) {
      str += '\\' + ch;
      i++;
    } else if (ch === '[') {
      const close = pattern.indexOf(']', i);
      if (close !== -1) {
        str += pattern.slice(i, close + 1);
        i = close + 1;
      } else {
        str += '\\[';
        i++;
      }
    } else {
      str += ch;
      i++;
    }
  }

  if (dirOnly) {
    str += '(/.*)?';
  }

  if (anchored) {
    return new RegExp('^' + str + '$');
  }

  return new RegExp('(^|.*/)' + str + '$');
}
