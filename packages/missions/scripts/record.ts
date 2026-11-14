// Fills every `recorded` block of the missions' stories with what the Machine really printed, so no
// output in a story is ever typed (docs/MISSIONS.md, Accuracy). Boots the built image in Node once,
// builds each mission's lab on the clean boot, and runs in the console, in story order, the commands
// the guide asks the player to type and each block's own command; the block's body becomes the
// command's output. A block whose command needs go-dicom is left as it is while the image has none.
// An empty output is run once more, then fails, unless the block is written ```recorded! <command>:
// a command that truly prints nothing.
// Usage: node packages/missions/scripts/record.ts [--check] [mission-id …]   (after pnpm vm:image)
//        --check   records again and compares with each block, writing nothing; exits 1 on a difference
//        DICOMFALL_CONTENT_DIR=<folder> records a content folder other than packages/missions/content.
// Each mission's run log: node_modules/.cache/dicomfall-record/<mission-id>.log
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { MissionDefinition } from '@dicomfall/game/types'
import { createVmSession } from '@dicomfall/machine/services'
import { VM_GO_DICOM, type VmPhase } from '@dicomfall/machine/types'
import { STORY_FILE } from '#types/definitions/content'
import { readContentDir } from '#utils/loader/disk-content.util'
import { loadContent } from '#utils/loader/load-content.util'
import { firstDifference } from '#utils/record/record-check.util'
import { labNetwork, startLine, startPort } from '#utils/record/record-lab.util'
import { labSkipReason, type MachineAbilities, skipReason } from '#utils/record/record-skip.util'
import {
  emptinessProblem,
  isPlaceholder,
  type RecordedBlock,
  type RecordStep,
  readRecordedStory,
  recordPlan,
  replaceRecordedBodies,
  unsafeBody,
} from '#utils/record/recorded-block.util'
import { commandOutput, echoed, stripTerminalCodes } from '#utils/record/terminal-text.util'

const here = dirname(fileURLToPath(import.meta.url))
const repo = join(here, '../../..')
const vm = join(repo, 'apps/web/public/vm')
const logDir = join(repo, 'node_modules/.cache/dicomfall-record')
// pnpm runs a script from the package's folder; a relative path means the folder it was typed in.
const fromCaller = (path: string) => resolve(process.env.INIT_CWD ?? process.cwd(), path)
const contentDir = process.env.DICOMFALL_CONTENT_DIR
  ? fromCaller(process.env.DICOMFALL_CONTENT_DIR)
  : join(here, '../content')

/** The game's console is 90 columns wide (apps/web's CONSOLE_COLS): programs that ask print for that width. */
const CONSOLE = { rows: 40, cols: 90 }
const COMMAND_TIMEOUT_MS = 120_000
const SETTLE_TIMEOUT_MS = 30_000
/** A lab with no port to wait for has settled once nothing has changed for a few seconds (MISSIONS.md, The lab). */
const QUIET_MS = 3_000
const POLL_MS = 100
const CTRL_C = '\u0003'
const MAX_TYPING_ATTEMPTS = 3
const LOST_AFTER_MS = 2_000

const started = Date.now()
const wait = (ms: number) => new Promise<void>((done) => setTimeout(done, ms))
const stamp = () => `[${((Date.now() - started) / 1000).toFixed(1)}s]`
const say = (text: string) => console.log(`${stamp()} ${text}`)

const args = process.argv.slice(2)
const check = args.includes('--check')
const unknownFlags = args.filter((arg) => arg.startsWith('-') && arg !== '--check')
const wanted = args.filter((arg) => !arg.startsWith('-'))
if (unknownFlags.length > 0) {
  console.error(`unknown option ${unknownFlags.join(' ')}; usage: record.ts [--check] [mission-id …]`)
  process.exit(2)
}

// v86 in Node reads its files from disk; the session fetches only manifest.json, so that read is served from disk too.
const fetchUrl = globalThis.fetch
globalThis.fetch = async (input, init) => {
  const url = String(input)
  return url.startsWith('/') ? new Response(await readFile(url)) : fetchUrl(input, init)
}

/** One mission's story and what to run for it. */
interface Planned {
  readonly mission: MissionDefinition
  readonly storyPath: string
  readonly markdown: string
  readonly steps: readonly RecordStep[]
}

