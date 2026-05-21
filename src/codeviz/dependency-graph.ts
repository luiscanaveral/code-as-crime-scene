import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export function generateDependencyGraph(repoPath: string, files: string[]): string {
  const dependencies: Map<string, string[]> = new Map();
  const jsTsFiles = files.filter(f => /\.(ts|tsx|js|jsx|mjs|cjs|mts|cts)$/.test(f));

  for (const file of jsTsFiles) {
    const fullPath = join(repoPath, file);
    if (!existsSync(fullPath)) continue;

    try {
      const content = readFileSync(fullPath, 'utf-8');
      const imports = extractImports(content, file);
      if (imports.length > 0) {
        dependencies.set(file, imports);
      }
    } catch {
      // skip unreadable files
    }
  }

  const lines: string[] = [];
  lines.push('digraph Dependencies {');
  lines.push('  rankdir=LR;');
  lines.push('  node [shape=box, style=rounded];');
  lines.push('  edge [color=gray, arrowhead=vee];');
  lines.push('');

  const allFiles = new Set(files.filter(f => /\.(ts|tsx|js|jsx|mjs|cjs|mts|cts)$/.test(f)));
  for (const file of allFiles) {
    const nodeId = toNodeId(file);
    lines.push(`  ${nodeId} [label="${file}"];`);
  }

  lines.push('');

  for (const [source, targets] of dependencies) {
    const sourceId = toNodeId(source);
    for (const target of targets) {
      if (allFiles.has(target)) {
        const targetId = toNodeId(target);
        lines.push(`  ${sourceId} -> ${targetId};`);
      }
    }
  }

  for (const [source, targets] of dependencies) {
    const sourceId = toNodeId(source);
    for (const target of targets) {
      if (!allFiles.has(target)) {
        const targetId = toNodeId(target);
        lines.push(`  ${sourceId} -> ${targetId} [style=dashed, color=lightgray];`);
      }
    }
  }

  lines.push('}');
  lines.push('');
  return lines.join('\n');
}

function extractImports(content: string, currentFile: string): string[] {
  const imports: string[] = [];
  const extPattern = /\.(ts|tsx|js|jsx|mjs|cjs|mts|cts)$/;

  const importLines = content.matchAll(/(?:import\s+(?:(?:\{[^}]*\}|[^;{]+)\s+from\s+)?['"]([^'"]+)['"]|require\s*\(\s*['"]([^'"]+)['"]\s*\))/g);

  for (const match of importLines) {
    const rawPath = match[1] || match[2];
    if (!rawPath.startsWith('.')) continue;

    const resolved = resolveRelativePath(currentFile, rawPath);
    if (resolved) {
      const target = extPattern.test(resolved) ? resolved : `${resolved}.ts`;
      imports.push(target);
      if (target.endsWith('.ts')) {
        imports.push(target.replace(/\.ts$/, '.js'));
      }
    }
  }

  return imports;
}

function resolveRelativePath(fromFile: string, importPath: string): string | null {
  const parts = fromFile.split('/');
  parts.pop();

  const importParts = importPath.split('/');
  for (const part of importParts) {
    if (part === '.') continue;
    if (part === '..') {
      if (parts.length === 0) return null;
      parts.pop();
    } else {
      parts.push(part);
    }
  }

  if (parts.length === 0) return null;
  return parts.join('/');
}

function toNodeId(path: string): string {
  return '"' + path.replace(/[\\"']/g, '-') + '"';
}
