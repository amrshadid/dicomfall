import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { decodeFileReply, fileReadLine, fileReadProblem, shellQuote } from '#utils/files/file-read.util'

const FIXTURE = fileURLToPath(new URL('../../../../fixtures/out/ct-explicit-le.dcm', import.meta.url))

/** What busybox's base64 prints for these bytes: lines of 76 characters, each ended by a newline. */
function busyboxBase64(bytes: Uint8Array): string {
  const text = Buffer.from(bytes).toString('base64')
  const lines = text.match(/.{1,76}/g) ?? []
  return `${lines.join('\n')}\n`
}

describe('reading a file as root', () => {
  it('gets the fixture’s bytes back from base64 in broken lines, whatever the channel adds', () => {
    const bytes = new Uint8Array(readFileSync(FIXTURE))
    expect(decodeFileReply(busyboxBase64(bytes))).toEqual(bytes)
    expect(decodeFileReply(busyboxBase64(bytes).replaceAll('\n', '\r\n'))).toEqual(bytes)
    expect(decodeFileReply('')).toEqual(new Uint8Array())
  })

  it('quotes the path, so any file name is one word to the shell', () => {
    expect(shellQuote("/lab/it's here.dcm")).toBe(`'/lab/it'\\''s here.dcm'`)
    expect(fileReadLine('/lab/$(reboot).dcm', 100)).toBe(
      [
        "if [ ! -f '/lab/$(reboot).dcm' ]; then echo 'not a regular file'; false",
        `elif [ "$(stat -c %s '/lab/$(reboot).dcm')" -gt 100 ]; then echo 'larger than 100 bytes'; false`,
        "else base64 '/lab/$(reboot).dcm'; fi",
      ].join('; ')
    )
  })

  it('asks only for an absolute path on one line', () => {
    expect(fileReadProblem('/lab/ct-explicit-le.dcm')).toBeNull()
    expect(fileReadProblem('lab/ct.dcm')).not.toBeNull()
    expect(fileReadProblem('/lab/a\nreboot')).not.toBeNull()
  })
})
