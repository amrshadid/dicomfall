import type { Validated } from '@dicomfall/core/types'
import { type ControlReply, VM_CONTROL_TIMEOUT_MS } from '#types/definitions/vm'
import { decodeFileReply, fileReadLine, fileReadProblem } from '#utils/files/file-read.util'

type Control = (line: string, timeoutMs?: number) => Promise<ControlReply>

/**
 * A file's bytes as root reads them, apart from the player's console: what a file check judges,
 * whatever the player's shell can or cannot see. Fails with why: a bad path, no such file, too
 * large, or a Machine that stopped answering.
 */
export async function readMachineFile(control: Control, path: string): Promise<Validated<Uint8Array>> {
  const problem = fileReadProblem(path)
  if (problem !== null) {
    return { ok: false, errors: [problem] }
  }
  const reply = await control(fileReadLine(path), VM_CONTROL_TIMEOUT_MS)
  if (reply.status !== 0) {
    return { ok: false, errors: [`${path}: ${reply.output.trim() || `could not be read (status ${reply.status})`}`] }
  }
  try {
    return { ok: true, value: decodeFileReply(reply.output) }
  } catch {
    return { ok: false, errors: [`${path}: the Machine's reply was not base64`] }
  }
}
