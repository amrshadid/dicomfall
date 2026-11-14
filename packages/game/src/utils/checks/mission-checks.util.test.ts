import { describe, expect, it } from 'vitest'
import { CT_EXPLICIT_LE_READING } from '#test/readings'
import { type LabReadings, NO_PLAYER_ACTIONS, type PlayerActions } from '#types/definitions/checks'
import type { MissionDefinition } from '#types/definitions/mission'
import { mergeVerdicts } from '#utils/checks/merge-verdicts.util'
import { evaluateCheck, judgeMission, readingRequestOf } from '#utils/checks/mission-checks.util'

const FILE = '/lab/ct-explicit-le.dcm'
const READINGS: LabReadings = {
  files: { [FILE]: { ok: true, reading: CT_EXPLICIT_LE_READING } },
  folders: {},
  start: {},
}

const MISSION: Pick<MissionDefinition, 'objectives'> = {
  objectives: [
    { id: 'preamble', text: 'Mark the preamble.', check: { kind: 'selected', file: FILE, region: 'preamble' } },
    { id: 'prefix', text: 'Mark the prefix.', check: { kind: 'selected', file: FILE, region: 'prefix' } },
    { id: 'modality', text: 'Give the Modality.', check: { kind: 'answer', file: FILE, element: '(0008,0060)' } },
  ],
}

const mark = (from: number, to: number, actions: PlayerActions = NO_PLAYER_ACTIONS): PlayerActions => ({
  ...actions,
  selection: { file: FILE, from, to },
})

describe('a mission judged', () => {
  it('meets nothing as it starts, and passes once every objective is met', () => {
    expect(judgeMission(MISSION, NO_PLAYER_ACTIONS, READINGS).passed).toBe(false)
    expect(
      judgeMission(MISSION, NO_PLAYER_ACTIONS, READINGS).objectives.map((objective) => objective.result.failure)
    ).toEqual(['not_marked', 'not_marked', 'not_given'])
  })

  it('keeps an objective met once met, as the player marks one range after another', () => {
    const answered = { ...NO_PLAYER_ACTIONS, answers: { modality: 'CT' } }
    let verdict = mergeVerdicts(null, judgeMission(MISSION, mark(0, 128, answered), READINGS))
    expect(verdict.objectives.map((objective) => objective.result.passed)).toEqual([true, false, true])
    verdict = mergeVerdicts(verdict, judgeMission(MISSION, mark(128, 132), READINGS))
    expect(verdict.objectives.map((objective) => objective.result.passed)).toEqual([true, true, true])
    expect(verdict.passed).toBe(true)
  })

  it('leaves an unmet objective with its latest reason', () => {
    const first = judgeMission(MISSION, mark(0, 127), READINGS)
    const later = mergeVerdicts(first, judgeMission(MISSION, NO_PLAYER_ACTIONS, READINGS))
    expect(later.objectives[0]?.result.failure).toBe('not_marked')
  })

  it('leaves wire checks unevaluated, never passed', () => {
    expect(evaluateCheck({ kind: 'status', status: 0 }, 'x', NO_PLAYER_ACTIONS, READINGS)).toEqual({
      kind: 'status',
      passed: false,
      failure: 'not_evaluated',
    })
  })

  it('asks for each file once, the folders to list and the files to read at the start', () => {
    expect(readingRequestOf(MISSION)).toEqual({ files: [FILE], folders: [], startFiles: [] })
    const sorting: Pick<MissionDefinition, 'objectives'> = {
      objectives: [
        {
          id: 'sorted',
          text: 'Sort them.',
          check: { kind: 'grouped', files: ['/lab/series/f01.dcm'], into: '/lab/sorted', by: 'study' },
        },
        {
          id: 'copy',
          text: 'Copy it.',
          check: {
            kind: 'file',
            file: '/lab/copy.dcm',
            attributes: { '(0008,0018)': { sameAs: { file: FILE, element: '(0008,0018)' } } },
          },
        },
        { id: 'echo', text: 'Echo.', check: { kind: 'echo', from: 'workstation', to: 'archive' } },
      ],
    }
    expect(readingRequestOf(sorting)).toEqual({
      files: ['/lab/copy.dcm', FILE],
      folders: ['/lab/sorted'],
      startFiles: ['/lab/series/f01.dcm'],
    })
  })
})
