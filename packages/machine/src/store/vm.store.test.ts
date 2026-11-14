import { beforeEach, describe, expect, it } from 'vitest'
import { useVmStore } from '#store/vm.store'

describe('the commands the player finished', () => {
  beforeEach(() => useVmStore.getState().reset())

  it('keeps the command lines the latest count added, and never takes the count back', () => {
    const store = useVmStore.getState()
    store.applyShell({
      ae: 'workstation',
      commandsFinished: 2,
      lines: ['workstation:~# ls -l /lab', 'workstation:~# cd /lab'],
    })
    expect(useVmStore.getState()).toMatchObject({
      commandsFinished: 2,
      finishedLines: ['workstation:~# ls -l /lab', 'workstation:~# cd /lab'],
    })
    // A move to another AE reports no new command.
    store.applyShell({ ae: 'archive', commandsFinished: 2 })
    store.applyShell({ ae: 'archive', commandsFinished: 1, lines: ['stale'] })
    expect(useVmStore.getState()).toMatchObject({
      ae: 'archive',
      commandsFinished: 2,
      finishedLines: ['workstation:~# ls -l /lab', 'workstation:~# cd /lab'],
    })
  })
})

describe('the Machine’s events', () => {
  beforeEach(() => useVmStore.getState().reset())

  it('follows the Machine back when it is restored', () => {
    const store = useVmStore.getState()
    const link = ['workstation', 'archive'] as const
    store.applyEvents({
      from: 0,
      events: [
        { type: 'fault_injected', link, lossPercent: 100, seq: 0, timeMs: 10 },
        { type: 'fault_cleared', link, seq: 1, timeMs: 20 },
      ],
    })
    expect(useVmStore.getState().log.events).toHaveLength(2)
    store.applyEvents({ from: 1, events: [] })
    expect(useVmStore.getState().log.events.map((event) => event.type)).toEqual(['fault_injected'])
  })
})
