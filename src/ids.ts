/** Short unique id for a queued operation, e.g. `op_m3k2x9_4f7a1c`. */
export function newId(prefix: string): string {
  const time = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 8).padEnd(6, '0');
  return `${prefix}_${time}_${random}`;
}

const ENTRY_ID = /^srv_(\d+)$/;

/**
 * The id for a new entry: one more than the highest `srv_<n>` among the ids
 * given. Pass every entry the device knows about, synced or still queued.
 */
export function nextEntryId(existingIds: string[]): string {
  let highest = 0;
  for (const id of existingIds) {
    const match = ENTRY_ID.exec(id);
    if (match) highest = Math.max(highest, Number(match[1]));
  }
  return `srv_${highest + 1}`;
}
