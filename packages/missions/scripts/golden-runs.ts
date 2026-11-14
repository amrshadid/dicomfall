// Plays every mission's golden runs (solution.yaml) on the real image, through the game's own VM
// session, and judges each with the mission's own checks against go-dicom's readings of the lab,
// as live play does: once the lab has settled, then after each change, each verdict merged into
// the last. Each run starts from its own clean lab. `shell` lines are typed at the AE's console as
// the recorder types them; `select`, `answer` and `predict` are the player's actions in the
// inspector and the answer boxes. A run judged the way its solution.yaml says is written to
// src/test/runs/<mission-id>/<run-id>.json, with go-dicom's readings once per mission in
// readings.json, where the tests judge it again without a VM.
// Usage: pnpm --filter @dicomfall/missions vm:golden [mission-id …]   (after pnpm vm:image)
//        DICOMFALL_CONTENT_DIR and DICOMFALL_RUNS_DIR read the content and write the runs elsewhere.
// Each mission's log, with what every typed line printed: node_modules/.cache/dicomfall-golden/<mission-id>.log
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  type CheckResult,
  type FileReading,
  type MissionDefinition,
  type MissionVerdict,
  NO_PLAYER_ACTIONS,
  type PlayerActions,
} from '@dicomfall/game/types'
import { createVmSession, readMachineShow } from '@dicomfall/machine/services'
import { VM_GO_DICOM, type VmManifest, type VmPhase } from '@dicomfall/machine/types'
import { parse } from 'yaml'
import { readContentDir } from '#utils/loader/disk-content.util'
import { loadContent } from '#utils/loader/load-content.util'
import { labNetwork } from '#utils/record/record-lab.util'
import { createConsoleDriver } from '#utils/run/console-driver.util'
import { type GoldenChange, type GoldenRun, validateSolution } from '#utils/run/golden-run.util'
import type { LabReader } from '#utils/run/lab-readings.util'
import { createMissionJudge } from '#utils/run/live-judge.util'
import { applyChange } from '#utils/run/player-actions.util'
import { objectivesMet, type RecordedRun, type RecordedStep, recordReadings } from '#utils/run/recorded-run.util'

const SOLUTION_FILE = 'solution.yaml'
const POLL_MS = 100

const here = dirname(fileURLToPath(import.meta.url))
const repo = join(here, '../../..')
const vm = join(repo, 'apps/web/public/vm')
const logDir = join(repo, 'node_modules/.cache/dicomfall-golden')
// pnpm runs a script from the package's folder; a relative path means the folder it was typed in.
const fromCaller = (path: string) => resolve(process.env.INIT_CWD ?? process.cwd(), path)
const contentDir = process.env.DICOMFALL_CONTENT_DIR
  ? fromCaller(process.env.DICOMFALL_CONTENT_DIR)
  : join(here, '../content')
const runsDir = process.env.DICOMFALL_RUNS_DIR
  ? fromCaller(process.env.DICOMFALL_RUNS_DIR)
  : join(here, '../src/test/runs')

const started = Date.now()
const wait = (ms: number) => new Promise<void>((done) => setTimeout(done, ms))
const stamp = () => `[${((Date.now() - started) / 1000).toFixed(1)}s]`
const say = (text: string) => console.log(`${stamp()} ${text}`)

const wanted = process.argv.slice(2)
if (wanted.some((arg) => arg.startsWith('-'))) {
  console.error('usage: golden-runs.ts [mission-id …]')
  process.exit(2)
}

// v86 in Node reads its files from disk; the session fetches only manifest.json, so that read is served from disk too.
const fetchUrl = globalThis.fetch
globalThis.fetch = async (input, init) => {
  const url = String(input)
  return url.startsWith('/') ? new Response(await readFile(url)) : fetchUrl(input, init)
}

