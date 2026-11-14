import type { CheckResult, MissionVerdict, ObjectiveDefinition } from '@dicomfall/game/types'
import { NO_PLAYER_ACTIONS } from '@dicomfall/game/types'
import { describe, expect, it, vi } from 'vitest'
import { guideObjectivesOf } from './objectives.util'

const result = (passed: boolean): CheckResult => ({
  kind: 'file',
  passed,
  failure: passed ? null : 'wrong_attribute',
  file: '/lab/ct.dcm',
  transferSyntax: null,
  attributes: [],
})

const objective = (id: string, text: string): ObjectiveDefinition => ({
  id,
  text,
  check: { kind: 'selected', file: '/lab/ct.dcm', region: 'preamble' },
})

const MISSION = {
  objectives: [objective('preamble', 'Mark the preamble.'), objective('prefix', 'Mark the `DICM` prefix.')],
}

const BOXES_MISSION = {
  objectives: [
    {
      id: 'modality',
      text: 'Give the Modality.',
      check: { kind: 'answer', file: '/lab/ct.dcm', element: '(0008,0060)' },
    },
    {
      id: 'predict',
      text: 'Predict the offset.',
      check: { kind: 'offset', file: '/lab/ct.dcm', element: '(0008,0005)', offset: 328 },
    },
  ] satisfies ObjectiveDefinition[],
}

describe('guideObjectivesOf', () => {
  it('lists every objective open before anything is judged', () => {
    expect(guideObjectivesOf(MISSION, null)).toEqual([
      {
        id: 'preamble',
        text: 'Mark the preamble.',
        passed: false,
        state: 'open',
        input: null,
        observed: null,
        evidence: null,
      },
      {
        id: 'prefix',
        text: 'Mark the `DICM` prefix.',
        passed: false,
        state: 'open',
        input: null,
        observed: null,
        evidence: null,
      },
    ])
  })

  it('ticks the objectives a verdict met, and only those', () => {
    const verdict: MissionVerdict = {
      passed: false,
      objectives: [
        { objectiveId: 'preamble', result: result(true) },
        { objectiveId: 'prefix', result: result(false) },
      ],
    }
    const listed = guideObjectivesOf(MISSION, verdict)
    expect(listed.map((entry) => entry.passed)).toEqual([true, false])
    expect(listed.map((entry) => entry.state)).toEqual(['met', 'open'])
  })

  it('gives an answer box and an offset box, labelled by the objective, that hand the value on', () => {
    const answer = vi.fn()
    const predict = vi.fn()
    const actions = { ...NO_PLAYER_ACTIONS, answers: { modality: 'MR' } }
    const [modality, offset] = guideObjectivesOf(BOXES_MISSION, null, { actions, answer, predict })
    expect(modality?.input).toMatchObject({ kind: 'answer', label: 'Give the Modality.', given: 'MR' })
    expect(offset?.input).toMatchObject({ kind: 'offset', label: 'Predict the offset.', given: null })
    modality?.input?.onSubmit('CT')
    offset?.input?.onSubmit(' 328 ')
    offset?.input?.onSubmit('three')
    expect(answer).toHaveBeenCalledWith('modality', 'CT')
    expect(predict).toHaveBeenCalledOnce()
    expect(predict).toHaveBeenCalledWith('predict', 328)
  })

  it('takes the box away once its objective is met', () => {
    const verdict: MissionVerdict = {
      passed: false,
      objectives: [
        {
          objectiveId: 'modality',
          result: {
            kind: 'answer',
            passed: true,
            failure: null,
            file: '/lab/ct.dcm',
            element: '(0008,0060)',
            vr: 'CS',
            expected: 'CT',
            given: 'ct',
          },
        },
      ],
    }
    const [modality] = guideObjectivesOf(BOXES_MISSION, verdict, {
      actions: NO_PLAYER_ACTIONS,
      answer: vi.fn(),
      predict: vi.fn(),
    })
    expect(modality?.input).toBeNull()
    expect(modality?.evidence).toBe('go-dicom reads `CT` in `(0008,0060)`.')
  })
})
