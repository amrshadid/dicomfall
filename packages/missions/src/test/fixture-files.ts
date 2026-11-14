import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { ContentFiles } from '#types/definitions/content'
import { readContentDir } from '#utils/loader/disk-content.util'

/** The test content folder: two missions of the first stage, laid out as `content/` is. */
export const FIXTURE_DIR = join(dirname(fileURLToPath(import.meta.url)), 'fixture-content')

export const FIXTURE_MISSION = '1-the-first-file/01-the-transfer-syntax'

export const FIXTURE_FILES: ContentFiles = readContentDir(FIXTURE_DIR)