const session = createVmSession()
const driver = createConsoleDriver(session)
const control = (line: string, timeoutMs?: number) => session.control(line, timeoutMs)
const reader: LabReader = {
  readShow: (path) => readMachineShow(control, path),
  run: (line) => session.control(line),
}

/** One mission and its runs, or why it cannot be played. */
interface Planned {
  readonly mission: MissionDefinition
  readonly runs: readonly GoldenRun[]
}

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
      const path = join(contentDir, folderOf(mission.id) ?? '', SOLUTION_FILE)
      if (!existsSync(path)) {
        problems.push(`${path}: missing`)
        return []
      }
      const runs = validateSolution(parse(readFileSync(path, 'utf8')), mission)
      if (!runs.ok) {
        problems.push(...runs.errors.map((error) => `${path}: ${error}`))
        return []
      }
      return [{ mission, runs: runs.value }]
    })
  return { planned, problems }
}

/** What one run came to: its verdict and steps, and every reason it is not judged as its solution says. */
interface Played {
  readonly run: GoldenRun
  readonly verdict: MissionVerdict
  readonly steps: readonly RecordedStep[]
  /** Lines that did not run cleanly, the lab not built: the run is no recording. */
  readonly playProblems: readonly string[]
  /** How the verdict differs from what solution.yaml says. */
  readonly mismatches: readonly string[]
  /** Facts worth a writer's eye that do not fail the run: a spec offset go-dicom disagrees with. */
  readonly notes: readonly string[]
}

/** One objective's result in a few words, with its evidence. */
function describeResult(result: CheckResult): string {
  const verdict = result.passed ? 'met' : `not met (${result.failure})`
  switch (result.kind) {
    case 'selected':
      return `${verdict}: ${result.target}${result.part ? ` ${result.part}` : ''} is ${result.expected ? `${result.expected.from}-${result.expected.to}` : '?'} in ${result.file}; marked ${result.marked ? `${result.marked.from}-${result.marked.to} in ${result.marked.file}` : 'nothing'}`
    case 'answer':
      return `${verdict}: go-dicom ${JSON.stringify(result.expected)} (VR ${result.vr}); given ${JSON.stringify(result.given)}`
    case 'offset':
      return `${verdict}: go-dicom ${result.expected}, spec ${result.declared}; given ${result.given}`
    case 'grouped':
      return `${verdict}: ${result.found.length} files under ${result.into}, ${result.missing.length} missing`
    case 'file':
      return `${verdict}: transfer syntax ${result.transferSyntax}; ${result.attributes.map((attribute) => `${attribute.tag}=${attribute.found}`).join(' ')}`
    case 'absent':
      return `${verdict}: present ${result.present}`
    default:
      return verdict
  }
}

