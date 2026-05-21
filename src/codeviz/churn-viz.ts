export function generateChurnChart(churnByFile: Record<string, number>): string {
  const entries = Object.entries(churnByFile)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 15);

  if (entries.length === 0) {
    return '_No churn data available._';
  }

  const maxChurn = entries[0][1];
  const barWidth = 30;

  const lines: string[] = [];
  lines.push('```');
  lines.push('Top Files by Churn');
  lines.push('─'.repeat(50));

  for (const [file, churn] of entries) {
    const barLen = Math.max(1, Math.round((churn / maxChurn) * barWidth));
    const bar = '█'.repeat(barLen);
    const paddedFile = file.length > 45 ? '...' + file.slice(-42) : file;
    lines.push(`${paddedFile.padEnd(48)} ${bar} ${churn.toLocaleString()}`);
  }

  lines.push('```');
  return lines.join('\n');
}
