# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0] - 2026-03-01

### Added
- Complete rewrite of the original `nfo-parser` (from `metarr-media/nfo-parser`).
- Integrated `nfo-create` for shared media metadata interfaces.
- Recursive directory crawling to discover all `.nfo` files.
- Aggregate JSON output for `movies.json` and `tv-shows.json`.
- Modern dev stack: ESM, Vitest, tsup, TypeScript.
- Achieved 100% test coverage.
- CLI supporting `--aggregate`, `--dry-run`, and `--verbose` modes.
