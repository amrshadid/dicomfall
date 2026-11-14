import type { StringRule, Validated } from '@dicomfall/core/types'
import { Issues, ObjectReader, reportDuplicates } from '@dicomfall/core/utils'
import { CORE_CONCEPT_BUDGET } from '#types/definitions/concepts'
import { HINT_TIERS } from '#types/definitions/hints'
import {
  type CodexCard,
  type CommandChip,
  type HintDefinition,
  KEBAB_ID,
  type MissionDefinition,
  type ObjectiveDefinition,
  type StoryRefs,
} from '#types/definitions/mission'
import { readCheck } from '#utils/validate/check.schema'

const MISSION_KEYS = [
  'id',
  'version',
  'title',
  'summary',
  'minutes',
  'chapter',
  'objective',
  'skills',
  'prerequisites',
  'teaches',
  'names',
  'uses',
  'objectives',
  'hints',
  'chips',
  'codex',
  'story',
]

const STORY_KEYS = ['scene', 'seeIt', 'buildIt', 'watchIt', 'debrief', 'realWorld'] as const

const STORY_REF: StringRule = {
  pattern: /^story\.md#[a-z0-9]+(-[a-z0-9]+)*$/,
  expected: 'a story section like story.md#scene',
}

const SOURCE_PATH: StringRule = {
  pattern: /^[A-Za-z0-9_.+-]+(\/[A-Za-z0-9_.+-]+)*\/?$/,
  expected: 'a path in go-dicom’s source tree like filereader/reader.go',
}

const DOCS_URL: StringRule = { pattern: /^https:\/\/\S+$/, expected: 'an https:// link' }

const ONE_LINE: StringRule = { pattern: /^[^\n\0]+$/, expected: 'one line' }

/** About how long a mission takes a new player, in minutes. */
const MINUTES = { min: 1, max: 120 } as const

function readHint(hint: ObjectReader, tier: number): HintDefinition {
  hint.rejectUnknownKeys(['text', 'command'])
  const command = hint.optional('command', (key) => hint.string(key, ONE_LINE))
  // The nudge and the concept teach; only pointing at the spot may name what to type.
  if (command !== undefined && tier !== HINT_TIERS.length - 1) {
    hint.issues.add(hint.pathOf('command'), `only the third hint (the ${HINT_TIERS.at(-1)}) may name a command`)
  }
  return { text: hint.string('text'), ...(command !== undefined && { command }) }
}

function readHints(reader: ObjectReader): readonly HintDefinition[] {
  let tier = 0
  const hints = reader.list('hints', (value, path) => readHint(new ObjectReader(value, path, reader.issues), tier++))
  if (reader.has('hints') && Array.isArray(reader.value('hints')) && hints.length !== HINT_TIERS.length) {
    reader.issues.add(
      'hints',
      `expected exactly ${HINT_TIERS.length} hints (${HINT_TIERS.join(', ')}), got ${hints.length}`
    )
  }
  return hints
}

function readChip(chip: ObjectReader): CommandChip {
  chip.rejectUnknownKeys(['command', 'explain'])
  return { command: chip.string('command', ONE_LINE), explain: chip.string('explain') }
}

function readCodexCard(card: ObjectReader): CodexCard {
  card.rejectUnknownKeys(['id', 'term', 'simple', 'deep', 'deepens', 'sources', 'docs', 'tryIt'])
  const id = card.string('id', KEBAB_ID)
  const term = card.string('term')
  const simple = card.string('simple')
  const deep = card.optional('deep', (key) => card.string(key))
  const deepens = card.optional('deepens', (key) => card.string(key, KEBAB_ID))
  if (deepens !== undefined && deepens === id) {
    card.issues.add(card.pathOf('deepens'), 'a card cannot deepen itself')
  }
  const sources = card.has('sources') ? card.stringList('sources', SOURCE_PATH) : []
  const docs = card.optional('docs', (key) => card.string(key, DOCS_URL))
  const tryIt = card.optional('tryIt', (key) => card.string(key))
  return {
    id,
    term,
    simple,
    ...(deep !== undefined && { deep }),
    ...(deepens !== undefined && { deepens }),
    sources,
    ...(docs !== undefined && { docs }),
    ...(tryIt !== undefined && { tryIt }),
  }
}

function readStoryRefs(story: ObjectReader): StoryRefs {
  story.rejectUnknownKeys(STORY_KEYS)
  const step = (key: 'seeIt' | 'buildIt' | 'watchIt') => story.optional(key, (name) => story.string(name, STORY_REF))
  const seeIt = step('seeIt')
  const buildIt = step('buildIt')
  const watchIt = step('watchIt')
  return {
    scene: story.string('scene', STORY_REF),
    ...(seeIt !== undefined && { seeIt }),
    ...(buildIt !== undefined && { buildIt }),
    ...(watchIt !== undefined && { watchIt }),
    debrief: story.string('debrief', STORY_REF),
    realWorld: story.string('realWorld', STORY_REF),
  }
}

