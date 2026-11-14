import type { MachineEvent } from '#types/definitions/event'

/** An event and the Machine's clock when it happened, in milliseconds since the Unix epoch. */
export interface TimedEvent {
  readonly timeMs: number
  readonly event: MachineEvent
}

// `on workstation archive 30 1794504832.462712`, `off workstation archive 1794504838.500000`: the
// game's own lines, stamped with bash's EPOCHREALTIME.
const FAULT_ON = /^on (\S+) (\S+) (\d+) (\d+)\.(\d{6})$/
const FAULT_OFF = /^off (\S+) (\S+) (\d+)\.(\d{6})$/

const epochMs = (seconds: string | undefined, micros: string | undefined): number =>
  Number(seconds) * 1000 + Number(micros) / 1000

function parseFault(line: string): TimedEvent | null {
  const on = FAULT_ON.exec(line)
  if (on) {
    return {
      timeMs: epochMs(on[4], on[5]),
      event: { type: 'fault_injected', link: [on[1] ?? '', on[2] ?? ''], lossPercent: Number(on[3]) },
    }
  }
  const off = FAULT_OFF.exec(line)
  return off
    ? { timeMs: epochMs(off[3], off[4]), event: { type: 'fault_cleared', link: [off[1] ?? '', off[2] ?? ''] } }
    : null
}

/**
 * Each source's parser, by the first word of its lines. go-dicom's `-events` JSON-lines log will
 * be one (`dicom <ae> <json>`, piped here by `eventPortPipe`) once a release has it; its parser
 * and every test of it take lines copied from a real run, never written by hand.
 */
const PARSERS: Readonly<Record<string, (rest: string) => TimedEvent | null>> = { fault: parseFault }

/**
 * One line of the Machine's event port: `<source> <the line as its program printed it>`. Lines
 * that tell the game nothing are `null`.
 */
export function parseEventLine(line: string): TimedEvent | null {
  const text = line.replace(/\r$/, '')
  const space = text.indexOf(' ')
  if (space === -1) {
    return null
  }
  const parse = PARSERS[text.slice(0, space)]
  return parse ? parse(text.slice(space + 1)) : null
}
