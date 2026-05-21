interface TreeNode {
  name: string;
  children: Map<string, TreeNode>;
  isFile: boolean;
}

export function generateDirectoryTree(files: string[], repoName: string): string {
  const root = new Map<string, TreeNode>();

  for (const file of files) {
    const parts = file.split('/');
    let current = root;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1;
      if (!current.has(part)) {
        current.set(part, { name: part, children: new Map(), isFile });
      }
      current = current.get(part)!.children;
    }
  }

  const lines: string[] = [];
  lines.push('```mermaid');
  lines.push('mindmap');

  lines.push(`  ("${repoName}")`);

  const sortedDirs = [...root.entries()].sort(([a], [b]) => {
    const aIsFile = root.get(a)!.isFile;
    const bIsFile = root.get(b)!.isFile;
    if (aIsFile && !bIsFile) return 1;
    if (!aIsFile && bIsFile) return -1;
    return a.localeCompare(b);
  });

  for (const [name, node] of sortedDirs) {
    renderNode(name, node, '    ', lines);
  }

  lines.push('```');
  return lines.join('\n');
}

function renderNode(name: string, node: TreeNode, indent: string, lines: string[]) {
  const escaped = `"${name}"`;
  if (node.children.size === 0) {
    lines.push(`${indent}${escaped}`);
    return;
  }

  lines.push(`${indent}${escaped}`);

  const sorted = [...node.children.entries()].sort(([a], [b]) => {
    const aIsFile = node.children.get(a)!.isFile;
    const bIsFile = node.children.get(b)!.isFile;
    if (aIsFile && !bIsFile) return 1;
    if (!aIsFile && bIsFile) return -1;
    return a.localeCompare(b);
  });

  for (const [childName, childNode] of sorted) {
    renderNode(childName, childNode, indent + '  ', lines);
  }
}
