interface TreeNode {
  name: string;
  children: Map<string, TreeNode>;
}

const MAX_NODES = 80;

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

  const totalNodes = countNodes(root);

  const lines: string[] = [];
  lines.push('```mermaid');
  lines.push('mindmap');

  lines.push(`  ${sanitize(repoName)}`);

  let nodeCount = 0;
  let clipped = false;

  function renderTree(children: Map<string, TreeNode>, indent: string) {
    const sorted = [...children.entries()].sort(([a], [b]) => {
      const aIsFile = children.get(a)!.children.size === 0;
      const bIsFile = children.get(b)!.children.size === 0;
      if (aIsFile && !bIsFile) return 1;
      if (!aIsFile && bIsFile) return -1;
      return a.localeCompare(b);
    });

    for (const [name, node] of sorted) {
      if (nodeCount >= MAX_NODES) { clipped = true; break; }

      const displayName = sanitize(name);
      if (node.children.size === 0) {
        lines.push(`${indent}  ${displayName}`);
        nodeCount++;
      } else {
        lines.push(`${indent}  ${displayName}`);
        nodeCount++;
        renderTree(node.children, indent + '  ');
      }
    }
  }

  renderTree(root, '  ');

  if (clipped) {
    lines.push('  ... (diagram truncated — too many files to render)');
  } else if (totalNodes === 0) {
    lines.push('  (no files)');
  }

  lines.push('```');
  return lines.join('\n');
}

function countNodes(children: Map<string, TreeNode>): number {
  let count = 0;
  for (const [, node] of children) {
    count++;
    if (node.children.size > 0) {
      count += countNodes(node.children);
    }
  }
  return count;
}

function sanitize(text: string): string {
  return text.replace(/[{}[\]()#"\\`]/g, '').trim();
}
