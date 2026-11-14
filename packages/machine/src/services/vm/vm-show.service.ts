import type { Validated } from '@dicomfall/core/types'
import type { ShowReading } from '#types/definitions/show'
import { type ControlReply, VM_CONTROL_TIMEOUT_MS } from '#types/definitions/vm'
import { fileReadProblem, shellQuote } from '#utils/files/file-read.util'
import { aeOfLabPath, parseShowJson, showJsonLine } from '#utils/files/show-json.util'

type Control = (line: string, timeoutMs?: number) => Promise<ControlReply>

const STDERR_MARK = '__DF_STDERR__'

/**
 * go-dicom's own reading of a file, `go-dicom show <path> --json` run as root apart from the
 * player's console: what the File inspector draws and the file checks judge. A file in an AE's
 * receive folder is read in that AE's namespace (`ae` overrides it); the rest of `/lab` is shared.
 * Fails with why: a bad path, a file go-dicom refuses (its own words), a reply that is not the
 * schema this game reads, or a Machine that stopped answering.
 */
export async function readMachineShow(
  control: Control,
  path: string,
  ae: string | null = aeOfLabPath(path)
): Promise<Validated<ShowReading>> {
  const problem = fileReadProblem(path)
  if (problem !== null) {
    return { ok: false, errors: [problem] }
  }
  const show = showJsonLine(path)
  // stderr goes after a marker: a warning printed beside the JSON must not make it unreadable. A
  // subshell, so its exit sets the line's status without ending root's own shell.
  const line = `(${ae === null ? show : `ip netns exec ${shellQuote(ae)} ${show}`} 2>/tmp/df-show.err; s=$?; echo ${STDERR_MARK}; cat /tmp/df-show.err; exit $s)`
  const reply = await control(line, VM_CONTROL_TIMEOUT_MS)
  const output = reply.output.replaceAll('\r', '')
  const mark = output.lastIndexOf(STDERR_MARK)
  const stdout = mark === -1 ? output : output.slice(0, mark)
  const stderr = mark === -1 ? '' : output.slice(mark + STDERR_MARK.length).trim()
  if (reply.status !== 0) {
    return { ok: false, errors: [`${path}: ${stderr || stdout.trim() || `go-dicom exited with ${reply.status}`}`] }
  }
  const reading = parseShowJson(stdout)
  if (!reading.ok) {
    return { ok: false, errors: reading.errors.map((error) => `${path}: ${error}`) }
  }
  // go-dicom 1.9.0's --json still prints a reading of a file it could not read an element from,
  // where the text form refuses it ("does not look like a DICOM file"); refuse it the same way.
  if (reading.value.fileMeta.length === 0 && reading.value.dataSet.length === 0) {
    const why = reading.value.warnings.join('; ')
    return { ok: false, errors: [`${path}: go-dicom read no element from it${why === '' ? '' : ` (${why})`}`] }
  }
  return reading
}
