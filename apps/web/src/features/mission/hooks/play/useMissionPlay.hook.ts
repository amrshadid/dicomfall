import { useMissionActions } from '@dicomfall/game/hooks'
import {
  type ByteRange,
  type LabPath,
  type MissionDefinition,
  type MissionVerdict,
  NO_PLAYER_ACTIONS,
  type ObjectiveId,
  type PlayerActions,
} from '@dicomfall/game/types'
import {
  type UseFileReadingResult,
  useCommandFinished,
  useFileReading,
  useMachineControls,
} from '@dicomfall/machine/hooks'
import {
  applyChange,
  createLiveJudge,
  createMissionJudge,
  type LabReader,
  type MissionJudge,
} from '@dicomfall/missions/utils'
import type { MissionLabPhase } from '@features/mission/hooks/lab'
import { defaultFileOf, labFilesOf } from '@features/mission/utils/play'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

export interface UseMissionPlayResult {
  /**
   * The objectives judged live against go-dicom's readings of the lab, a met one staying met until
   * Start over. Null before the first judging of this play-through.
   */
  readonly verdict: MissionVerdict | null
  /** What the player has marked and typed, as the checks read it. */
  readonly actions: PlayerActions
  /** The lab's files the File inspector can open, and the one it shows. */
  readonly files: readonly LabPath[]
  readonly file: LabPath | null
  readonly selectFile: (file: LabPath) => void
  /** go-dicom's reading of the file shown, beside its bytes: the inspector and the Lightbox share it. */
  readonly reading: UseFileReadingResult
  /** Marks a byte range of the file shown, or clears the mark. */
  readonly mark: (range: ByteRange | null) => void
  readonly answer: (objective: ObjectiveId, value: string) => void
  readonly predict: (objective: ObjectiveId, offset: number) => void
}

/** A command may still be writing its files when the prompt comes back; the lab is read just after. */
const AFTER_COMMAND_MS = 400
/** A mark or an answer changes no file: it is judged at once, on the readings already taken. */
const AFTER_ACTION_MS = 0

/**
 * One play-through on the lab: the game's judge, fed what the player marks and types and the
 * commands they finish, and the file the inspector shows. The judging is the engine's
 * (`createMissionJudge`, `createLiveJudge`); this hook only wires it to the Machine and to React.
 * `key` names the play-through: a new one, after Start over, starts with nothing met or marked.
 */
export function useMissionPlay(
  mission: MissionDefinition | null,
  labPhase: MissionLabPhase,
  key: string
): UseMissionPlayResult {
  const controls = useMachineControls()
  const { recordAttempt } = useMissionActions()
  const files = useMemo(() => (mission ? labFilesOf(mission) : []), [mission])
  const [chosen, setChosen] = useState<LabPath | null>(null)
  const file = chosen !== null && files.includes(chosen) ? chosen : mission ? defaultFileOf(mission, files) : null
  const ready = labPhase === 'ready'
  const reading = useFileReading(ready ? file : null)

  const [actions, setActions] = useState<PlayerActions>(NO_PLAYER_ACTIONS)
  const [verdict, setVerdict] = useState<MissionVerdict | null>(null)
  // The judging runs outside React's renders, so it reads these rather than the state above.
  const actionsNow = useRef<PlayerActions>(NO_PLAYER_ACTIONS)
  const judgeNow = useRef<MissionJudge | null>(null)
  const reread = useRef(true)
  // The attempt is recorded once per play-through: the first judging that meets every objective.
  const submitted = useRef(false)
  const record = useRef(recordAttempt)
  record.current = recordAttempt

  const reader = useMemo<LabReader>(
    () => ({
      readShow: (path) => controls.readShow(path),
      run: async (line) => {
        const reply = await controls.run(line)
        return reply === null ? null : { status: reply.status, output: reply.output }
      },
    }),
    [controls]
  )

  const live = useMemo(
    () =>
      createLiveJudge(async () => {
        const judge = judgeNow.current
        if (judge === null) {
          return
        }
        const again = reread.current
        reread.current = false
        try {
          const judged = await judge.judge(actionsNow.current, again)
          // Start over replaced the judge while this one read: its verdict is of a lab that is gone.
          if (judgeNow.current !== judge) {
            return
          }
          setVerdict(judged)
          if (judged.passed && !submitted.current) {
            submitted.current = true
            await record.current(judged)
          }
        } catch {
          // A Machine that stopped answering is read again after the next command.
          reread.current = true
        }
      }),
    []
  )

  // A new play-through, or the lab built or put back: a fresh judge reads the start files first.
  useEffect(() => {
    // key only names the play-through.
    void key
    live.cancel()
    judgeNow.current = null
    submitted.current = false
    reread.current = true
    actionsNow.current = NO_PLAYER_ACTIONS
    setActions(NO_PLAYER_ACTIONS)
    setVerdict(null)
    if (!ready || mission === null) {
      return
    }
    const judge = createMissionJudge(mission, reader)
    judgeNow.current = judge
    void judge.start().then(
      () => {
        if (judgeNow.current === judge) {
          live.request(AFTER_ACTION_MS)
        }
      },
      () => {}
    )
    return () => live.cancel()
  }, [key, ready, mission, reader, live])

  useCommandFinished(() => {
    reread.current = true
    live.request(AFTER_COMMAND_MS)
    reading.reload()
  })

  const change = useCallback(
    (next: (previous: PlayerActions) => PlayerActions) => {
      const updated = next(actionsNow.current)
      actionsNow.current = updated
      setActions(updated)
      live.request(AFTER_ACTION_MS)
    },
    [live]
  )

  const mark = useCallback(
    (range: ByteRange | null) =>
      change((previous) =>
        range === null || file === null
          ? { ...previous, selection: null }
          : applyChange(previous, { select: { file, from: range.from, to: range.to } })
      ),
    [change, file]
  )
  const answer = useCallback(
    (objective: ObjectiveId, value: string) =>
      change((previous) => applyChange(previous, { answer: { objective, value } })),
    [change]
  )
  const predict = useCallback(
    (objective: ObjectiveId, offset: number) =>
      change((previous) => applyChange(previous, { predict: { objective, offset } })),
    [change]
  )

  return { verdict, actions, files, file, selectFile: setChosen, reading, mark, answer, predict }
}
