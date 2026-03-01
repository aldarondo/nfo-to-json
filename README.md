# nfo-to-json

Recursive directory crawler that parses Kodi/Jellyfin `.nfo` files and converts them to JSON.

This package is a complete rewrite based on [nfo-parser](https://github.com/metarr-media/nfo-parser), utilizing [nfo-create](https://github.com/aldarondo/nfo-create) for robust type definitions and standardized media metadata interfaces.

## Features

- **Recursive Scanning**: Crawls entire directory trees for `.nfo` files.
- **Type-Safe Parsing**: Supports Movie, TV Show, and Episode NFO formats.
- **Aggregate Output**: Can produce unified `movies.json` and `tv-shows.json` files.
- **Detailed Metadata**: Extracts actors (with roles and thumbs), unique IDs (IMDb, TMDb, TVDb), artwork (posters, fanart), and more.
- **Security-Minded**: Includes file size caps and prototype pollution protection.
- **Modern Tooling**: Built with TypeScript, Vitest, and tsup for high performance and reliability.

## Installation

```bash
npm install -g nfo-to-json
```

## CLI Usage

### Basic Conversion
Converts each `.nfo` file into a corresponding `.json` file in the same directory.

```bash
nfo-to-json --input /path/to/media
```

### Aggregate Mode
Collects all discovered records and writes them into two unified files: `movies.json` and `tv-shows.json`.

```bash
nfo-to-json --input /path/to/media --aggregate --output /path/to/output
```

### Options

- `-i, --input <path>`: Directory to scan for `.nfo` files (required).
- `--aggregate`: Write `movies.json` + `tv-shows.json` instead of individual files.
- `--output <path>`: Output directory for aggregate files (defaults to input path).
- `--dry-run`: Preview actions without touching the filesystem.
- `-v, --verbose`: Show detailed per-file processing logs.

## Programmatic API

```typescript
import { parseNfo, crawlDir, buildMoviesJson, buildTvShowsJson } from 'nfo-to-json';

// Parse a single file
const result = await parseNfo('movie.nfo');
console.log(result.type); // 'movie', 'episode', or 'tvshow'
console.log(result.data.title);

// Crawl a directory
for await (const filePath of crawlDir('./media')) {
  console.log('Found:', filePath);
}
```

## Attribution

This project is a modern rewrite of [metarr-media/nfo-parser](https://github.com/metarr-media/nfo-parser). It has been refactored to use ESM, Vitest, and shared interfaces from [nfo-create](https://github.com/aldarondo/nfo-create).

## License

MIT