import { describeType, type Issues, ObjectReader } from '@dicomfall/core/utils'
import { CHECK_KINDS, type MissionVerdict } from '#types/definitions/checks'
import { HINT_TIERS } from '#types/definitions/hints'
import type { MissionProgress, OpenDebrief, Progress } from '#types/definitions/progress'

function readMission(mission: ObjectReader): MissionProgress {
  return {
    missionId: mission.string('missionId'),
    firstStartedAt: mission.integer('firstStartedAt', 0),
    completedAt: mission.nullable('completedAt', (key) => mission.integer(key, 0)),
    attempts: mission.integer('attempts', 0),
    hintsRevealed: mission.integer('hintsRevealed', 0, HINT_TIERS.length),
  }
}

/** A field that must be there and be true or false: `flag` would take a missing one as false. */
function readBoolean(reader: ObjectReader, key: string): boolean {
  const value = reader.value(key)
  if (typeof value !== 'boolean') {
    reader.issues.add(reader.pathOf(key), `expected true or false, got ${describeType(value)}`)
    return false
  }
  return value
}

function readVerdict(verdict: ObjectReader): MissionVerdict {
  return {
    passed: readBoolean(verdict, 'passed'),
    objectives: verdict.list('objectives', (value, at) => {
      const objective = new ObjectReader(value, at, verdict.issues)
      return {
        objectiveId: objective.string('objectiveId'),
        kind: objective.oneOf('kind', CHECK_KINDS),
        passed: readBoolean(objective, 'passed'),
      }
    }),
  }
}

function readOpenDebrief(debrief: ObjectReader): OpenDebrief {
  return {
    missionId: debrief.string('missionId'),
    verdict: debrief.nullable('verdict', (key) => readVerdict(debrief.object(key))),
  }
}

/** Reads a current-version `Progress` from untrusted save data. */
export function readProgress(value: unknown, path: string, issues: Issues): Progress {
  const progress = new ObjectReader(value, path, issues)
  const debrief = progress.optional('debrief', (key) => readOpenDebrief(progress.object(key)))
  return {
    missions: progress.list('missions', (entry, at) => readMission(new ObjectReader(entry, at, issues))),
    completionOrder: progress.stringList('completionOrder'),
    lastActive: progress.nullable('lastActive', (key) => progress.string(key)),
    ...(debrief === undefined ? {} : { debrief }),
  }
}
