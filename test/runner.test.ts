import { describe, it, expect, afterEach, vi } from 'vitest';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { run } from '../src/runner.js';

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'nfo-runner-'));
}

function cleanup(dirs: string[]): void {
  for (const d of dirs) fs.rmSync(d, { recursive: true, force: true });
}

const MOVIE_NFO = `<?xml version="1.0"?>
<movie><title>Test Movie</title><year>2023</year><director>Dir</director></movie>`;

const EPISODE_NFO = `<?xml version="1.0"?>
<episodedetails>
  <title>Ep 1</title><showtitle>Test Show</showtitle>
  <season>1</season><episode>1</episode><year>2022</year>
</episodedetails>`;

describe('run (CLI logic)', () => {
  const temps: string[] = [];
  afterEach(() => { cleanup(temps); temps.length = 0; vi.restoreAllMocks(); });

  it('exits 1 with error when --input is missing', async () => {
    const code = await run([]);
    expect(code).toBe(1);
  });

  it('exits 1 when commander throws (e.g. --help flag)', async () => {
    const code = await run(['--help']);
    expect(code).toBe(1);
  });

  it('exits 1 when input directory does not exist', async () => {
    const code = await run(['--input', '/does/not/exist/at/all']);
    expect(code).toBe(1);
  });

  it('writes individual JSON files next to each .nfo (default mode)', async () => {
    const dir = makeTempDir(); temps.push(dir);
    fs.writeFileSync(path.join(dir, 'movie.nfo'), MOVIE_NFO);

    const code = await run(['--input', dir]);
    expect(code).toBe(0);

    const jsonPath = path.join(dir, 'movie.json');
    expect(fs.existsSync(jsonPath)).toBe(true);
    const parsed = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    expect(parsed.data.title).toBe('Test Movie');
    expect(parsed.type).toBe('movie');
  });

  it('skips writing in dry-run mode', async () => {
    const dir = makeTempDir(); temps.push(dir);
    fs.writeFileSync(path.join(dir, 'movie.nfo'), MOVIE_NFO);

    const code = await run(['--input', dir, '--dry-run']);
    expect(code).toBe(0);
    expect(fs.existsSync(path.join(dir, 'movie.json'))).toBe(false);
  });

  it('aggregate mode writes movies.json and tv-shows.json, skips individual files', async () => {
    const dir = makeTempDir(); temps.push(dir);
    fs.writeFileSync(path.join(dir, 'movie.nfo'), MOVIE_NFO);
    fs.writeFileSync(path.join(dir, 'ep.nfo'), EPISODE_NFO);

    const code = await run(['--input', dir, '--aggregate']);
    expect(code).toBe(0);

    expect(fs.existsSync(path.join(dir, 'movie.json'))).toBe(false);
    expect(fs.existsSync(path.join(dir, 'ep.json'))).toBe(false);

    const movies = JSON.parse(fs.readFileSync(path.join(dir, 'movies.json'), 'utf8'));
    expect(Array.isArray(movies)).toBe(true);
    expect(movies[0].title).toBe('Test Movie');

    const shows = JSON.parse(fs.readFileSync(path.join(dir, 'tv-shows.json'), 'utf8'));
    expect(Array.isArray(shows)).toBe(true);
    expect(shows[0].title).toBe('Test Show');
  });

  it('aggregate mode writes to --output directory', async () => {
    const dir = makeTempDir(); temps.push(dir);
    const outDir = makeTempDir(); temps.push(outDir);
    fs.writeFileSync(path.join(dir, 'movie.nfo'), MOVIE_NFO);

    const code = await run(['--input', dir, '--aggregate', '--output', outDir]);
    expect(code).toBe(0);

    expect(fs.existsSync(path.join(outDir, 'movies.json'))).toBe(true);
    expect(fs.existsSync(path.join(outDir, 'tv-shows.json'))).toBe(true);
    expect(fs.existsSync(path.join(dir, 'movies.json'))).toBe(false);
  });

  it('aggregate dry-run logs but writes nothing', async () => {
    const dir = makeTempDir(); temps.push(dir);
    fs.writeFileSync(path.join(dir, 'movie.nfo'), MOVIE_NFO);

    const code = await run(['--input', dir, '--aggregate', '--dry-run']);
    expect(code).toBe(0);
    expect(fs.existsSync(path.join(dir, 'movies.json'))).toBe(false);
    expect(fs.existsSync(path.join(dir, 'tv-shows.json'))).toBe(false);
  });

  it('verbose flag does not change exit code or output files', async () => {
    const dir = makeTempDir(); temps.push(dir);
    fs.writeFileSync(path.join(dir, 'movie.nfo'), MOVIE_NFO);
    const spy = vi.spyOn(console, 'log').mockImplementation(() => { });
    const code = await run(['--input', dir, '--verbose']);
    expect(code).toBe(0);
    // verbose emits at least one log per file
    expect(spy.mock.calls.some((c) => String(c[0]).includes('movie.nfo'))).toBe(true);
  });

  it('continues and exits 0 when a single NFO fails to parse', async () => {
    const dir = makeTempDir(); temps.push(dir);
    fs.writeFileSync(path.join(dir, 'bad.nfo'), 'not xml <<<');
    fs.writeFileSync(path.join(dir, 'good.nfo'), MOVIE_NFO);

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
    const code = await run(['--input', dir]);
    expect(code).toBe(0);
    expect(errSpy.mock.calls.some((c) => String(c[0]).includes('bad.nfo'))).toBe(true);
    expect(fs.existsSync(path.join(dir, 'good.json'))).toBe(true);
  });

  it('unknown NFO root is logged as a warning and skipped', async () => {
    const dir = makeTempDir(); temps.push(dir);
    fs.writeFileSync(path.join(dir, 'weird.nfo'), `<?xml version="1.0"?><weirdroot><title>X</title></weirdroot>`);
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
    const code = await run(['--input', dir]);
    expect(code).toBe(0);
    expect(errSpy.mock.calls.length).toBeGreaterThan(0);
  });

  it('aggregate mode with verbose logs parsing of each file', async () => {
    const dir = makeTempDir(); temps.push(dir);
    fs.writeFileSync(path.join(dir, 'movie.nfo'), MOVIE_NFO);
    const spy = vi.spyOn(console, 'log').mockImplementation(() => { });
    const code = await run(['--input', dir, '--aggregate', '--verbose']);
    expect(code).toBe(0);
    expect(spy.mock.calls.some((c) => String(c[0]).includes('parsed:'))).toBe(true);
  });
});
