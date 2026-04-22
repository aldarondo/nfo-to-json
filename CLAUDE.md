# nfo-to-json

## What This Project Is
Recursive directory crawler that parses Kodi/Jellyfin .nfo XML files and converts them to JSON. Supports movie, TV show, and episode formats with type-safe parsing. Can output individual .json files per .nfo or aggregate all results into unified movies.json and tv-shows.json files. Built as a modern rewrite using shared interfaces from nfo-create.

## Tech Stack
- Node.js / TypeScript
- vitest (testing)
- tsup (bundler)
- ESLint

## Key Decisions
- Aggregate mode (--aggregate) produces unified JSON files for easy downstream processing
- Uses shared type interfaces from nfo-create for consistency
- CLI supports --dry-run and --verbose flags
- Production-ready with full test coverage

## Session Startup Checklist
1. Read ROADMAP.md to find the current active task
2. Check MEMORY.md if it exists — it contains auto-saved learnings from prior sessions
3. Run `npm install` if node_modules are stale
4. Run `npm test` to verify all tests pass before making changes
5. Do not make architectural changes without confirming with Charles first

## Key Files
- `src/` — library source and CLI entry point
- `test/` — vitest tests
- `samples/` — sample .nfo files for testing
- `dist/` — compiled output
- `CHANGELOG.md` — version history

---
@~/Documents/GitHub/CLAUDE.md

## Git Rules
- Never create pull requests. Push directly to main.
- solo/auto-push OK
