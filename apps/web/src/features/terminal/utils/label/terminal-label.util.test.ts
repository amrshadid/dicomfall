import { describe, expect, it } from 'vitest'
import { terminalLabelOf } from './terminal-label.util'

describe('terminalLabelOf', () => {
  it('names the AE the console is in', () => {
    expect(terminalLabelOf({ ae: 'archive', firstAe: 'workstation', aesBuilt: true })).toBe('AE archive')
  })

  it('says where the console is going while it moves into the first AE', () => {
    expect(terminalLabelOf({ ae: null, firstAe: 'workstation', aesBuilt: true })).toBe('going into AE workstation…')
  })

  it("says the lab isn't there yet while the console is in the Machine's shell and going nowhere", () => {
    expect(terminalLabelOf({ ae: null, firstAe: 'workstation', aesBuilt: false })).toBe(
      'the Machine: the lab is not built yet'
    )
    expect(terminalLabelOf({ ae: null, firstAe: null, aesBuilt: true })).toBe('the Machine: the lab is not built yet')
  })
})
