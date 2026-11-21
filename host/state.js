import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
export const STATE_DIR = process.env.DSH_EXPORT_CENTER_STATE_DIR ?? join(homedir(), '.dsh', 'export-center');
export const STATE_FILE = join(STATE_DIR, 'imports.json');
/** Archive ids this Host process has already restored, so a repeat import can be reported. */
export const importedArchives = new Map();
/** Best-effort load of the archive ids that were already imported. */
export function loadImportedArchives() {
    try {
        const value = JSON.parse(readFileSync(STATE_FILE, 'utf8'));
        if (!Array.isArray(value.entries))
            return;
        for (const entry of value.entries) {
            if (Array.isArray(entry) && typeof entry[0] === 'string' && typeof entry[1] === 'number')
                importedArchives.set(entry[0], entry[1]);
        }
    }
    catch (error) {
        // A missing or damaged state file only loses duplicate detection.
    }
}
/** Best-effort save of the archive ids seen so far. */
export function persistImportedArchives() {
    try {
        mkdirSync(STATE_DIR, { recursive: true });
        writeFileSync(STATE_FILE, JSON.stringify({ entries: [...importedArchives].slice(-1000) }));
    }
    catch (error) {
        // The import already succeeded; detection is a convenience.
    }
}