/** Every mission asked for, with its plan; or every problem that stops it from being recorded. */
function planMissions(): { planned: Planned[]; problems: string[] } {
  const loaded = loadContent(readContentDir(contentDir))
  if (!loaded.ok) {
    return { planned: [], problems: [`${contentDir} does not load:`, ...loaded.errors] }
  }
  const { game, folderOf } = loaded.value
  const unknown = wanted.filter((id) => !game.missions.some((mission) => mission.id === id))
  if (unknown.length > 0) {
    return { planned: [], problems: [`no mission ${unknown.join(', ')} in ${contentDir}`] }
  }
  const problems: string[] = []
  const planned = game.missions
    .filter((mission) => wanted.length === 0 || wanted.includes(mission.id))
    .flatMap((mission): Planned[] => {
      const storyPath = join(contentDir, folderOf(mission.id) ?? '', STORY_FILE)
      const markdown = readFileSync(storyPath, 'utf8')
      const story = readRecordedStory(markdown)
      const aes = new Set(mission.lab.aes.map((ae) => ae.name))
      const where = (line: number) => `${storyPath}:${line}`
      problems.push(
        ...story.problems.map((problem) => `${where(problem.line)}: ${problem.message}`),
        ...story.blocks
          .filter((block) => block.ae !== null && !aes.has(block.ae))
          .map((block) => `${where(block.line)}: no AE "${block.ae}" in the mission's lab`)
      )
      return [{ mission, storyPath, markdown, steps: recordPlan(story, mission.lab.console) }]
    })
  return { planned, problems }
}

/** The Machine as the recorder drives it: the session, everything the console showed, and its finished commands. */
const session = createVmSession()
let phase: VmPhase = 'off'
let detail: string | null = null
let shown = ''
let finished = 0
/** Where the screen stood at each finished command: the prompt that ended it is just before. */
const finishes: number[] = []
let consoleAe: string | null = null
const utf8 = new TextDecoder('utf-8')

async function until(what: string, ok: () => boolean | Promise<boolean>, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (!(await ok())) {
    if (Date.now() > deadline) {
      throw new Error(`timed out waiting for ${what}`)
    }
    await wait(POLL_MS)
  }
}

async function boot(): Promise<MachineAbilities> {
  await session.start(
    { baseUrl: `${vm}/`, wasmUrl: join(repo, 'packages/machine/node_modules/v86/build/v86.wasm'), fresh: true },
    (bytes) => {
      shown += utf8.decode(bytes, { stream: true })
    },
    (status) => {
      phase = status.phase
      detail = status.detail
    },
    undefined,
    (update) => {
      for (let more = update.commandsFinished - finished; more > 0; more--) {
        finishes.push(shown.length)
      }
      finished = update.commandsFinished
      consoleAe = update.ae
    }
  )
  await until('Linux to boot', () => phase === 'ready' || phase === 'failed', 300_000)
  if (phase !== 'ready') {
    throw new Error(`the Machine did not boot: ${detail ?? phase}`)
  }
  session.resizeTerminal(CONSOLE.rows, CONSOLE.cols)
  return { goDicom: (await session.control(`[ -x ${VM_GO_DICOM} ]`)).status === 0 }
}

/** Resolves once the console has printed nothing new for a moment: a shell just started or moved is settled. */
async function quiet(): Promise<void> {
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

/**
 * The first command finished since `fromFinish` whose prompt came after this command's echo, as the
 * screen offset where that prompt ended; null while there is none. A finish counted before the echo
 * answers something else: an Enter the shell had not read yet, or keys lost while it was starting.
 */
function finishOf(command: string, from: number, fromFinish: number): number | null {
  return finishes.slice(fromFinish).find((at) => at >= from && echoed(shown.slice(from, at), command)) ?? null
}

/** What one typed line showed, and why it is no recording when it is not. */
interface Typed {
  readonly output: string
  readonly raw: string
  readonly problem: string | null
}

/**
 * Types a line at the console, as the player does, and returns what it showed until the prompt that
 * ended it. A line the shell never echoed was lost on the way in, and is typed again.
 */
async function type(ae: string, command: string): Promise<Typed> {
  if (consoleAe !== ae) {
    await session.selectAe(ae)
  }
  let raw = ''
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
      raw = shown.slice(from)
      return {
        output: commandOutput(raw, command, ae),
        raw,
        problem: `it did not finish in ${COMMAND_TIMEOUT_MS / 1000} s`,
      }
    }
    if (end !== null) {
      raw = shown.slice(from, end)
      return { output: commandOutput(raw, command, ae), raw, problem: null }
    }
    raw = shown.slice(from)
  }
  return { output: '', raw, problem: `the console never echoed the command in ${MAX_TYPING_ATTEMPTS} tries` }
}

