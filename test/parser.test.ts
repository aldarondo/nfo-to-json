import { describe, it, expect } from 'vitest';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';
import fs from 'fs';
import { parseNfo } from '../src/parser.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const samplesDir = path.join(__dirname, '..', 'samples');

// Helper: write a temp NFO file and return its path
function tempNfo(content: string): string {
  const file = path.join(os.tmpdir(), `test-${Date.now()}-${Math.random().toString(36).slice(2)}.nfo`);
  fs.writeFileSync(file, content, 'utf8');
  return file;
}

describe('parseNfo', () => {
  it('parses a movie NFO from samples', async () => {
    const file = path.join(samplesDir, 'John.Wick.Chapter.4.2023.2160p.WEB-DL.DDP5.1.Atmos.HDR10Plus.H.265-CM.nfo');
    const result = await parseNfo(file);
    expect(result.type).toBe('movie');
    if (result.type !== 'movie') return;
    expect(result.data.title).toBe('疾速追杀4');
    expect(result.data.originalTitle).toBe('John Wick: Chapter 4');
    expect(result.data.year).toBe(2023);
    expect(result.data.rating).toBe(7.9);
    expect(result.data.imdbId).toBe('tt10366206');
    expect(result.data.tmdbId).toBe('603692');
    expect(result.data.genres).toContain('动作');
    expect(result.data.directors).toContain('Chad Stahelski');
    expect(result.data.writers).toContain('Michael Finch');
    expect(Array.isArray(result.data.actors)).toBe(true);
    expect(result.data.actors!.length).toBeGreaterThan(0);
    const first = result.data.actors![0];
    expect(typeof first === 'object' && 'name' in first).toBe(true);
    if (typeof first === 'object') {
      expect(first.name).toBe('Keanu Reeves');
      expect(first.role).toBe('John Wick');
    }
    expect(result.data.art?.poster).toBeTruthy();
    expect(result.data.art?.fanart).toBeTruthy();
  });

  it('parses a TV episode NFO from samples', async () => {
    const file = path.join(samplesDir, 'test.nfo');
    const result = await parseNfo(file);
    expect(result.type).toBe('episode');
    if (result.type !== 'episode') return;
    expect(result.data.title).toBe('DOG & CHAINSAW');
    expect(result.data.showTitle).toBe('Chainsaw Man');
    expect(result.data.season).toBe(1);
    expect(result.data.episode).toBe(1);
    expect(result.data.year).toBe(2022);
    expect(result.data.tvdbId).toBeTruthy();
    expect(result.data.airDate).toBe('2022-10-12');
    expect(result.data.art?.poster).toBeTruthy();
  });

  it('parses a movie NFO with flat imdbid/tmdbid elements', async () => {
    const file = tempNfo(`<?xml version="1.0"?>
<movie>
  <title>Flat ID Movie</title>
  <imdbid>tt9999999</imdbid>
  <tmdbid>12345</tmdbid>
  <year>2020</year>
</movie>`);
    const result = await parseNfo(file);
    fs.unlinkSync(file);
    expect(result.type).toBe('movie');
    if (result.type !== 'movie') return;
    expect(result.data.imdbId).toBe('tt9999999');
    expect(result.data.tmdbId).toBe('12345');
  });

  it('parses a tvshow NFO', async () => {
    const file = tempNfo(`<?xml version="1.0"?>
<tvshow>
  <title>Breaking Bad</title>
  <year>2008</year>
  <plot>A chemistry teacher turns to crime.</plot>
  <genre>Drama</genre>
  <genre>Crime</genre>
  <uniqueid type="tvdb">81189</uniqueid>
  <studio>AMC</studio>
  <status>Ended</status>
</tvshow>`);
    const result = await parseNfo(file);
    fs.unlinkSync(file);
    expect(result.type).toBe('tvshow');
    if (result.type !== 'tvshow') return;
    expect(result.data.title).toBe('Breaking Bad');
    expect(result.data.year).toBe(2008);
    expect(result.data.genres).toContain('Drama');
    expect(result.data.tvdbId).toBe('81189');
  });

  it('throws on unknown root element', async () => {
    const file = tempNfo(`<?xml version="1.0"?><unknowntag><title>X</title></unknowntag>`);
    await expect(parseNfo(file)).rejects.toThrow('Unknown NFO root element');
    fs.unlinkSync(file);
  });

  it('throws on malformed XML', async () => {
    const file = tempNfo(`not xml at all <<<`);
    await expect(parseNfo(file)).rejects.toThrow();
    fs.unlinkSync(file);
  });

  it('throws when file exceeds 10 MB', async () => {
    const file = path.join(os.tmpdir(), 'big.nfo');
    fs.writeFileSync(file, 'x'.repeat(11 * 1024 * 1024));
    await expect(parseNfo(file)).rejects.toThrow('too large');
    fs.unlinkSync(file);
  });

  it('handles movie with no optional fields', async () => {
    const file = tempNfo(`<?xml version="1.0"?><movie><title>Bare</title></movie>`);
    const result = await parseNfo(file);
    fs.unlinkSync(file);
    expect(result.type).toBe('movie');
    if (result.type !== 'movie') return;
    expect(result.data.title).toBe('Bare');
    expect(result.data.genres).toBeUndefined();
    expect(result.data.actors).toBeUndefined();
  });

  it('handles episode with no optional fields', async () => {
    const file = tempNfo(`<?xml version="1.0"?><episodedetails><title>Ep</title></episodedetails>`);
    const result = await parseNfo(file);
    fs.unlinkSync(file);
    expect(result.type).toBe('episode');
  });

  it('handles XML entities in title', async () => {
    const file = tempNfo(`<?xml version="1.0"?><movie><title>DOG &amp; CAT</title></movie>`);
    const result = await parseNfo(file);
    fs.unlinkSync(file);
    expect(result.type).toBe('movie');
    if (result.type !== 'movie') return;
    expect(result.data.title).toBe('DOG & CAT');
  });
});
