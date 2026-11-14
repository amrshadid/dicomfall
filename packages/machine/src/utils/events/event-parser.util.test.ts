import { describe, expect, it } from 'vitest'
import { parseEventLine } from '#utils/events/event-parser.util'

describe('the Machine’s event lines', () => {
  it('reads the game’s own fault lines, stamped by the shell that ran them', () => {
    expect(parseEventLine('fault on workstation archive 30 1794504832.462712')).toEqual({
      timeMs: 1794504832462.712,
      event: { type: 'fault_injected', link: ['workstation', 'archive'], lossPercent: 30 },
    })
    expect(parseEventLine('fault off workstation archive 1794504838.500000\r')).toEqual({
      timeMs: 1794504838500,
      event: { type: 'fault_cleared', link: ['workstation', 'archive'] },
    })
  })

  it('passes over a line with a short stamp, an unknown source, or no source at all', () => {
    for (const line of [
      'fault off workstation archive 1794504838.5',
      'fault on workstation archive 1794504838.500000',
      'tcpdump eth0 12:00:00.000000 IP 10.0.0.1 > 10.0.0.2: ICMP echo request',
      'fault',
      '',
    ]) {
      expect(parseEventLine(line)).toBeNull()
    }
  })
})
