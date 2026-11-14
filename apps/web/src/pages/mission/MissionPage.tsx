import { CodexModalContainer } from '@features/codex'
import { NotFoundContainer } from '@features/content'
import { DebriefContainer } from '@features/debrief'
import { GuideContainer } from '@features/guide'
import { InspectorContainer } from '@features/inspector'
import { LightboxImageContainer, LightboxSectionContainer, UidTrailContainer } from '@features/lightbox'
import { MissionContainer } from '@features/mission'
import { TerminalContainer } from '@features/terminal'

export interface MissionPageProps {
  missionId: string
  /** A Codex card open over the mission, from the address. */
  cardId: string | null
}

/** `#/mission/<id>`: the mission's container lays the panels' containers out around its lab. */
export function MissionPage({ missionId, cardId }: MissionPageProps) {
  return (
    <>
      <MissionContainer
        missionId={missionId}
        guide={(view) => <GuideContainer {...view} />}
        terminal={({ run }) => <TerminalContainer building={run.phase === 'building'} />}
        inspector={({ play }) => <InspectorContainer play={play} />}
        preview={({ play }) => <LightboxImageContainer file={play.file} reading={play.reading} />}
        uids={({ play }) => <UidTrailContainer file={play.file} reading={play.reading} />}
        timeline={<LightboxSectionContainer section="timeline" />}
        debrief={({ onPlayAgain }) => <DebriefContainer onPlayAgain={onPlayAgain} />}
        notFound={<NotFoundContainer />}
      />
      <CodexModalContainer missionId={missionId} cardId={cardId} />
    </>
  )
}
