import fs from 'fs';
import path from 'path';
import { XMLParser } from 'fast-xml-parser';
import type { MovieData, EpisodeData, ShowData, ActorData } from 'nfo-create';
import type { ParsedNfo } from './types.js';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

/** Elements that should always be returned as arrays even when there is only one. */
const ALWAYS_ARRAY = new Set(['genre', 'studio', 'country', 'director', 'credits', 'writer', 'actor', 'tag', 'uniqueid']);

const XML_PARSER = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  allowBooleanAttributes: true,
  processEntities: true,
  parseAttributeValue: false,
  isArray: (name) => ALWAYS_ARRAY.has(name),
});

/**
 * Parse a single .nfo file and return a typed, discriminated ParsedNfo.
 *
 * @throws {Error} if the file exceeds 10 MB, cannot be parsed, or has an unknown root element.
 */
export async function parseNfo(filePath: string): Promise<ParsedNfo> {
  const absPath = path.resolve(filePath);

  const stat = await fs.promises.stat(absPath);
  if (stat.size > MAX_FILE_SIZE) {
    throw new Error(`File too large: ${absPath} (${stat.size} bytes, max ${MAX_FILE_SIZE})`);
  }

  const content = await fs.promises.readFile(absPath, 'utf8');
  // fast-xml-parser throws on malformed XML when validationMode is set; we rely on parse errors
  const raw = XML_PARSER.parse(content) as Record<string, unknown>;

  if ('movie' in raw) return { type: 'movie', data: mapMovie(raw['movie'] as RawNode) };
  if ('episodedetails' in raw) return { type: 'episode', data: mapEpisode(raw['episodedetails'] as RawNode) };
  if ('tvshow' in raw) return { type: 'tvshow', data: mapShow(raw['tvshow'] as RawNode) };

  throw new Error(`Unknown NFO root element in ${absPath}`);
}

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

type RawNode = Record<string, unknown>;

// ---------------------------------------------------------------------------
// Field extractors
// ---------------------------------------------------------------------------

function str(node: RawNode, key: string): string | undefined {
  const v = node[key];
  if (v == null) return undefined;
  const s = String(v).trim();
  return s.length > 0 ? s : undefined;
}

function num(node: RawNode, key: string): number | undefined {
  const v = node[key];
  if (v == null) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function strArray(node: RawNode, key: string): string[] | undefined {
  const v = node[key];
  if (!Array.isArray(v)) return undefined;
  const result = (v as unknown[]).map((x) => String(x).trim()).filter(Boolean);
  return result.length > 0 ? result : undefined;
}

function resolveIds(node: RawNode): { imdbId?: string; tmdbId?: string; tvdbId?: string } {
  // Prefer flat elements (imdbid, tmdbid) as fallback; uniqueid array takes precedence
  let imdbId = str(node, 'imdbid');
  let tmdbId = str(node, 'tmdbid');
  let tvdbId = str(node, 'tvdbid');

  const ids = node['uniqueid'];
  if (Array.isArray(ids)) {
    for (const entry of ids as RawNode[]) {
      const t = str(entry, '@_type');
      const val = str(entry, '#text');
      if (!val) continue;
      if (t === 'imdb') imdbId = val;
      else if (t === 'tmdb') tmdbId = val;
      else if (t === 'tvdb') tvdbId = val;
    }
  }

  return { imdbId, tmdbId, tvdbId };
}

function resolveArt(node: RawNode): { poster?: string; fanart?: string } | undefined {
  const art = node['art'] as RawNode | undefined;
  if (!art || typeof art !== 'object') return undefined;
  const poster = str(art, 'poster');
  const fanart = str(art, 'fanart');
  return poster || fanart ? { poster, fanart } : undefined;
}

function resolveActors(node: RawNode): ActorData[] | undefined {
  const raw = node['actor'];
  if (!Array.isArray(raw)) return undefined;
  const actors = (raw as RawNode[]).map((a) => {
    const actor: ActorData = { name: str(a, 'name') ?? '' };
    const role = str(a, 'role');
    const type = str(a, 'type');
    const thumb = str(a, 'thumb');
    const sortOrder = num(a, 'sortorder');
    if (role) actor.role = role;
    if (type) actor.type = type;
    if (thumb) actor.thumb = thumb;
    if (sortOrder != null) actor.sortOrder = sortOrder;
    return actor;
  }).filter((a) => a.name.length > 0);
  return actors.length > 0 ? actors : undefined;
}

function baseFields(node: RawNode): Partial<MovieData & EpisodeData & ShowData> {
  const { imdbId, tmdbId, tvdbId } = resolveIds(node);
  const art = resolveArt(node);
  const actors = resolveActors(node);
  const tags = strArray(node, 'tag');
  const genres = strArray(node, 'genre');
  const directors = strArray(node, 'director');
  // writers: real NFOs use <credits> or <writer>
  const writers = strArray(node, 'credits') ?? strArray(node, 'writer');

  return {
    title: str(node, 'title'),
    originalTitle: str(node, 'originaltitle'),
    year: num(node, 'year'),
    plot: str(node, 'plot'),
    outline: str(node, 'outline'),
    rating: num(node, 'rating'),
    contentRating: str(node, 'mpaa'),
    releaseDate: str(node, 'premiered') ?? str(node, 'releasedate'),
    runtime: num(node, 'runtime'),
    playcount: num(node, 'playcount'),
    dateadded: str(node, 'dateadded'),
    lockdata: node['lockdata'] != null ? String(node['lockdata']).toLowerCase() === 'true' : undefined,
    imdbId, tmdbId, tvdbId,
    ...(genres && { genres }),
    ...(tags && { tags }),
    ...(directors && { directors }),
    ...(writers && { writers }),
    ...(actors && { actors }),
    ...(art && { art }),
  };
}

// ---------------------------------------------------------------------------
// Type-specific mappers
// ---------------------------------------------------------------------------

function mapMovie(node: RawNode): MovieData {
  const studios = strArray(node, 'studio');
  const countries = strArray(node, 'country');
  return {
    ...baseFields(node),
    tagline: str(node, 'tagline'),
    sortTitle: str(node, 'sorttitle'),
    set: str(node, 'set'),
    trailer: str(node, 'trailer'),
    criticRating: num(node, 'criticrating'),
    collectionNumber: num(node, 'collectionnumber'),
    ...(studios && { studios }),
    ...(countries && { countries }),
  };
}

function mapEpisode(node: RawNode): EpisodeData {
  return {
    ...baseFields(node),
    showTitle: str(node, 'showtitle'),
    season: num(node, 'season'),
    episode: num(node, 'episode'),
    airDate: str(node, 'aired'),
    sonarId: (() => {
      const ids = node['uniqueid'];
      if (!Array.isArray(ids)) return undefined;
      const entry = (ids as RawNode[]).find((e) => str(e, '@_type') === 'sonarr');
      return entry ? str(entry, '#text') : undefined;
    })(),
  };
}

function mapShow(node: RawNode): ShowData {
  const studios = strArray(node, 'studio');
  return {
    ...baseFields(node),
    sortTitle: str(node, 'sorttitle'),
    status: str(node, 'status'),
    ...(studios && { studios }),
  };
}
