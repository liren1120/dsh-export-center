import { randomUUID } from 'node:crypto'




/**
 * Human-readable failure text.
 * @param error - unknown failure.
 * @returns message text.
 */
export function messageOf(error) {
  return error instanceof Error ? error.message : String(error)
}



/**
 * Coerce a source timestamp to a non-negative safe integer.
 * @param value - candidate timestamp.
 * @returns the timestamp when valid, otherwise the current time.
 */
export function validTime(value) {
  if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) return value
  return undefined
}



/**
 * A new durable Session id.
 * @returns `session-<uuid>`.
 */
export function sessionId() {
  return `session-${randomUUID()}`
}
