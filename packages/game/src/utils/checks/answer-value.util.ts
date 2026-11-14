/** VRs whose values are numbers (PS3.5 §6.2): compared as numbers, so `0` and `00` match. */
const NUMBER_VRS = new Set(['IS', 'DS', 'US', 'UL', 'SS', 'SL', 'FL', 'FD', 'SV', 'UV'])

/**
 * The values of a text, as DICOM separates them with `\` (PS3.5 §6.4): each trimmed of spaces and
 * of the NUL that pads a UID to an even length (PS3.5 §6.2), so a value copied with its padding
 * still matches.
 */
export function valuesOf(text: string): string[] {
  return text.split('\\').map((value) => value.replace(/^[\s\0]+|[\s\0]+$/g, ''))
}

function sameOne(given: string, expected: string, vr: string): boolean {
  if (NUMBER_VRS.has(vr)) {
    const [a, b] = [Number(given), Number(expected)]
    return given !== '' && expected !== '' && Number.isFinite(a) && a === b
  }
  // A code string is upper case by definition (PS3.5 §6.2, CS): `ct` names the same as `CT`.
  return vr === 'CS' ? given.toUpperCase() === expected.toUpperCase() : given === expected
}

/**
 * Whether the player's text gives go-dicom's decoded value: value by value, in order, each
 * trimmed of spaces and padding; case-blind for a code string (CS); as numbers for a numeric VR.
 * Everything else, a person's name and a UID included, must match exactly. An empty answer never
 * matches.
 */
export function sameValue(given: string, expected: string, vr: string): boolean {
  if (given.trim() === '') {
    return false
  }
  const [mine, theirs] = [valuesOf(given), valuesOf(expected)]
  return mine.length === theirs.length && mine.every((value, at) => sameOne(value, theirs[at] ?? '', vr))
}