async function playRun(mission: MissionDefinition, run: GoldenRun, log: (text: string) => void): Promise<Played> {
  const playProblems: string[] = []
  const notes: string[] = []
  const steps: RecordedStep[] = []
  log(`--- run ${run.id} (must ${run.passes ? 'pass' : 'not pass'})`)
  // A new network starts from the clean boot, so nothing an earlier run did is left.
  const built = await session.setupNetwork(labNetwork(mission.lab))
  if (!built.ok) {
    playProblems.push(`the lab could not be built: ${built.errors.join('; ')}`)
  }
  const unsettled = built.ok ? await driver.startServices(mission) : null
  if (unsettled !== null) {
    playProblems.push(unsettled)
  }
  await session.selectAe(mission.lab.console)
  const judge = createMissionJudge(mission, reader)
  await judge.start()

  let actions: PlayerActions = NO_PLAYER_ACTIONS
  const judgeStep = async (change: GoldenChange | null, reread: boolean) => {
    const verdict = await judge.judge(actions, reread)
    const readings = judge.readings()
    if (readings !== null) {
      steps.push({ change, actions, readings: recordReadings(readings, table) })
    }
    return verdict
  }
  // Live play judges once the lab has settled, before the player does anything.
  const atStart = await judgeStep(null, true)
  const metAtStart = atStart.objectives.filter((objective) => objective.result.passed)
  for (const change of run.changes) {
    if ('shell' in change) {
      for (const line of change.shell) {
        const typed = await driver.type(change.ae, line)
        log(
          `${change.ae}:~# ${line}\n${typed.output}\n(exit ${typed.status ?? '?'}${typed.problem ? `, ${typed.problem}` : ''})`
        )
        if (typed.problem !== null) {
          playProblems.push(`"${line}": ${typed.problem}`)
        } else if (typed.status !== 0 && change.fails !== true) {
          playProblems.push(
            `"${line}" exited with ${typed.status}, and the change is not marked fails: true; it printed: ${typed.output.trim().split('\n').slice(0, 3).join(' | ')}`
          )
        }
      }
    }
    actions = applyChange(actions, change)
    await judgeStep(change, 'shell' in change)
  }
  const verdict = judge.verdict() ?? atStart
  for (const objective of verdict.objectives) {
    log(`${objective.objectiveId}: ${describeResult(objective.result)}`)
    const { result } = objective
    if (result.kind === 'offset' && result.expected !== null && result.expected !== result.declared) {
      notes.push(`${objective.objectiveId}: the spec's offset ${result.declared} is not go-dicom's ${result.expected}`)
    }
  }
  const mismatches = [
    ...metAtStart.map(
      (objective) => `${objective.objectiveId} is met by the lab as it starts: ${describeResult(objective.result)}`
    ),
    ...(verdict.passed === run.passes
      ? []
      : [
          `expected ${run.passes ? 'a pass' : 'no pass'}, judged ${verdict.passed ? 'passed' : 'not passed'}: ${verdict.objectives
            .filter((objective) => objective.result.passed !== run.passes)
            .map((objective) => `${objective.objectiveId} ${describeResult(objective.result)}`)
            .join('; ')}`,
        ]),
  ]
  return { run, verdict, steps, playProblems, mismatches, notes }
}

/** go-dicom's readings of the mission being played, by key, for its readings.json. */
let table: Record<string, FileReading> = {}

async function boot(): Promise<{ image: string; goDicom: string }> {
  let phase = 'off' as VmPhase
  let detail: string | null = null
  await session.start(
    { baseUrl: `${vm}/`, wasmUrl: join(repo, 'packages/machine/node_modules/v86/build/v86.wasm'), fresh: true },
    driver.onOutput,
    (status) => {
      phase = status.phase
      detail = status.detail
    },
    undefined,
    driver.onShell
  )
  while (phase !== 'ready' && phase !== 'failed') {
    await wait(POLL_MS)
  }
  if (phase !== 'ready') {
    throw new Error(`the Machine did not boot: ${detail ?? phase}`)
  }
  const manifest = JSON.parse(readFileSync(join(vm, 'manifest.json'), 'utf8')) as VmManifest
  const version = (await session.control(`${VM_GO_DICOM} --version`)).output.trim()
  if (!/\d+\.\d+\.\d+/.test(version)) {
    throw new Error(`go-dicom is not in this image (${VM_GO_DICOM}): ${version}`)
  }
  return { image: manifest.version, goDicom: version.replace(/^go-dicom version /, '') }
}

