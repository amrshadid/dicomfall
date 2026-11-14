import { describe, expect, it } from 'vitest'
import type { StampedMachineEvent } from '#types/definitions/event'
import { applyEventUpdate, EMPTY_EVENT_LOG } from '#utils/events/event-order.util'

const fault = (seq: number, timeMs: number): StampedMachineEvent => ({
  type: 'fault_injected',
  link: ['workstation', 'archive'],
  lossPercent: 100,
  seq,
  timeMs,
})
const seqs = (events: readonly StampedMachineEvent[]) => events.map((event) => event.seq)

describe('the event log', () => {
  it('keeps events in the order they arrived and in the order they happened', () => {
    // A line (seq 2) that was written before the two that arrived ahead of it.
    const log = applyEventUpdate(EMPTY_EVENT_LOG, { from: 0, events: [fault(0, 100), fault(1, 150), fault(2, 120)] })
    expect(seqs(log.received)).toEqual([0, 1, 2])
    expect(seqs(log.events)).toEqual([0, 2, 1])
  })

  it('orders events with the same time by arrival', () => {
    const log = applyEventUpdate(EMPTY_EVENT_LOG, { from: 0, events: [fault(0, 100), fault(1, 100), fault(2, 100)] })
    expect(seqs(log.events)).toEqual([0, 1, 2])
  })

  it('adds a later update after what it holds', () => {
    const first = applyEventUpdate(EMPTY_EVENT_LOG, { from: 0, events: [fault(0, 100), fault(1, 200)] })
    const second = applyEventUpdate(first, { from: 2, events: [fault(2, 150), fault(3, 300)] })
    expect(seqs(second.received)).toEqual([0, 1, 2, 3])
    expect(seqs(second.events)).toEqual([0, 2, 1, 3])
  })

  it('drops what happened after the moment the Machine went back to', () => {
    const before = applyEventUpdate(EMPTY_EVENT_LOG, { from: 0, events: [fault(0, 100), fault(1, 300), fault(2, 200)] })
    const restored = applyEventUpdate(before, { from: 1, events: [] })
    expect(seqs(restored.received)).toEqual([0])
    expect(seqs(restored.events)).toEqual([0])
    const again = applyEventUpdate(restored, { from: 1, events: [fault(1, 110)] })
    expect(seqs(again.events)).toEqual([0, 1])
  })

  it('returns the same log when an update changes nothing', () => {
    const log = applyEventUpdate(EMPTY_EVENT_LOG, { from: 0, events: [fault(0, 100)] })
    expect(applyEventUpdate(log, { from: 1, events: [] })).toBe(log)
  })
})
