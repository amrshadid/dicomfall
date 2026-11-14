/**
 * What `--check` reads past when it compares a block with a fresh recording: the guest's clock,
 * which reads the host's at boot and moves on, so a file's time in `ls -l` or a timestamp in a log
 * line differs from one recording to the next. DICOM's own dates (`20240115`) and UIDs come from
 * the fixtures, never from the clock, and are compared as they are.
 */
const CLOCK_PATTERNS: readonly [RegExp, string][] = [
  // 2026-11-14T16:21:44.123Z, 2026-11-14 16:21:44+02:00, 2026-11-14 16:21
  [/\b\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?/g, '<time>'],
  // ls -l: "Nov 14 16:21", or "Nov 14  2025" for an older file
  [/\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) {1,2}\d{1,2} +(?:\d{2}:\d{2}|\d{4})\b/g, '<date>'],
  // a bare time of day, 16:21:44 or 16:21:44.123
  [/\b\d{2}:\d{2}:\d{2}(?:\.\d+)?\b/g, '<time>'],
]

/** A recording with every reading of the clock replaced by a mark, for comparing two runs. */
export function normaliseRecording(text: string): string {
  return CLOCK_PATTERNS.reduce((normal, [pattern, mark]) => normal.replace(pattern, mark), text)
}

/** The first line where a block's body and a fresh recording differ, past the clock; null when they agree. */
export function firstDifference(
  body: string,
  fresh: string
): { readonly line: number; readonly body: string; readonly fresh: string } | null {
  const before = normaliseRecording(body).split('\n')
  const after = normaliseRecording(fresh).split('\n')
  for (let at = 0; at < Math.max(before.length, after.length); at++) {
    if (before[at] !== after[at]) {
      return { line: at + 1, body: body.split('\n')[at] ?? '(no line)', fresh: fresh.split('\n')[at] ?? '(no line)' }
    }
  }
  return null
}
