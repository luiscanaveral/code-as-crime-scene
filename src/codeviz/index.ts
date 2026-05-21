import { generateDirectoryTree } from './directory-tree.js';
import { generateChurnChart } from './churn-viz.js';
import { generateDependencyGraph } from './dependency-graph.js';

export interface CodeVizResult {
  directoryTree: string;
  churnChart: string;
  dotGraph: string;
}

export function generateCodeViz(
  files: string[],
  churnByFile: Record<string, number>,
  repoPath: string,
  repoName: string,
): CodeVizResult {
  const directoryTree = generateDirectoryTree(files, repoName);
  const churnChart = generateChurnChart(churnByFile);
  const dotGraph = generateDependencyGraph(repoPath, files);

  return { directoryTree, churnChart, dotGraph };
}
