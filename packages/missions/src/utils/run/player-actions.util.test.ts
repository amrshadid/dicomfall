import { NO_PLAYER_ACTIONS } from '@dicomfall/game/types'
import { describe, expect, it } from 'vitest'
import { actionsAfterEach, applyChange } from '#utils/run/player-actions.util'

describe("a golden run's changes as the player's actions", () => {
  it('keeps the latest mark and each box’s latest value; a shell change leaves them', () => {
    const after = actionsAfterEach([
      { select: { file: '/lab/ct.dcm', from: 0, to: 128 } },
      { ae: 'workstation', shell: ['ls'] },
      { answer: { objective: 'name', value: 'X' } },
      { select: { file: '/lab/ct.dcm', from: 128, to: 132 } },
      { answer: { objective: 'name', value: 'FALLS^DICOM' } },
      { predict: { objective: 'next', offset: 272 } },
    ])
    expect(after[1]).toBe(after[0])
    expect(after.at(-1)).toEqual({
      selection: { file: '/lab/ct.dcm', from: 128, to: 132 },
      answers: { name: 'FALLS^DICOM' },
      predictions: { next: 272 },
    })
    expect(applyChange(NO_PLAYER_ACTIONS, { ae: 'workstation', shell: ['ls'] })).toBe(NO_PLAYER_ACTIONS)
  })
})
