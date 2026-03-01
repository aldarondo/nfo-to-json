import type { MovieData } from 'nfo-create';
import type { ParsedNfo, TvShowSummary } from './types.js';

/** Extract all movie records as a flat array. */
export function buildMoviesJson(records: ParsedNfo[]): MovieData[] {
  return records
    .filter((r): r is { type: 'movie'; data: MovieData } => r.type === 'movie')
    .map((r) => r.data);
}

/** Group episode records into per-show summaries with per-season episode counts. */
export function buildTvShowsJson(records: ParsedNfo[]): TvShowSummary[] {
  const map = new Map<string, TvShowSummary>();

  for (const record of records) {
    if (record.type !== 'episode') continue;
    const ep = record.data;
    const key = `${ep.showTitle ?? ''}::${ep.year ?? 0}`;

    if (!map.has(key)) {
      map.set(key, { title: ep.showTitle ?? '', year: ep.year, seasons: [] });
    }

    const show = map.get(key)!;
    const seasonNum = ep.season ?? 0;
    let season = show.seasons.find((s) => s.season === seasonNum);
    if (!season) {
      season = { season: seasonNum, episodeCount: 0 };
      show.seasons.push(season);
    }
    season.episodeCount++;
  }

  const result = [...map.values()].sort((a, b) => a.title.localeCompare(b.title));
  for (const show of result) show.seasons.sort((a, b) => a.season - b.season);
  return result;
}
