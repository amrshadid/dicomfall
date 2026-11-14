import { describe, expect, it } from 'vitest'
import { panelsOfStep, previousStepOf } from './mission-step.util'

describe('previousStepOf', () => {
  const done = ['scene', 'see', 'build'] as const

  it('goes from the current step to the last done one, then one back each time', () => {
    expect(previousStepOf(done, null)).toBe('build')
    expect(previousStepOf(done, 'build')).toBe('see')
    expect(previousStepOf(done, 'see')).toBe('scene')
  })

  it('stops at the first step, and has nothing before the scene', () => {
    expect(previousStepOf(done, 'scene')).toBeNull()
    expect(previousStepOf([], null)).toBeNull()
  })
})

describe('panelsOfStep', () => {
  it('opens the Lightbox with the scene and the Inspector with See it', () => {
    expect(panelsOfStep('scene')).toEqual({ lightbox: true, inspector: false })
    expect(panelsOfStep('see')).toEqual({ lightbox: true, inspector: true })
    expect(panelsOfStep('build')).toEqual({ lightbox: true, inspector: true })
    expect(panelsOfStep('debrief')).toEqual({ lightbox: true, inspector: true })
  })
})
