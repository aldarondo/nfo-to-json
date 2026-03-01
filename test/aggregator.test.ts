import { describe, it, expect } from 'vitest';
import { buildMoviesJson, buildTvShowsJson } from '../src/aggregator.js';
import type { ParsedNfo } from '../src/types.js';

const movie = (title: string, year = 2020): ParsedNfo => ({
  type: 'movie',
  data: { title, year, genres: ['Action'] },
});

const episode = (showTitle: string, season: number, episode: number, year = 2022): ParsedNfo => ({
  type: 'episode',
  data: { showTitle, season, episode, year, title: `S${season}E${episode}` },
});

const tvshow = (title: string): ParsedNfo => ({
  type: 'tvshow',
  data: { title },
});

describe('buildMoviesJson', () => {
  it('returns only movie records', () => {
    const records: ParsedNfo[] = [
      movie('Inception', 2010),
      episode('Breaking Bad', 1, 1),
      tvshow('The Wire'),
    ];
    const result = buildMoviesJson(records);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Inception');
    expect(result[0].year).toBe(2010);
  });

  it('returns empty array when no movies', () => {
    const result = buildMoviesJson([tvshow('Show A'), episode('Show A', 1, 1)]);
    expect(result).toHaveLength(0);
  });

  it('returns empty array for empty input', () => {
    expect(buildMoviesJson([])).toHaveLength(0);
  });

  it('returns all movie data fields', () => {
    const records: ParsedNfo[] = [movie('Tenet', 2020)];
    const result = buildMoviesJson(records);
    expect(result[0].genres).toEqual(['Action']);
  });
});

describe('buildTvShowsJson', () => {
  it('groups episodes by show title and year', () => {
    const records: ParsedNfo[] = [
      episode('Chainsaw Man', 1, 1, 2022),
      episode('Chainsaw Man', 1, 2, 2022),
      episode('Chainsaw Man', 2, 1, 2022),
    ];
    const result = buildTvShowsJson(records);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Chainsaw Man');
    expect(result[0].year).toBe(2022);
    expect(result[0].seasons).toHaveLength(2);
    const s1 = result[0].seasons.find((s) => s.season === 1)!;
    expect(s1.episodeCount).toBe(2);
    const s2 = result[0].seasons.find((s) => s.season === 2)!;
    expect(s2.episodeCount).toBe(1);
  });

  it('distinguishes same title different year', () => {
    const records: ParsedNfo[] = [
      episode('Show', 1, 1, 2020),
      episode('Show', 1, 1, 2023),
    ];
    const result = buildTvShowsJson(records);
    expect(result).toHaveLength(2);
  });

  it('sorts shows alphabetically by title', () => {
    const records: ParsedNfo[] = [
      episode('Zorro', 1, 1),
      episode('Avatar', 1, 1),
      episode('Breaking Bad', 1, 1),
    ];
    const result = buildTvShowsJson(records);
    expect(result.map((s) => s.title)).toEqual(['Avatar', 'Breaking Bad', 'Zorro']);
  });

  it('sorts seasons numerically within each show', () => {
    const records: ParsedNfo[] = [
      episode('Show', 3, 1),
      episode('Show', 1, 1),
      episode('Show', 2, 1),
    ];
    const result = buildTvShowsJson(records);
    expect(result[0].seasons.map((s) => s.season)).toEqual([1, 2, 3]);
  });

  it('ignores non-episode records', () => {
    const records: ParsedNfo[] = [movie('Film'), tvshow('AShow')];
    expect(buildTvShowsJson(records)).toHaveLength(0);
  });

  it('returns empty array for empty input', () => {
    expect(buildTvShowsJson([])).toHaveLength(0);
  });

  it('handles episodes with missing season (defaults to 0)', () => {
    const records: ParsedNfo[] = [{ type: 'episode', data: { title: 'Ep', showTitle: 'Show' } }];
    const result = buildTvShowsJson(records);
    expect(result).toHaveLength(1);
    expect(result[0].seasons[0].season).toBe(0);
  });

  it('handles episodes with missing showTitle gracefully', () => {
    const records: ParsedNfo[] = [{ type: 'episode', data: { title: 'Ep', season: 1, episode: 1 } }];
    const result = buildTvShowsJson(records);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('');
  });
});
