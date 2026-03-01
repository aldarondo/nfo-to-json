import { describe, it, expect, afterEach } from 'vitest';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { crawlDir } from '../src/crawler.js';

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'nfo-crawler-'));
}

function cleanup(dirs: string[]): void {
  for (const d of dirs) fs.rmSync(d, { recursive: true, force: true });
}

describe('crawlDir', () => {
  const temps: string[] = [];
  afterEach(() => { cleanup(temps); temps.length = 0; });

  it('yields .nfo files in a flat directory', async () => {
    const dir = makeTempDir(); temps.push(dir);
    fs.writeFileSync(path.join(dir, 'movie.nfo'), '');
    fs.writeFileSync(path.join(dir, 'movie.mp4'), '');

    const results: string[] = [];
    for await (const f of crawlDir(dir)) results.push(f);

    expect(results).toHaveLength(1);
    expect(results[0]).toBe(path.join(dir, 'movie.nfo'));
  });

  it('recurses into subdirectories', async () => {
    const dir = makeTempDir(); temps.push(dir);
    const sub = path.join(dir, 'Season 1');
    fs.mkdirSync(sub);
    fs.writeFileSync(path.join(dir, 'show.nfo'), '');
    fs.writeFileSync(path.join(sub, 'ep1.nfo'), '');
    fs.writeFileSync(path.join(sub, 'ep1.mkv'), '');

    const results: string[] = [];
    for await (const f of crawlDir(dir)) results.push(f);

    expect(results).toHaveLength(2);
    expect(results.some((f) => f.endsWith('show.nfo'))).toBe(true);
    expect(results.some((f) => f.endsWith('ep1.nfo'))).toBe(true);
  });

  it('returns empty when no .nfo files exist', async () => {
    const dir = makeTempDir(); temps.push(dir);
    fs.writeFileSync(path.join(dir, 'video.mkv'), '');

    const results: string[] = [];
    for await (const f of crawlDir(dir)) results.push(f);

    expect(results).toHaveLength(0);
  });

  it('returns empty for an empty directory', async () => {
    const dir = makeTempDir(); temps.push(dir);
    const results: string[] = [];
    for await (const f of crawlDir(dir)) results.push(f);
    expect(results).toHaveLength(0);
  });

  it('is case-insensitive for .NFO extension', async () => {
    const dir = makeTempDir(); temps.push(dir);
    fs.writeFileSync(path.join(dir, 'MOVIE.NFO'), '');

    const results: string[] = [];
    for await (const f of crawlDir(dir)) results.push(f);

    expect(results).toHaveLength(1);
  });

  it('handles deeply nested directories', async () => {
    const dir = makeTempDir(); temps.push(dir);
    const deep = path.join(dir, 'a', 'b', 'c');
    fs.mkdirSync(deep, { recursive: true });
    fs.writeFileSync(path.join(deep, 'deep.nfo'), '');

    const results: string[] = [];
    for await (const f of crawlDir(dir)) results.push(f);

    expect(results).toHaveLength(1);
    expect(results[0]).toContain('deep.nfo');
  });
});
