/**
 * Read and write a small JSON file without ever leaving half of one behind.
 *
 * Deck's state and its settings both live in files like this. A crash during a
 * write must leave the previous file intact, because the alternative is a
 * person whose Deck will not open on account of Deck's own bookkeeping.
 */
import fs from 'node:fs';
import path from 'node:path';

export function readJsonFile(file: string): unknown {
  try {
    const text = fs.readFileSync(file, 'utf-8');
    if (text.trim() === '') return null;
    return JSON.parse(text) as unknown;
  } catch {
    // Missing, unreadable or not JSON: all three mean "start from defaults".
    return null;
  }
}

export function writeJsonFileAtomic(file: string, value: unknown): void {
  const dir = path.dirname(file);
  fs.mkdirSync(dir, { recursive: true });
  // A unique temporary name, so two writers cannot corrupt each other's file.
  const tmp = path.join(dir, `.${path.basename(file)}.${process.pid}.${Date.now()}.tmp`);
  const handle = fs.openSync(tmp, 'w');
  try {
    fs.writeFileSync(handle, `${JSON.stringify(value, null, 2)}\n`, 'utf-8');
    fs.fsyncSync(handle);
  } finally {
    fs.closeSync(handle);
  }
  fs.renameSync(tmp, file);
}
