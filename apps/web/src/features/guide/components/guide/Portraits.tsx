import type { GuidePortraitId, SpeakerInfo } from '@features/guide/types'
import { InitialPortrait } from '@shared/components/ui'
import type { Speaker } from '@shared/types'

/** Each guide's initial, drawn in the portrait's place until the guide has a portrait of its own. */
const INITIALS: Readonly<Record<GuidePortraitId, string>> = {
  preamble: 'P',
  vr: 'V',
  'instance-uid': 'I',
  scp: 'S',
  archive: 'A',
  'conformance-statement': 'C',
}

/** The dialogue's portrait sizes, in px: in its header, and in a cut-in. */
const PORTRAIT_SIZE = 56
const AVATAR_SIZE = 30

/** A speaker from the story, drawn: their portrait and cut-in avatar, or none for a voice without one. */
export function speakerWithPortraits(info: SpeakerInfo): Speaker {
  const initial = info.portrait === null ? null : INITIALS[info.portrait]
  return {
    id: info.id,
    name: info.name,
    term: info.term,
    portrait: initial === null ? null : <InitialPortrait initial={initial} size={PORTRAIT_SIZE} />,
    avatar: initial === null ? null : <InitialPortrait initial={initial} size={AVATAR_SIZE} />,
  }
}
