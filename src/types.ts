// Re-export all nfo-create types so consumers only need one import
export type { MovieData, EpisodeData, ShowData, ActorData, BaseMediaData } from 'nfo-create';
import type { MovieData, EpisodeData, ShowData } from 'nfo-create';

/** Discriminated union of all NFO root types. */
export type ParsedNfo =
  | { type: 'movie';   data: MovieData }
  | { type: 'episode'; data: EpisodeData }
  | { type: 'tvshow';  data: ShowData };

/** Aggregate summary shape for tv-shows.json. */
export interface TvShowSummary {
  title: string;
  year?: number;
  seasons: Array<{ season: number; episodeCount: number }>;
}