/** The lab's `start` commands, each in its AE, then the wait until each listens on its port. */
async function startServices(mission: MissionDefinition, log: (text: string) => void): Promise<string | null> {
  const ports: { ae: string; port: number }[] = []
  for (const ae of mission.lab.aes) {
    for (const command of ae.start) {
      const line = startLine(ae.name, command)
      if (line === null) {
        return `start command in ${ae.name} has a single quote, which the Machine's start line cannot hold: ${command}`
      }
      log(`start in ${ae.name}: ${command}`)
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
}

type Outcome =
  | { readonly kind: 'recorded'; readonly block: RecordedBlock; readonly output: string }
  | { readonly kind: 'skipped'; readonly block: RecordedBlock; readonly reason: string }
  | { readonly kind: 'failed'; readonly block: RecordedBlock; readonly reason: string }

async function recordMission(planned: Planned, abilities: MachineAbilities): Promise<Outcome[]> {
  const { mission, steps } = planned
  const logPath = join(logDir, `${mission.id}.log`)
  mkdirSync(logDir, { recursive: true })
  writeFileSync(
    logPath,
    `${new Date().toISOString()} ${check ? 'check' : 'record'} ${mission.id} (${planned.storyPath})\n`
  )
  const log = (text: string) => appendFileSync(logPath, `${stamp()} ${text}\n`)
  const blocks = steps.flatMap((step) => (step.kind === 'record' ? [step.block] : []))

  const labSkip = labSkipReason(mission.lab, abilities)
  if (labSkip !== null) {
    log(`every block skipped: ${labSkip}`)
    return blocks.map((block) => ({ kind: 'skipped', block, reason: labSkip }))
  }
  // A new network starts from the clean boot, so nothing an earlier mission did is left.
  const built = await session.setupNetwork(labNetwork(mission.lab))
  if (!built.ok) {
    const reason = `the lab could not be built: ${built.errors.join('; ')}`
    log(reason)
    return blocks.map((block) => ({ kind: 'failed', block, reason }))
  }
  log(`lab built: ${mission.lab.aes.map((ae) => ae.name).join(', ')}; console in ${mission.lab.console}`)
  const unsettled = await startServices(mission, log)
  if (unsettled !== null) {
    log(unsettled)
    return blocks.map((block) => ({ kind: 'failed', block, reason: unsettled }))
  }
  await session.selectAe(mission.lab.console)

  const outcomes: Outcome[] = []
  for (const step of steps) {
    const skip = skipReason(step.kind === 'type' ? step.command : step.block.command, abilities)
    if (step.kind === 'type') {
      if (skip !== null) {
        log(`story.md:${step.line} typed in ${step.ae}, not run (${skip}): ${step.command}`)
        continue
      }
      const ran = await type(step.ae, step.command)
      log(`story.md:${step.line} typed in ${step.ae}: ${step.command}${ran.problem ? ` (${ran.problem})` : ''}`)
      log(stripTerminalCodes(ran.raw))
      continue
    }
    const { block } = step
    if (skip !== null) {
      log(`story.md:${block.line} skipped (${skip}): ${block.command}`)
      outcomes.push({ kind: 'skipped', block, reason: skip })
      continue
    }
    let ran = await type(step.ae, block.command)
    log(`story.md:${block.line} recorded in ${step.ae}: ${block.command}`)
    log(stripTerminalCodes(ran.raw))
    if (ran.problem === null && ran.output === '' && !block.expectsEmpty) {
      // An output block that came back empty is more likely a lost recording than a true one.
      log(`story.md:${block.line} printed nothing; running it once more`)
      ran = await type(step.ae, block.command)
      log(stripTerminalCodes(ran.raw))
    }
    const reason = ran.problem ?? emptinessProblem(block, ran.output) ?? unsafeBody(ran.output)
    if (reason !== null) {
      log(`story.md:${block.line} failed: ${reason}`)
      outcomes.push({ kind: 'failed', block, reason })
      continue
    }
    outcomes.push({ kind: 'recorded', block, output: ran.output })
  }
  return outcomes
}

/** Writes the recordings into story.md, unless a writer changed it while the Machine ran. */
function writeStory(planned: Planned, outcomes: readonly Outcome[]): string | null {
  const current = readFileSync(planned.storyPath, 'utf8')
  if (current !== planned.markdown) {
    return `${planned.storyPath} changed while it was being recorded; nothing written, run it again`
  }
  const bodies = new Map(
    outcomes.flatMap((outcome) => (outcome.kind === 'recorded' ? [[outcome.block.line, outcome.output] as const] : []))
  )
  const next = replaceRecordedBodies(current, bodies)
  if (next !== current) {
    writeFileSync(planned.storyPath, next)
  }
  return null
}

/** What `--check` says of one block, and whether it fails the check. */
function checked(outcome: Outcome): { text: string; bad: boolean } {
  if (outcome.kind !== 'recorded') {
    return { text: `${outcome.kind} (${outcome.reason})`, bad: outcome.kind === 'failed' }
  }
  if (isPlaceholder(outcome.block)) {
    return { text: 'not recorded yet: still the placeholder', bad: true }
  }
  const difference = firstDifference(outcome.block.body, outcome.output)
  return difference === null
    ? { text: 'same as the Machine', bad: false }
    : {
        text: `differs at its line ${difference.line}:\n      story:   ${difference.body}\n      Machine: ${difference.fresh}`,
        bad: true,
      }
}

async function main(): Promise<number> {
  const { planned, problems } = planMissions()
  if (problems.length > 0) {
    console.error(problems.join('\n'))
    return 1
  }
  const withBlocks = planned.filter((plan) => plan.steps.some((step) => step.kind === 'record'))
  for (const plan of planned.filter((candidate) => !withBlocks.includes(candidate))) {
    say(`${plan.mission.id}: no recorded blocks`)
  }
  if (withBlocks.length === 0) {
    return 0
  }
  say(`booting the Machine for ${withBlocks.length} mission${withBlocks.length === 1 ? '' : 's'} (${contentDir})`)
  const abilities = await boot()
  say(`booted; go-dicom ${abilities.goDicom ? 'installed' : `not in this image (${VM_GO_DICOM})`}`)

  let bad = 0
  for (const plan of withBlocks) {
    const outcomes = await recordMission(plan, abilities)
    const count = (kind: Outcome['kind']) => outcomes.filter((outcome) => outcome.kind === kind).length
    say(`${plan.mission.id}: ${count('recorded')} recorded, ${count('skipped')} skipped, ${count('failed')} failed`)
    for (const outcome of outcomes) {
      const at = `  story.md:${outcome.block.line} ${outcome.block.command}`
      if (check) {
        const verdict = checked(outcome)
        bad += verdict.bad ? 1 : 0
        console.log(`${at}: ${verdict.text}`)
      } else {
        bad += outcome.kind === 'failed' ? 1 : 0
        console.log(`${at}: ${outcome.kind === 'recorded' ? 'recorded' : `${outcome.kind} (${outcome.reason})`}`)
      }
    }
    if (!check) {
      const refused = writeStory(plan, outcomes)
      if (refused !== null) {
        bad++
        console.error(`  ${refused}`)
      }
    }
    console.log(`  log: ${join(logDir, `${plan.mission.id}.log`)}`)
  }
  say(
    bad === 0
      ? check
        ? 'every recorded block matches the Machine'
        : 'done'
      : `${bad} block${bad === 1 ? '' : 's'} ${check ? 'not matching the Machine' : 'not recorded'}`
  )
  return bad === 0 ? 0 : 1
}

let code = 1
try {
  code = await main()
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
}
await session.stop()
process.exit(code)
