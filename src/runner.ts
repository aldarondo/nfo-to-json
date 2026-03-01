import fs from 'fs';
import path from 'path';
import { Command } from 'commander';
import { crawlDir } from './crawler.js';
import { parseNfo } from './parser.js';
import { buildMoviesJson, buildTvShowsJson } from './aggregator.js';
import type { ParsedNfo } from './types.js';

/**
 * Core CLI logic. Returns an exit code (0 = success, 1 = error).
 * Kept separate from cli.ts so it can be tested without spawning a subprocess.
 */
export async function run(argv: string[]): Promise<number> {
  const program = new Command();

  program
    .name('nfo-to-json')
    .description('Crawl a directory of .nfo files and convert them to JSON.')
    .option('-i, --input <path>', 'Directory to scan for .nfo files')
    .option('--aggregate', 'Write movies.json + tv-shows.json instead of individual files')
    .option('--output <path>', 'Output directory for aggregate files (default: same as --input)')
    .option('--dry-run', 'Preview without writing any files')
    .option('-v, --verbose', 'Show per-file detail')
    .exitOverride(); // prevents process.exit inside Command.parse

  try {
    program.parse(['node', 'nfo-to-json', ...argv]);
  } catch {
    program.outputHelp();
    return 1;
  }

  const opts = program.opts<{
    input?: string;
    aggregate?: boolean;
    output?: string;
    dryRun?: boolean;
    verbose?: boolean;
  }>();

  if (!opts.input) {
    console.error('Error: --input <path> is required.');
    program.outputHelp();
    return 1;
  }

  const inputPath = path.resolve(opts.input);
  if (!fs.existsSync(inputPath)) {
    console.error(`Error: input directory does not exist: ${inputPath}`);
    return 1;
  }

  const outputPath = opts.output ? path.resolve(opts.output) : inputPath;
  const dryRun = opts.dryRun ?? false;
  const verbose = opts.verbose ?? false;
  const aggregate = opts.aggregate ?? false;

  const records: ParsedNfo[] = [];

  for await (const filePath of crawlDir(inputPath)) {
    try {
      const result = await parseNfo(filePath);

      if (aggregate) {
        records.push(result);
        if (verbose) console.log(`  parsed: ${filePath}`);
      } else {
        const outPath = path.join(path.dirname(filePath), path.basename(filePath, path.extname(filePath)) + '.json');
        if (verbose) console.log(`  ${filePath} → ${outPath}`);
        if (!dryRun) {
          fs.writeFileSync(outPath, JSON.stringify(result, null, 2), 'utf8');
        }
      }
    } catch (err) {
      console.error(`Error parsing ${filePath}: ${(err as Error).message}`);
    }
  }

  if (aggregate) {
    const moviesPath = path.join(outputPath, 'movies.json');
    const showsPath = path.join(outputPath, 'tv-shows.json');
    const movies = buildMoviesJson(records);
    const shows = buildTvShowsJson(records);

    if (verbose || dryRun) {
      console.log(`movies.json → ${movies.length} movie(s)`);
      console.log(`tv-shows.json → ${shows.length} show(s)`);
    }

    if (!dryRun) {
      if (opts.output) fs.mkdirSync(outputPath, { recursive: true });
      fs.writeFileSync(moviesPath, JSON.stringify(movies, null, 2), 'utf8');
      fs.writeFileSync(showsPath, JSON.stringify(shows, null, 2), 'utf8');
    }
  }

  return 0;
}
