// @vitest-environment jsdom

import type { MapNote, MapNotes } from '@features/map/types'
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useMapNote } from './useMapNote.hook'

const note = (title: string): MapNote => ({ title, text: '', facts: [] })

const NOTES: MapNotes = {
  stops: new Map([
    ['a', note('Stop A')],
    ['b', note('Stop B')],
  ]),
  regions: new Map(),
  chapters: new Map([
    ['the-first-file', note('The First File')],
    ['the-association', note('The association')],
  ]),
}

describe('useMapNote', () => {
  it('shows the stage in view until something is pointed at or focused', () => {
    const hook = renderHook(() => useMapNote(NOTES, 'the-first-file'))
    expect(hook.result.current.note?.title).toBe('The First File')
    act(() => hook.result.current.point({ kind: 'chapter', id: 'the-association' }))
    expect(hook.result.current.note?.title).toBe('The association')
    act(() => hook.result.current.point(null))
    expect(hook.result.current.note?.title).toBe('The First File')
  })

  it('lets the last of pointer and focus win, and falls back to the other', () => {
    const hook = renderHook(() => useMapNote(NOTES, 'the-first-file'))
    act(() => hook.result.current.point({ kind: 'stop', key: 'a' }))
    act(() => hook.result.current.focus({ kind: 'stop', key: 'b' }))
    expect(hook.result.current.note?.title).toBe('Stop B')
    act(() => hook.result.current.point({ kind: 'chapter', id: 'the-association' }))
    expect(hook.result.current.note?.title).toBe('The association')
    act(() => hook.result.current.point(null))
    expect(hook.result.current.note?.title).toBe('Stop B')
    act(() => hook.result.current.focus(null))
    expect(hook.result.current.note?.title).toBe('The First File')
  })

  it('keeps its callbacks, so the memoized drawing never redraws for a note', () => {
    const hook = renderHook(() => useMapNote(NOTES, 'the-first-file'))
    const { point, focus } = hook.result.current
    act(() => point({ kind: 'stop', key: 'a' }))
    act(() => focus({ kind: 'stop', key: 'b' }))
    expect(hook.result.current.point).toBe(point)
    expect(hook.result.current.focus).toBe(focus)
  })
})
