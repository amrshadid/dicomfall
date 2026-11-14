import { validateMission } from '@dicomfall/game/utils'
import { describe, expect, it } from 'vitest'
import { parse } from 'yaml'
import { FIXTURE_FILES, FIXTURE_MISSION } from '#test/index'
import { validateSolution } from '#utils/run/golden-run.util'

const loaded = validateMission(parse(FIXTURE_FILES.missions[`${FIXTURE_MISSION}/mission.yaml`] ?? ''))
if (!loaded.ok) {
  throw new Error(loaded.errors.join('\n'))
}
const mission = loaded.value

const START = { id: 'start', passes: false, changes: [] }
const HALF = { id: 'meta-only', passes: false, changes: [{ select: { file: '/lab/ct.dcm', from: 132, to: 340 } }] }
const SOLVED = {
  id: 'all-three',
  passes: true,
  changes: [
    { ae: 'workstation', shell: ['go-dicom show /lab/ct.dcm'] },
    { select: { file: '/lab/ct.dcm', from: 132, to: 340 } },
    { answer: { objective: 'name-the-syntax', value: '1.2.840.10008.1.2.1' } },
    { predict: { objective: 'predict-the-offset', offset: 228 } },
  ],
}

const errorsOf = (raw: unknown) => {
  const result = validateSolution(raw, mission)
  return result.ok ? [] : result.errors
}

describe('validateSolution', () => {
  it('reads every kind of change', () => {
    expect(validateSolution({ runs: [START, HALF, SOLVED] }, mission)).toEqual({
      ok: true,
      value: [START, HALF, SOLVED],
    })
    const refused = { ae: 'workstation', shell: ['go-dicom show /lab/missing.dcm'], fails: true }
    expect(validateSolution({ runs: [START, { ...HALF, changes: [refused] }, SOLVED] }, mission)).toMatchObject({
      ok: true,
      value: [START, { changes: [refused] }, SOLVED],
    })
  })

  it('wants the start, a reference solution and a wrong one', () => {
    expect(errorsOf({ runs: [SOLVED] })).toEqual([
      'runs: expected a run with no changes that does not pass: the mission as it starts',
      'runs: expected a run that changes something and does not pass: a wrong or half-done solution',
    ])
    expect(errorsOf({ runs: [START, HALF] })).toEqual(['runs: expected a run that passes: the reference solution'])
  })

  it('names only AEs, files and objectives of the mission, each box by its kind', () => {
    expect(
      errorsOf({
        runs: [
          START,
          SOLVED,
          {
            id: 'wrong',
            passes: 'no',
            changes: [
              { ae: 'archive', shell: ['go-dicom echoscu'], fails: 'yes' },
              { select: { file: '/lab/other.dcm', from: 4, to: 4 } },
              { answer: { objective: 'predict-the-offset', value: 228 } },
              { predict: { objective: 'nowhere', offset: 1 } },
              { select: { file: '/lab/ct.dcm', from: 0, to: 1 }, shell: ['ls'] },
            ],
          },
        ],
      })
    ).toEqual([
      'runs[2].passes: expected true or false',
      'runs[2].changes[0].ae: no AE "archive" in the mission\'s lab',
      'runs[2].changes[0].fails: expected true: leave it out when every line succeeds',
      'runs[2].changes[1].select.file: "/lab/other.dcm" is not in the mission\'s lab',
      'runs[2].changes[1].select.to: expected the end after the start (4): "to" is exclusive',
      'runs[2].changes[2].answer.objective: "predict-the-offset" is not an answer objective: it has no box for this',
      'runs[2].changes[3].predict.objective: no objective "nowhere" in the mission',
      'runs[2].changes[4]: expected one of "shell", "select", "answer", "predict"',
    ])
  })
})
