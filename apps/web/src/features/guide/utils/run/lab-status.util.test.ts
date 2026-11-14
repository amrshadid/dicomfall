import { describe, expect, it } from 'vitest'
import { labStatusOf, waitReasonOf } from './lab-status.util'

describe('labStatusOf', () => {
  it('says the lab is being built, or put back, as busy', () => {
    expect(labStatusOf('building', [])).toMatchObject({ busy: true, failed: false })
    expect(labStatusOf('building', [])?.text).toContain('Building the lab')
    expect(labStatusOf('restoring', [])).toMatchObject({
      busy: true,
      text: 'Putting the lab back as the mission found it.',
    })
  })

  it("raises a failure with the Machine's own words", () => {
    expect(labStatusOf('failed', ['mkdir: /lab/x: exists'])).toMatchObject({
      failed: true,
      details: ['mkdir: /lab/x: exists'],
    })
  })

  it('says nothing once the lab is the player’s', () => {
    expect(labStatusOf('ready', [])).toBeNull()
  })
})

describe('waitReasonOf', () => {
  it('gives a reason for every phase but ready', () => {
    expect(waitReasonOf('building')).toBe('The lab is still being built.')
    expect(waitReasonOf('restoring')).toBe('The lab is being put back.')
    expect(waitReasonOf('failed')).toBe('The lab could not be built.')
    expect(waitReasonOf('ready')).toBeNull()
  })
})
