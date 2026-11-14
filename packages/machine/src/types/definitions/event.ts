import type { LinkDefinition } from '#types/definitions/network'

/**
 * What the Machine reports on its event port. The console aside, these are the only thing the
 * inspector, the lightbox, the checks and the golden runs read.
 *
 * go-dicom's own events (association requested, accepted, released…; DIMSE sent and received)
 * join this union once its `-events` JSON-lines log is released, each parsed from lines copied
 * from a real run: see `utils/events/event-parser.util.ts`.
 */
export type MachineEvent =
  /** The game started losing packets on a link, both ways. Its interfaces stay up. */
  | { readonly type: 'fault_injected'; readonly link: LinkDefinition; readonly lossPercent: number }
  | { readonly type: 'fault_cleared'; readonly link: LinkDefinition }

export type MachineEventType = MachineEvent['type']

/** What the stream adds to an event. */
export interface MachineEventStamp {
  /**
   * The order it reached the game in. Strictly increasing, starts at 0. Not the order things
   * happened in: a log line can arrive after a later one from another source, so sort by `timeMs`.
   */
  readonly seq: number
  /** The Machine's own clock when it happened, in milliseconds since the Unix epoch. */
  readonly timeMs: number
}

/** An event as observers see it. Distributes over the union. */
export type StampedMachineEvent = MachineEvent extends infer Event
  ? Event extends MachineEvent
    ? Event & MachineEventStamp
    : never
  : never
