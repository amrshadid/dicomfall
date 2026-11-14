import { describe, expect, it } from 'vitest'
import { machineLockOf } from './machine-lock.util'

describe('machineLockOf', () => {
  it('is null once the shell is at its prompt', () => {
    expect(machineLockOf({ phase: 'ready', detail: null }, true)).toBeNull()
  })

  it('names the phase', () => {
    const lock = machineLockOf({ phase: 'booting', detail: null }, false)
    expect(lock).toMatchObject({ phase: 'booting', title: 'Booting Linux', failed: false, holdsKeys: false })
  })

  it("prefers the status's own words", () => {
    expect(machineLockOf({ phase: 'setting-up', detail: 'archive: link' }, false)?.detail).toBe('archive: link')
  })

  it('holds keys while a lab is restored, never while one is built, and only after the first boot', () => {
    expect(machineLockOf({ phase: 'setting-up', detail: null }, false)?.holdsKeys).toBe(false)
    expect(machineLockOf({ phase: 'setting-up', detail: null }, true)?.holdsKeys).toBe(false)
    expect(machineLockOf({ phase: 'restoring', detail: null }, false)?.holdsKeys).toBe(false)
    const restoring = machineLockOf({ phase: 'restoring', detail: null }, true)
    expect(restoring?.holdsKeys).toBe(true)
    expect(restoring?.detail).toContain('reaches the shell')
  })

  it('marks a failure and tells the player to reload', () => {
    const lock = machineLockOf({ phase: 'failed', detail: 'no image' }, false)
    expect(lock).toMatchObject({ failed: true, detail: 'no image' })
    expect(machineLockOf({ phase: 'failed', detail: null }, false)?.detail).toContain('Reload the page')
  })
})
