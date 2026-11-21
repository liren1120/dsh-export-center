


/** Largest container archive accepted from the browser. */
export const MAX_UPLOAD_BYTES = 256 * 1024 * 1024



/** Largest declared uncompressed size of one archive entry. */
export const MAX_ENTRY_BYTES = 64 * 1024 * 1024



/** Largest total uncompressed bytes one import may inflate. */
export const MAX_TOTAL_UNCOMPRESSED = 512 * 1024 * 1024



/** Most archive ids remembered for duplicate reporting. */
export const MAX_REMEMBERED_ARCHIVES = 500



/** Most Session logs one import writes. */
export const MAX_SESSIONS = 500



/** Most events one Session log may carry. */
export const MAX_EVENTS = 500000



/** Most events one persistence append writes. */
export const APPEND_BATCH = 200



/** Current logical Session format version. */
export const SESSION_FORMAT_VERSION = 4



/** Newest container manifest schema this build understands. */
export const MANIFEST_SCHEMA = 2