function writeRuns(mission: MissionDefinition, played: readonly Played[], machine: { image: string; goDicom: string }) {
  const clean = played.filter((one) => one.playProblems.length === 0 && one.mismatches.length === 0)
  if (clean.length === 0) {
    return 0
  }
  const dir = join(runsDir, mission.id)
  mkdirSync(dir, { recursive: true })
  const used: Record<string, FileReading> = {}
  for (const one of clean) {
    const recorded: RecordedRun = {
      mission: mission.id,
      version: mission.version,
      run: one.run.id,
      passes: one.run.passes,
      image: machine.image,
      goDicom: machine.goDicom,
      steps: one.steps,
      objectives: objectivesMet(one.verdict),
    }
    for (const step of one.steps) {
      for (const read of [...Object.values(step.readings.files), ...Object.values(step.readings.start)]) {
        if ('reading' in read && table[read.reading] !== undefined) {
          used[read.reading] = table[read.reading] as FileReading
        }
      }
    }
    writeFileSync(join(dir, `${one.run.id}.json`), `${JSON.stringify(recorded, null, 1)}\n`)
  }
  // Readings recorded earlier for runs not played now stay: their run files still point at them.
  const tablePath = join(dir, 'readings.json')
  const earlier = existsSync(tablePath)
    ? (JSON.parse(readFileSync(tablePath, 'utf8')) as Record<string, FileReading>)
    : {}
  writeFileSync(tablePath, `${JSON.stringify({ ...earlier, ...used })}\n`)
  return clean.length
}

const pad = (text: string, width: number) => text.padEnd(width)

async function main(): Promise<number> {
  const { planned, problems } = planMissions()
  if (problems.length > 0) {
    console.error(problems.join('\n'))
    return 1
  }
  say(`booting the Machine for ${planned.length} mission${planned.length === 1 ? '' : 's'} (${contentDir})`)
  const machine = await boot()
  say(`booted image ${machine.image}, go-dicom ${machine.goDicom}`)
  mkdirSync(logDir, { recursive: true })

  const rows: string[][] = []
  const failures: string[] = []
  const notes: string[] = []
  for (const { mission, runs } of planned) {
    const logPath = join(logDir, `${mission.id}.log`)
    writeFileSync(logPath, `${new Date().toISOString()} golden runs of ${mission.id}\n`)
    const log = (text: string) => appendFileSync(logPath, `${stamp()} ${text}\n`)
    table = {}
    const played: Played[] = []
    for (const run of runs) {
      const one = await playRun(mission, run, log)
      played.push(one)
      const ok = one.playProblems.length === 0 && one.mismatches.length === 0
      const met = one.verdict.objectives.filter((objective) => objective.result.passed).length
      rows.push([
        mission.id,
        run.id,
        run.passes ? 'pass' : 'no pass',
        one.verdict.passed ? 'passed' : 'not passed',
        `${met}/${one.verdict.objectives.length}`,
        ok ? 'ok' : 'MISMATCH',
      ])
      for (const problem of [...one.playProblems, ...one.mismatches]) {
        failures.push(`${mission.id}/${run.id}: ${problem}`)
      }
      notes.push(...one.notes.map((note) => `${mission.id}/${run.id}: ${note}`))
      say(`${mission.id}/${run.id}: ${ok ? 'judged as its solution says' : 'MISMATCH'}`)
    }
    const written = writeRuns(mission, played, machine)
    say(`${mission.id}: ${written} of ${runs.length} runs written; log ${logPath}`)
  }

  const header = ['mission', 'run', 'solution', 'judged', 'met', '']
  const widths = header.map((title, at) => Math.max(title.length, ...rows.map((row) => row[at]?.length ?? 0)))
  console.log(`\n${header.map((title, at) => pad(title, widths[at] ?? 0)).join('  ')}`)
  for (const row of rows) {
    console.log(row.map((cell, at) => pad(cell, widths[at] ?? 0)).join('  '))
  }
  if (notes.length > 0) {
    console.log(`\nnotes:\n${[...new Set(notes)].map((note) => `  ${note}`).join('\n')}`)
  }
  if (failures.length > 0) {
    console.log(
      `\n${failures.length} problem${failures.length === 1 ? '' : 's'}:\n${failures.map((failure) => `  ${failure}`).join('\n')}`
    )
  }
  say(
    failures.length === 0 ? 'every run judged as its solution says' : 'some runs are not judged as their solution says'
  )
  return failures.length === 0 ? 0 : 1
}

let code = 1
try {
  code = await main()
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
}
await session.stop()
process.exit(code)
