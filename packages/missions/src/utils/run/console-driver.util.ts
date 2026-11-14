import type { MissionDefinition } from '@dicomfall/game/types'
import type { VmSession, VmShellUpdate } from '@dicomfall/machine/types'
import { startLine, startPort } from '#utils/record/record-lab.util'
import { commandOutput, echoed } from '#utils/record/terminal-text.util'

// The recorder's way of driving the Machine (scripts/record.ts), for the golden runs: lines typed
// at the console as a player types them, each awaited until the prompt that ends it. Not in the
// barrel: only the Node scripts drive a session this way.

const COMMAND_TIMEOUT_MS = 120_000
const SETTLE_TIMEOUT_MS = 30_000
/** A lab with no port to wait for has settled once nothing has changed for a few seconds (MISSIONS.md, The lab). */
const QUIET_MS = 3_000
const POLL_MS = 100
const CTRL_C = '\u0003'
const MAX_TYPING_ATTEMPTS = 3
const LOST_AFTER_MS = 2_000
/** Printed after a typed line with its exit status, so the line's own echo stays as the player typed it. */
const STATUS_MARK = '__DF_EXIT__'

const wait = (ms: number) => new Promise<void>((done) => setTimeout(done, ms))

async function until(what: string, ok: () => boolean | Promise<boolean>, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (!(await ok())) {
    if (Date.now() > deadline) {
      throw new Error(`timed out waiting for ${what}`)
    }
    await wait(POLL_MS)
  }
}

/** What one typed line showed, its exit status, and why it is no clean run when it is not. */
export interface TypedLine {
  readonly output: string
  /** null when the status could not be read. */
  readonly status: number | null
  readonly problem: string | null
}

export interface ConsoleDriver {
  /** Pass to `session.start` as its console output. */
  readonly onOutput: (bytes: Uint8Array) => void
  /** Pass to `session.start` as its shell updates. */
  readonly onShell: (update: VmShellUpdate) => void
  /** Types a line at an AE's console and waits for the prompt that ends it, then reads its exit status. */
  readonly type: (ae: string, command: string) => Promise<TypedLine>
  /** The lab's `start` commands, each in its AE, then the wait until each listens on its port; null when settled. */
  readonly startServices: (mission: MissionDefinition) => Promise<string | null>
  /** The console's AE, as the Machine last said. */
  readonly ae: () => string | null
}

/** Drives a session's console the way the recorder does. */
export function createConsoleDriver(session: VmSession): ConsoleDriver {
  const utf8 = new TextDecoder('utf-8')
  let shown = ''
  let finished = 0
  const finishes: number[] = []
  let consoleAe: string | null = null

  const quiet = async () => {
    let seen = -1
    await until(
      'the console to settle',
      () => {
        const settled = seen === shown.length
        seen = shown.length
        return settled
      },
      10_000
    ).catch(() => undefined)
  }

  /** The first finish since `fromFinish` whose prompt came after the command's echo. */
  const finishOf = (command: string, from: number, fromFinish: number): number | null =>
    finishes.slice(fromFinish).find((at) => at >= from && echoed(shown.slice(from, at), command)) ?? null

  const typeRaw = async (ae: string, command: string): Promise<{ output: string; problem: string | null }> => {
    if (consoleAe !== ae) {
      await session.selectAe(ae)
    }
    for (let attempt = 1; attempt <= MAX_TYPING_ATTEMPTS; attempt++) {
      await quiet()
      const from = shown.length
      const fromFinish = finishes.length
      session.input(`${command}\r`)
      let end: number | null = null
      let strayAt: number | null = null
      try {
        await until(
          `"${command}" to finish`,
          () => {
            end = finishOf(command, from, fromFinish)
            if (end !== null) {
              return true
            }
            // A prompt with no echo yet may be overtaken by the echo; one still alone after a while was all there was.
            if (finishes.length > fromFinish && !echoed(shown.slice(from), command)) {
              strayAt ??= Date.now()
              return Date.now() - strayAt > LOST_AFTER_MS
            }
            return false
          },
          COMMAND_TIMEOUT_MS
        )
      } catch {
        // A command waiting for input never ends on its own: the player would press Ctrl-C.
        session.input(CTRL_C)
        await until('the prompt after Ctrl-C', () => finishes.length > fromFinish, 10_000).catch(() => undefined)
        return {
          output: commandOutput(shown.slice(from), command, ae),
          problem: `it did not finish in ${COMMAND_TIMEOUT_MS / 1000} s`,
        }
      }
      if (end !== null) {
        return { output: commandOutput(shown.slice(from, end), command, ae), problem: null }
      }
    }
    return { output: '', problem: `the console never echoed the command in ${MAX_TYPING_ATTEMPTS} tries` }
  }

  return {
    onOutput: (bytes) => {
      shown += utf8.decode(bytes, { stream: true })
    },
    onShell: (update) => {
      for (let more = update.commandsFinished - finished; more > 0; more--) {
        finishes.push(shown.length)
      }
      finished = update.commandsFinished
      consoleAe = update.ae
    },
    type: async (ae, command) => {
      const typed = await typeRaw(ae, command)
      if (typed.problem !== null) {
        return { ...typed, status: null }
      }
      const asked = await typeRaw(ae, `echo ${STATUS_MARK}$?`)
      const status = new RegExp(`${STATUS_MARK}(\\d+)`).exec(asked.output)?.[1]
      return { ...typed, status: status === undefined ? null : Number(status) }
    },
    startServices: async (mission) => {
      const ports: { ae: string; port: number }[] = []
      for (const ae of mission.lab.aes) {
        for (const command of ae.start) {
          const line = startLine(ae.name, command)
          if (line === null) {
            return `start command in ${ae.name} has a single quote, which the Machine's start line cannot hold: ${command}`
          }
          const reply = await session.control(line)
          if (reply.status !== 0) {
            return `start command in ${ae.name} exited with ${reply.status}: ${reply.output.trim()}`
          }
          const port = startPort(command)
          if (port !== null) {
            ports.push({ ae: ae.name, port })
          }
        }
      }
      if (ports.length === 0) {
        await wait(mission.lab.aes.some((ae) => ae.start.length > 0) ? QUIET_MS : 0)
        return null
      }
      for (const { ae, port } of ports) {
        const listening = async () =>
          (await session.control(`ip netns exec ${ae} ss -Hltn "sport = :${port}"`)).output.trim() !== ''
        try {
          await until(`${ae} to listen on ${port}`, listening, SETTLE_TIMEOUT_MS)
        } catch (error) {
          return error instanceof Error ? error.message : String(error)
        }
      }
      return null
    },
    ae: () => consoleAe,
  }
}
