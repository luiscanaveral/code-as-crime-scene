interface TreeNode {
  name: string;
  children: Map<string, TreeNode>;
}

export function generateDirectoryTree(files: string[], repoName: string): string {
  const root = new Map<string, TreeNode>();

  for (const file of files) {
    const parts = file.split('/');
    let current = root;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (!current.has(part)) {
        current.set(part, { name: part, children: new Map() });
      }
      current = current.get(part)!.children;
    }
  }

  const lines: string[] = [];
  lines.push('```mermaid');
  lines.push('graph TD');
  lines.push('');

  let nextId = 1;
  const nodeIds = new Map<string, number>();

  function getOrCreateId(path: string): number {
    if (!nodeIds.has(path)) {
      nodeIds.set(path, nextId++);
    }
    return nodeIds.get(path)!;
  }

  const rootPath = repoName;
  const rootId = getOrCreateId(rootPath);
  lines.push(`  n${rootId}["${sanitize(repoName)}"]`);

  function renderTree(children: Map<string, TreeNode>, parentId: number, prefix: string) {
    const sorted = [...children.entries()].sort(([a], [b]) => {
      const aIsFile = children.get(a)!.children.size === 0;
      const bIsFile = children.get(b)!.children.size === 0;
      if (aIsFile && !bIsFile) return 1;
      if (!aIsFile && bIsFile) return -1;
      return a.localeCompare(b);
    });

    for (const [name, node] of sorted) {
      const nodePath = prefix ? `${prefix}/${name}` : name;
      const nodeId = getOrCreateId(nodePath);
      const displayName = sanitize(name);
      lines.push(`  n${nodeId}["${displayName}"]`);
      lines.push(`  n${parentId} --> n${nodeId}`);
      if (node.children.size > 0) {
        renderTree(node.children, nodeId, nodePath);
      }
    }
  }

  renderTree(root, rootId, '');

  lines.push('```');
  return lines.join('\n');
}

function sanitize(text: string): string {
  return text.replace(/[{}[\]()#"\\`]/g, '').trim();
}