/** A concept is taught, named or relied on: listing it twice says two things about it. */
function reportConceptOverlap(mission: MissionDefinition, issues: Issues): void {
  const lists = [
    ['teaches', mission.teaches],
    ['names', mission.names],
    ['uses', mission.uses],
  ] as const
  lists.forEach(([field, ids], at) => {
    for (const [earlier, earlierIds] of lists.slice(0, at)) {
      for (const id of ids.filter((candidate) => earlierIds.includes(candidate))) {
        issues.add(`${field}`, `"${id}" is already in ${earlier}`)
      }
    }
  })
}

/** A list the mission may leave out: an empty one then. */
function optionalList<T>(reader: ObjectReader, key: string, read: (value: ObjectReader) => T): readonly T[] {
  return reader.has(key) ? reader.list(key, (value, path) => read(new ObjectReader(value, path, reader.issues))) : []
}

function readObjective(objective: ObjectReader): ObjectiveDefinition {
  objective.rejectUnknownKeys(['id', 'text', 'check'])
  return {
    id: objective.string('id', KEBAB_ID),
    text: objective.string('text'),
    check: readCheck(objective.object('check')),
  }
}

/**
 * Checks a parsed `mission.yaml` and returns the typed mission, or every problem with the path
 * of its field. Whether its chapter and prerequisites exist is checked with the rest of the
 * content, by `createGameContent`.
 */
export function validateMission(raw: unknown): Validated<MissionDefinition> {
  const issues = new Issues()
  const reader = new ObjectReader(raw, '', issues)
  reader.rejectUnknownKeys(MISSION_KEYS)
  // Read in the file's order, so the problems are listed in it; a part left out stays out of the mission.
  const id = reader.string('id', KEBAB_ID)
  const version = reader.integer('version', 1)
  const title = reader.string('title')
  const summary = reader.optional('summary', (key) => reader.string(key))
  const minutes = reader.optional('minutes', (key) => reader.integer(key, MINUTES.min, MINUTES.max))
  const mission: MissionDefinition = {
    id,
    version,
    title,
    ...(summary !== undefined && { summary }),
    ...(minutes !== undefined && { minutes }),
    chapter: reader.string('chapter', KEBAB_ID),
    objective: reader.string('objective'),
    skills: reader.stringList('skills', KEBAB_ID),
    prerequisites: reader.stringList('prerequisites', KEBAB_ID),
    teaches: reader.stringList('teaches', KEBAB_ID),
    names: reader.has('names') ? reader.stringList('names', KEBAB_ID) : [],
    uses: reader.stringList('uses', KEBAB_ID),
    objectives: reader.list('objectives', (value, path) => readObjective(new ObjectReader(value, path, issues))),
    hints: readHints(reader),
    chips: optionalList(reader, 'chips', readChip),
    codex: optionalList(reader, 'codex', readCodexCard),
    story: readStoryRefs(reader.object('story')),
  }
  if (mission.teaches.length > CORE_CONCEPT_BUDGET) {
    issues.add('teaches', `expected at most ${CORE_CONCEPT_BUDGET} concepts, got ${mission.teaches.length}`)
  }
  reportDuplicates(mission.teaches, 'teaches', issues)
  reportDuplicates(mission.names, 'names', issues)
  reportDuplicates(mission.uses, 'uses', issues)
  reportConceptOverlap(mission, issues)
  reportDuplicates(
    mission.chips.map((chip) => chip.command),
    'chips',
    issues
  )
  reportDuplicates(
    mission.codex.map((card) => card.id),
    'codex',
    issues
  )
  reportDuplicates(mission.skills, 'skills', issues)
  reportDuplicates(mission.prerequisites, 'prerequisites', issues)
  reportDuplicates(
    mission.objectives.map((objective) => objective.id),
    'objectives',
    issues
  )
  // Cross-checks on parts that are themselves wrong would only repeat the problem.
  if (issues.count === 0) {
    if (mission.objectives.length === 0) {
      issues.add('objectives', 'expected at least one objective')
    }
    if (mission.skills.length === 0) {
      issues.add('skills', 'expected at least one skill the mission earns')
    }
    for (const skill of mission.prerequisites.filter((id) => mission.skills.includes(id))) {
      issues.add('prerequisites', `"${skill}" is also a skill this mission earns`)
    }
  }
  return issues.result(mission)
}
