import type { Validated } from '@dicomfall/core/types'
import type { FileRead, LabPath, LabReadings, ReadingRequest } from '@dicomfall/game/types'
import type { ShowReading } from '@dicomfall/machine/types'
import { shellQuote } from '@dicomfall/machine/utils'

/** How the judge reads the lab: the browser's connection, or a session in Node. */
export interface LabReader {
  /** go-dicom's reading of a file, `go-dicom show <path> --json` as root. */
  readonly readShow: (path: LabPath) => Promise<Validated<ShowReading>>
  /** Runs a line as root and returns what it printed and its status. */
  readonly run: (line: string) => Promise<{ readonly status: number; readonly output: string } | null>
}

/** Root's line that lists every regular file under a folder, at any depth, one path a line; nothing for a missing folder. */
export const listFilesLine = (folder: LabPath): string =>
  `[ -d ${shellQuote(folder)} ] && find ${shellQuote(folder)} -type f | sort || true`

/** A reading as the checks take it; a ShowReading is a FileReading, which the compiler checks here. */
export function fileReadOf(read: Validated<ShowReading>): FileRead {
  return read.ok ? { ok: true, reading: read.value } : { ok: false, error: read.errors.join('; ') }
}

async function readFiles(reader: LabReader, paths: readonly LabPath[]): Promise<Record<LabPath, FileRead>> {
  const files: Record<LabPath, FileRead> = {}
  // One at a time: the control channel runs one line at a time anyway.
  for (const path of paths) {
    files[path] = fileReadOf(await reader.readShow(path))
  }
  return files
}

/** go-dicom's readings of a mission's start files, as the lab starts: before the player moves any. */
export function readStart(reader: LabReader, request: ReadingRequest): Promise<Record<LabPath, FileRead>> {
  return readFiles(reader, request.startFiles)
}

/**
 * Everything a mission's file checks read, as the lab is now: each file they name, each folder
 * they list and every file under it. `start` is what `readStart` took when the lab was built.
 */
export async function readLab(
  reader: LabReader,
  request: ReadingRequest,
  start: Readonly<Record<LabPath, FileRead>>
): Promise<LabReadings> {
  const folders: Record<LabPath, LabPath[]> = {}
  for (const folder of request.folders) {
    const listed = await reader.run(listFilesLine(folder))
    folders[folder] =
      listed === null || listed.status !== 0
        ? []
        : listed.output
            .replaceAll('\r', '')
            .split('\n')
            .filter((line) => line.startsWith('/'))
  }
  const paths = [...new Set([...request.files, ...Object.values(folders).flat()])]
  return { files: await readFiles(reader, paths), folders, start }
}
