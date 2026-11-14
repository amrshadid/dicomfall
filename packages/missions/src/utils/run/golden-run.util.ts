import type { Validated } from '@dicomfall/core/types'
import { Issues, ObjectReader, reportDuplicates } from '@dicomfall/core/utils'
import { KEBAB_ID, type LabPath, type MissionDefinition, type ObjectiveId } from '@dicomfall/game/types'
import { inLab } from '@dicomfall/game/utils'

/** One thing a scripted player does, as `solution.yaml` lists it (MISSIONS.md, Golden runs). */
export type GoldenChange =
  /**
   * Lines typed at an AE's console, one after another, in its namespace. `fails` marks a change
   * whose point is that go-dicom refuses one of its lines: the recorder logs what it printed and
   * plays on, where a line that exits non-zero otherwise fails the recording.
   */
  | { readonly ae: string; readonly shell: readonly string[]; readonly fails?: true }
  /** A byte range marked in the File inspector, `from` inclusive, `to` exclusive. */
  | { readonly select: { readonly file: LabPath; readonly from: number; readonly to: number } }
  /** A value given in an `answer` objective's box. */
  | { readonly answer: { readonly objective: ObjectiveId; readonly value: string } }
  /** An offset given in an `offset` objective's box. */
  | { readonly predict: { readonly objective: ObjectiveId; readonly offset: number } }

/** One golden run: what a player might do, and whether the mission must pass. */
export interface GoldenRun {
  readonly id: string
  readonly passes: boolean
  readonly changes: readonly GoldenChange[]
}

const CHANGE_KINDS = ['shell', 'select', 'answer', 'predict'] as const

const ONE_LINE = { pattern: /^[^\n\0]+$/, expected: 'one line' }

/** The objective a box change gives its value to, which has to be one with that box. */
function readObjective(reader: ObjectReader, mission: MissionDefinition, kind: 'answer' | 'offset'): ObjectiveId {
  const id = reader.string('objective', KEBAB_ID)
  const objective = mission.objectives.find((candidate) => candidate.id === id)
  if (id !== '' && objective === undefined) {
    reader.issues.add(reader.pathOf('objective'), `no objective "${id}" in the mission`)
  } else if (objective !== undefined && objective.check.kind !== kind) {
    reader.issues.add(reader.pathOf('objective'), `"${id}" is not an ${kind} objective: it has no box for this`)
  }
  return id
}

function readShell(change: ObjectReader, mission: MissionDefinition): GoldenChange {
  change.rejectUnknownKeys(['ae', 'shell', 'fails'])
  const ae = change.string('ae', KEBAB_ID)
  if (ae !== '' && !mission.lab.aes.some((candidate) => candidate.name === ae)) {
    change.issues.add(change.pathOf('ae'), `no AE "${ae}" in the mission's lab`)
  }
  const shell = change.stringList('shell', ONE_LINE)
  if (change.has('fails') && change.value('fails') !== true) {
    change.issues.add(change.pathOf('fails'), 'expected true: leave it out when every line succeeds')
  }
  return { ae, shell, ...(change.value('fails') === true && { fails: true as const }) }
}

function readSelect(change: ObjectReader, mission: MissionDefinition): GoldenChange {
  change.rejectUnknownKeys(['select'])
  const select = change.object('select')
  select.rejectUnknownKeys(['file', 'from', 'to'])
  const file = select.string('file')
  if (file !== '' && !inLab(file, mission.lab)) {
    select.issues.add(select.pathOf('file'), `"${file}" is not in the mission's lab`)
  }
  const from = select.integer('from', 0)
  const to = select.integer('to', 1)
  if (to <= from) {
    select.issues.add(select.pathOf('to'), `expected the end after the start (${from}): "to" is exclusive`)
  }
  return { select: { file, from, to } }
}

function readAnswer(change: ObjectReader, mission: MissionDefinition): GoldenChange {
  change.rejectUnknownKeys(['answer'])
  const answer = change.object('answer')
  answer.rejectUnknownKeys(['objective', 'value'])
  const objective = readObjective(answer, mission, 'answer')
  // YAML reads `0` as a number; the box holds what the player typed.
  const raw = answer.value('value')
  const value = typeof raw === 'number' ? String(raw) : answer.text('value')
  return { answer: { objective, value } }
}

function readPredict(change: ObjectReader, mission: MissionDefinition): GoldenChange {
  change.rejectUnknownKeys(['predict'])
  const predict = change.object('predict')
  predict.rejectUnknownKeys(['objective', 'offset'])
  return { predict: { objective: readObjective(predict, mission, 'offset'), offset: predict.integer('offset', 0) } }
}

function readChange(change: ObjectReader, mission: MissionDefinition): GoldenChange | undefined {
  const given = CHANGE_KINDS.filter((key) => change.has(key))
  if (given.length !== 1) {
    change.issues.add(change.path, `expected one of ${CHANGE_KINDS.map((kind) => `"${kind}"`).join(', ')}`)
    return undefined
  }
  switch (given[0]) {
    case 'shell':
      return readShell(change, mission)
    case 'select':
      return readSelect(change, mission)
    case 'answer':
      return readAnswer(change, mission)
    default:
      return readPredict(change, mission)
  }
}

/**
 * Checks a parsed `solution.yaml` against its mission and returns its golden runs, or every
 * problem with its path: the mission as it starts, the reference solution and a wrong or
 * half-done one are all there, and every AE, file and objective a change names is the mission's.
 */
export function validateSolution(raw: unknown, mission: MissionDefinition): Validated<readonly GoldenRun[]> {
  const issues = new Issues()
  const reader = new ObjectReader(raw, '', issues)
  reader.rejectUnknownKeys(['runs'])
  const runs = reader.list('runs', (value, path): GoldenRun => {
    const run = new ObjectReader(value, path, issues)
    run.rejectUnknownKeys(['id', 'passes', 'changes'])
    const id = run.string('id', KEBAB_ID)
    if (typeof run.value('passes') !== 'boolean') {
      issues.add(run.pathOf('passes'), 'expected true or false')
    }
    const changes = run
      .list('changes', (change, at) => readChange(new ObjectReader(change, at, issues), mission))
      .filter((change) => change !== undefined)
    return { id, passes: run.value('passes') === true, changes }
  })
  reportDuplicates(
    runs.map((run) => run.id),
    'runs',
    issues
  )
  if (issues.count === 0) {
    // A mission's checks are proven only by a run they pass and runs they refuse.
    if (!runs.some((run) => !run.passes && run.changes.length === 0)) {
      issues.add('runs', 'expected a run with no changes that does not pass: the mission as it starts')
    }
    if (!runs.some((run) => run.passes)) {
      issues.add('runs', 'expected a run that passes: the reference solution')
    }
    if (!runs.some((run) => !run.passes && run.changes.length > 0)) {
      issues.add('runs', 'expected a run that changes something and does not pass: a wrong or half-done solution')
    }
  }
  return issues.result(runs)
}
