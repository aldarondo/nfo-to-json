import fs from 'fs';
import path from 'path';

/**
 * Recursively yields the absolute path of every `.nfo` file under `dir`.
 * Traversal order is filesystem-dependent (typically alphabetical per directory).
 */
export async function* crawlDir(dir: string): AsyncGenerator<string> {
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* crawlDir(fullPath);
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.nfo')) {
      yield fullPath;
    }
  }
}
