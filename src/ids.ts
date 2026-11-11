/** Short unique id made on the device, e.g. `loc_m3k2x9_4f7a1c`. */
export function newId(prefix: string): string {
  const time = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 8).padEnd(6, '0');
  return `${prefix}_${time}_${random}`;
}
