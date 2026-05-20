#!/usr/bin/env node
import { Command } from 'commander';
import { generateReport } from './index.js';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const program = new Command();

program
  .name('code-as-crime-scene')
  .description('Analyzes git history to detect code anti-patterns, run static analysis, find typos, and generate a markdown report')
  .version('0.1.0');

program
  .option('-p, --path <path>', 'Path to the git repository', process.cwd())
  .option('-o, --output <path>', 'Output file for the report', 'code-crime-scene-report.md')
  .option('-n, --max-commits <number>', 'Maximum number of commits to analyze', parseInt)
  .option('-s, --since <date>', 'Analyze commits since date (e.g. "2024-01-01")')
  .option('-u, --until <date>', 'Analyze commits until date')
  .option('-l, --language <language>', 'Filter analysis to specific language')
  .option('-v, --verbose', 'Enable verbose output')
  .action(async (options) => {
    try {
      if (options.verbose) {
        console.log(`Analyzing repository at: ${options.path}`);
        if (options.maxCommits) console.log(`Max commits: ${options.maxCommits}`);
        if (options.since) console.log(`Since: ${options.since}`);
        if (options.until) console.log(`Until: ${options.until}`);
      }

      const report = await generateReport({
        repoPath: resolve(options.path),
        maxCommits: options.maxCommits,
        since: options.since,
        until: options.until,
        language: options.language,
        verbose: options.verbose,
      });

      const outputPath = resolve(options.output);
      writeFileSync(outputPath, report, 'utf-8');

      console.log(`Report generated: ${outputPath}`);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program.parse(process.argv);
