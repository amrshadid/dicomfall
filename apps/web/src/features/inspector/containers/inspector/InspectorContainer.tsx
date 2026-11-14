import { FileInspector, InspectorPresentation } from '@features/inspector/components'
import type { InspectorTab } from '@features/inspector/types'
import { INSPECTOR_WAITING, NO_LAB_FILE } from '@features/inspector/utils/tabs'
import type { UseMissionPlayResult } from '@features/mission/hooks/play'
import { useState } from 'react'

export interface InspectorContainerProps {
  /** The play-through: the file shown, go-dicom's reading of it, and the marked range. Null: nothing to show. */
  play?: Pick<UseMissionPlayResult, 'files' | 'file' | 'selectFile' | 'reading' | 'actions' | 'mark'> | null
}

/**
 * The Inspector, File tab first. The File tab draws go-dicom's reading of the lab's file once the
 * lab is built; the Wire tab waits for go-dicom's event log, and says so instead of guessing.
 */
export function InspectorContainer({ play = null }: InspectorContainerProps) {
  const [tab, setTab] = useState<InspectorTab>('file')
  const reading = play?.reading ?? null
  const fileShown = tab === 'file' && play !== null && reading !== null && reading.phase !== 'idle'
  const notice =
    tab === 'wire'
      ? INSPECTOR_WAITING.wire
      : fileShown
        ? null
        : play?.files.length === 0
          ? NO_LAB_FILE
          : INSPECTOR_WAITING.file
  const selection = play?.actions.selection ?? null
  const here = selection !== null && selection.file === play?.file ? selection : null

  return (
    <InspectorPresentation tab={tab} onSelectTab={setTab} notice={notice}>
      {fileShown && reading !== null && (
        <FileInspector
          files={play.files}
          file={play.file}
          onSelectFile={play.selectFile}
          phase={reading.phase}
          errors={reading.errors}
          reading={reading.reading}
          bytes={reading.bytes}
          marked={here === null ? null : { from: here.from, to: here.to }}
          markedElsewhere={
            selection !== null && here === null
              ? `${selection.file}, bytes ${selection.from} to ${selection.to - 1}`
              : null
          }
          onMark={play.mark}
        />
      )}
    </InspectorPresentation>
  )
}
