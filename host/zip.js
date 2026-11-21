import { Unzip, UnzipInflate, UnzipPassThrough } from '../vendor/fflate.mjs';
import { MAX_ENTRY_BYTES, MAX_TOTAL_UNCOMPRESSED, MANIFEST_SCHEMA } from './constants.js';
import { messageOf } from './util.js';
/** CRC-32 lookup table. */
export const CRC_TABLE = (() => {
    const table = new Uint32Array(256);
    for (let index = 0; index < 256; index += 1) {
        let value = index;
        for (let bit = 0; bit < 8; bit += 1) {
            value = (value & 1) === 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
        }
        table[index] = value >>> 0;
    }
    return table;
})();
/** CRC-32 of one byte array. */
export function crc32(bytes) {
    let value = 0xffffffff;
    for (let index = 0; index < bytes.length; index += 1) {
        value = CRC_TABLE[(value ^ bytes[index]) & 0xff] ^ (value >>> 8);
    }
    return (value ^ 0xffffffff) >>> 0;
}
export function readZip(bytes, name = 'archive') {
    const crcByName = zipCrcMap(bytes);
    if (crcByName === undefined)
        throw new Error(`${name}: missing or damaged central directory`);
    const entries = new Map();
    let failure;
    let total = 0;
    const unzip = new Unzip();
    unzip.register(UnzipInflate);
    unzip.register(UnzipPassThrough);
    unzip.onfile = (file) => {
        if (failure !== undefined)
            return;
        if (file.name.endsWith('/'))
            return;
        const chunks = [];
        let size = 0;
        file.ondata = (error, chunk, final) => {
            if (failure !== undefined)
                return;
            if (error) {
                failure = new Error(`${name}/${file.name}: ${messageOf(error)}`);
                if (typeof file.terminate === 'function')
                    file.terminate();
                return;
            }
            size += chunk.length;
            total += chunk.length;
            if (size > MAX_ENTRY_BYTES) {
                failure = new Error(`${name}/${file.name}: entry exceeds ${MAX_ENTRY_BYTES} bytes`);
                if (typeof file.terminate === 'function')
                    file.terminate();
                return;
            }
            if (total > MAX_TOTAL_UNCOMPRESSED) {
                failure = new Error(`${name}: uncompressed total exceeds ${MAX_TOTAL_UNCOMPRESSED} bytes`);
                if (typeof file.terminate === 'function')
                    file.terminate();
                return;
            }
            chunks.push(chunk);
            if (final) {
                const output = joinChunks(chunks, size);
                const expected = crcByName === undefined ? undefined : crcByName.get(file.name);
                if (expected !== undefined && crc32(output) !== expected) {
                    failure = new Error(`${name}/${file.name}: CRC mismatch`);
                    if (typeof file.terminate === 'function')
                        file.terminate();
                    return;
                }
                entries.set(file.name, output);
            }
        };
        file.start();
    };
    try {
        unzip.push(bytes, true);
    }
    catch (error) {
        throw new Error(`${name}: ${messageOf(error)}`);
    }
    if (failure !== undefined)
        throw failure;
    return entries;
}
/**
 * Join byte chunks into one array.
 * @param chunks - produced chunks.
 * @param length - total byte length.
 * @returns the joined bytes.
 */
export function joinChunks(chunks, length) {
    const out = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {
        out.set(chunk, offset);
        offset += chunk.length;
    }
    return out;
}
/**
 * Read the recorded CRC-32 of every entry from the central directory.
 * fflate streams and validates the archive structure but does not expose the
 * expected checksum, so integrity is checked here.
 * @param bytes - archive bytes.
 * @returns entry name to CRC, or undefined when the directory cannot be read.
 */
export function zipCrcMap(bytes) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const end = findEndOfCentralDirectory(view, bytes.length);
    if (end < 0)
        return undefined;
    const count = view.getUint16(end + 10, true);
    let cursor = view.getUint32(end + 16, true);
    const map = new Map();
    for (let index = 0; index < count; index += 1) {
        if (cursor + 46 > bytes.length || view.getUint32(cursor, true) !== 0x02014b50)
            return undefined;
        const expected = view.getUint32(cursor + 16, true);
        const nameLength = view.getUint16(cursor + 28, true);
        const extraLength = view.getUint16(cursor + 30, true);
        const commentLength = view.getUint16(cursor + 32, true);
        const entryName = new TextDecoder().decode(bytes.subarray(cursor + 46, cursor + 46 + nameLength));
        map.set(entryName, expected);
        cursor += 46 + nameLength + extraLength + commentLength;
    }
    return map;
}
/** Find the end-of-central-directory record. */
export function findEndOfCentralDirectory(view, length) {
    const earliest = Math.max(0, length - 0xffff - 22);
    for (let offset = length - 22; offset >= earliest; offset -= 1) {
        if (offset >= 0 && view.getUint32(offset, true) === 0x06054b50)
            return offset;
    }
    return -1;
}
/**
 * Read every entry of a ZIP archive with fflate's streaming reader.
 *
 * The central directory is caller-supplied data, so every entry is bounded as
 * it is produced rather than as it is declared, and the whole archive has a
 * cumulative output budget. fflate owns the structural side (ZIP64, data
 * descriptors, malformed headers) and reports per-entry errors through the
 * file callback.
 * @param bytes - archive bytes.
 * @param name - archive label used in diagnostics.
 * @returns entry name to uncompressed bytes.
 */
/**
 * Validate the container manifest before any Session is written.
 * A newer schema is refused rather than guessed at.
 * @param outer - container entries.
 * @returns validation result and the facts worth reporting.
 */
export function readManifest(outer) {
    const bytes = outer.get('manifest.json');
    if (bytes === undefined)
        return { ok: false, reason: 'manifest.json is missing' };
    let value;
    try {
        value = JSON.parse(new TextDecoder().decode(bytes));
    }
    catch (error) {
        return { ok: false, reason: `manifest.json is not valid JSON: ${messageOf(error)}` };
    }
    if (value === null || typeof value !== 'object')
        return { ok: false, reason: 'manifest.json is not an object' };
    if (value.kind !== 'dsh-export-center/sessions') {
        return { ok: false, reason: `unsupported archive kind: ${String(value.kind)}` };
    }
    if (!Number.isSafeInteger(value.schema) || value.schema < 1) {
        return { ok: false, reason: 'manifest.json has no integer schema' };
    }
    if (value.schema > MANIFEST_SCHEMA) {
        return { ok: false, reason: `archive schema ${value.schema} is newer than this plugin supports (${MANIFEST_SCHEMA})` };
    }
    return {
        ok: true,
        info: {
            schema: value.schema,
            exportedAt: typeof value.exportedAt === 'string' ? value.exportedAt : null,
            sessions: Array.isArray(value.sessions) ? value.sessions.length : null,
            tool: typeof value.tool === 'object' && value.tool !== null ? value.tool : null,
        },
    };
}
