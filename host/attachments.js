import { messageOf } from './util.js';
/** Extensions accepted as image attachments, mapped to the media type. */
export const IMAGE_TYPES = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
    gif: 'image/gif',
};
/**
 * Detect a supported image media type from the entry name or its magic bytes.
 * @param name - archive entry name.
 * @param bytes - stored bytes.
 * @returns the media type, or undefined when the format is not one the image store accepts.
 */
export function mediaTypeOf(name, bytes) {
    const extension = name.slice(name.lastIndexOf('.') + 1).toLowerCase();
    if (IMAGE_TYPES[extension] !== undefined)
        return IMAGE_TYPES[extension];
    if (bytes.length >= 8) {
        if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47)
            return 'image/png';
        if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
            return 'image/jpeg';
        if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46)
            return 'image/gif';
        if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46
            && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50)
            return 'image/webp';
    }
    return undefined;
}
/**
 * Re-save every attachment carried by one package.
 * @param attachments - optional attachment service.
 * @param entries - attachment bytes keyed by archive name.
 * @param counters - report counters updated in place.
 * @returns how many images and files were stored.
 */
export async function restoreAttachments(attachments, entries, counters) {
    const result = { images: 0, files: 0 };
    if (attachments === undefined) {
        if (entries.length > 0)
            counters.failed.push({ entry: '(all)', reason: 'attachment service unavailable' });
        return result;
    }
    for (const [name, bytes] of entries) {
        const base = name.slice(name.lastIndexOf('/') + 1);
        try {
            if (name.startsWith('media/')) {
                const mediaType = mediaTypeOf(name, bytes);
                if (mediaType !== undefined) {
                    try {
                        const saved = await attachments.saveImage({ data: bytes, mediaType, name: base });
                        const expectedId = base.includes('.') ? base.slice(0, base.lastIndexOf('.')) : base;
                        if (saved !== undefined && saved !== null && typeof saved.id === 'string'
                            && saved.id !== base && saved.id !== expectedId) {
                            counters.idMismatch.push({ entry: name, expected: expectedId, received: saved.id });
                        }
                        counters.images += 1;
                        result.images += 1;
                        continue;
                    }
                    catch (error) {
                        // An image the store refuses (unknown or oversized format) is kept
                        // verbatim as a file so the bytes still travel with the Session.
                        await attachments.saveFile({ data: bytes, name: base });
                        counters.files += 1;
                        result.files += 1;
                        counters.converted.push({ entry: name, reason: messageOf(error) });
                        continue;
                    }
                }
                await attachments.saveFile({ data: bytes, name: base });
                counters.files += 1;
                result.files += 1;
                counters.converted.push({ entry: name, reason: 'unsupported image format; stored as a file' });
            }
            else if (name.startsWith('files/')) {
                await attachments.saveFile({ data: bytes, name: base });
                counters.files += 1;
                result.files += 1;
            }
        }
        catch (error) {
            counters.failed.push({ entry: name, reason: messageOf(error) });
        }
    }
    return result;
}
