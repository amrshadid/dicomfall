/** A mission's three hints, always revealed in this order: a nudge, the concept, then the spot. */
export const HINT_TIERS = ['nudge', 'concept', 'spot'] as const

export type HintTier = (typeof HINT_TIERS)[number]

/** A hint as the player sees it once revealed: text only, since no hint gives a command. */
export interface RevealedHint {
  readonly tier: HintTier
  readonly text: string
}
