import { describe, expect, it } from 'vitest'
import { labStatusOf } from './machine-status.util'

describe('labStatusOf', () => {
  it('says the lab is building while Linux is up and the lab is still being built', () => {
    expect(labStatusOf('ready', 'building')).toBe('Lab: building')
  })

  it("leaves the Machine's own word once the lab is there, and while the Machine itself is not ready", () => {
    expect(labStatusOf('ready', 'ready')).toBeNull()
    expect(labStatusOf('ready', null)).toBeNull()
    expect(labStatusOf('setting-up', 'building')).toBeNull()
    expect(labStatusOf('booting', 'building')).toBeNull()
  })
})
