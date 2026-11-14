import { VM_READ_MAX_BYTES } from '#types/definitions/vm'

/** An absolute path on one line: the control channel reads a line at a time. */
const READABLE_PATH = /^\/[^\n\r\0]*$/

/** A word the shell takes as it is, whatever it holds. */
export const shellQuote = (text: string): string => `'${text.replaceAll("'", `'\\''`)}'`

/** Why `path` cannot be read as root, or null when it can be asked for. */
export function fileReadProblem(path: string): string | null {
  return READABLE_PATH.test(path) ? null : `Expected an absolute path on one line, got "${path}"`
}

/**
 * Root's line that prints a file as base64: any byte survives the channel, and the reply's end
 * marker, with its underscores, can never appear inside it. Exits non-zero, saying why, for a
 * path that is no regular file or one too large to send. Check `fileReadProblem` first.
 */
export function fileReadLine(path: string, maxBytes = VM_READ_MAX_BYTES): string {
  const file = shellQuote(path)
  return [
    `if [ ! -f ${file} ]; then echo 'not a regular file'; false`,
    `elif [ "$(stat -c %s ${file})" -gt ${maxBytes} ]; then echo 'larger than ${maxBytes} bytes'; false`,
    `else base64 ${file}; fi`,
  ].join('; ')
}

/** The bytes in a base64 reply; base64 breaks its lines, and a raw channel may add `\r`. */
export function decodeFileReply(output: string): Uint8Array {
  const text = atob(output.replace(/\s+/g, ''))
  return Uint8Array.from(text, (char) => char.charCodeAt(0))
}
