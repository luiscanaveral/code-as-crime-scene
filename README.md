# Code as Crime Scene

Analyzes git history to detect code anti-patterns, run static analysis across multiple languages, find typos, and generate a markdown report.

## Installation

```bash
npm install -g code-as-crime-scene
```

Or run directly without installing:

```bash
npx code-as-crime-scene
```

## Usage

### CLI

```bash
# Analyze the current repository (default output: code-crime-scene-report.md)
code-as-crime-scene

# Specify a repository path and output file
code-as-crime-scene -p /path/to/repo -o report.md

# Limit to recent commits
code-as-crime-scene -n 500

# Filter by date range
code-as-crime-scene -s "2024-01-01" -u "2024-12-31"

# Verbose output
code-as-crime-scene -v
```

### Options

| Flag | Description |
|------|-------------|
| `-p, --path <path>` | Path to the git repository (default: current dir) |
| `-o, --output <path>` | Output markdown file path |
| `-n, --max-commits <number>` | Maximum number of commits to analyze |
| `-s, --since <date>` | Analyze commits since date (e.g. `"2024-01-01"`) |
| `-u, --until <date>` | Analyze commits until date |
| `-l, --language <language>` | Filter analysis to a specific language |
| `-v, --verbose` | Show progress information |

### Programmatic API

```typescript
import { generateReport } from 'code-as-crime-scene'

// Generate the report markdown string
const report = await generateReport({
  repoPath: '/path/to/repo',
  maxCommits: 1000,
  since: '2024-01-01',
  verbose: true,
})

console.log(report)
```

```typescript
import { analyze } from 'code-as-crime-scene'

// Get the full report object
const report = await analyze({
  repoPath: '/path/to/repo',
})

console.log(report.stats.totalLines)
console.log(report.antipatterns)
console.log(report.typos.length)
```

## Report Sections

### Code Statistics
- Total commits, files, lines of code, authors
- Estimated hours worked (based on commit count + churn)
- Lines of code grouped by language
- Commits per author
- Top 10 files by churn

### Anti-Pattern Analysis

| Pattern | Description |
|---------|-------------|
| **Fat Controller** | Controller/service files with excessive size and change frequency — indicates too many responsibilities concentrated in one file |
| **Supernova** | Files with anomalously high churn (3+ sigma above the mean) — files that "exploded" in activity |
| **God Class** | Files with 2000+ estimated lines — likely have too many responsibilities |
| **Shotgun Surgery** | Commits touching 5+ files — suggests changes are scattered across many files |
| **Divergent Change** | Files modified for 3+ different reasons — handling too many concerns |

### Static Analysis

Language-specific pattern detection (skips `node_modules`, `dist`, etc.):

- **TypeScript**: `any` type, TODO/FIXME comments, console statements, deep nesting, nested `.then()`, non-null assertions
- **JavaScript**: var usage, `==` instead of `===`, TODO comments, console statements, deep nesting, nested callbacks
- **Python**: print statements, bare except clauses, wildcard imports, mutable default arguments, global usage
- **Java**: System.out/err, null references, raw types, generic catch clauses
- **C#**: Console output, `var` usage, null-forgiving operator, empty catch blocks
- **Go**: panic usage, fmt.Print, naked returns
- **Ruby**: puts, bare rescue clauses

### Typo Detection

Scans code comments against a dictionary of 1300+ common misspellings and suggests corrections.

## Development

```bash
npm install
npm run build
node dist/cli.js -v
```
