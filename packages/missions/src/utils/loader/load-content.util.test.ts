import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { isMissionOpen, unlockedSkills } from '@dicomfall/game/utils'
import { describe, expect, it } from 'vitest'
import { FIXTURE_FILES, FIXTURE_MISSION } from '#test/index'
import type { ContentFiles } from '#types/definitions/content'
import { appContent } from '#utils/loader/app-content.util'
import { CONTENT_FILES } from '#utils/loader/content-files.util'
import { readContentDir } from '#utils/loader/disk-content.util'
import { loadContent } from '#utils/loader/load-content.util'

const CONTENT_DIR = join(dirname(fileURLToPath(import.meta.url)), '../../../content')

const withFiles = (change: Partial<ContentFiles>): ContentFiles => ({ ...FIXTURE_FILES, ...change })

const errorsOf = (files: ContentFiles): readonly string[] => {
  const loaded = loadContent(files)
  return loaded.ok ? [] : loaded.errors
}

describe('the repository’s content', () => {
  it('loads with no problems', () => {
    const loaded = appContent()
    expect(loaded.ok ? [] : loaded.errors).toEqual([])
  })

  it('has the seven stages in play order, each with its guide', () => {
    const loaded = appContent()
    if (!loaded.ok) {
      throw new Error(loaded.errors.join('\n'))
    }
    const { game } = loaded.value
    expect(game.chapters.map((chapter) => [chapter.heading, chapter.id, chapter.guide])).toEqual([
      ['Stage 1', 'the-first-file', 'The Preamble'],
      ['Stage 2', 'the-elements', 'VR'],
      ['Stage 3', 'the-object', 'The Instance UID'],
      ['Bridge', 'the-bridge', 'The Instance UID'],
      ['Stage 4', 'the-association', 'The SCP'],
      ['Stage 5', 'query-and-retrieve', 'The Archive'],
      ['Stage 6', 'interoperability', 'The Conformance Statement'],
    ])
  })

  it('reads the same files through the bundler as from disk', () => {
    expect(CONTENT_FILES).toEqual(readContentDir(CONTENT_DIR))
  })
})

describe('a valid content folder', () => {
  const loaded = loadContent(FIXTURE_FILES)
  if (!loaded.ok) {
    throw new Error(loaded.errors.join('\n'))
  }
  const { game, storyOf, folderOf } = loaded.value

  it('loads its missions in play order, numbered by stage', () => {
    expect(game.missions.map((mission) => [game.numberOf(mission.id), mission.id])).toEqual([
      ['1.1', 'the-transfer-syntax'],
      ['1.2', 'explicit-and-implicit'],
    ])
    expect(game.mission('the-transfer-syntax')?.objectives.map((objective) => objective.check.kind)).toEqual([
      'selected',
      'answer',
      'offset',
    ])
  })

  it('opens each mission with the skills the one before it earns', () => {
    const openAfter = (completed: readonly string[]) =>
      game.missions
        .filter((mission) => !completed.includes(mission.id))
        .filter((mission) => isMissionOpen(mission, unlockedSkills(game.missions, completed)))
        .map((mission) => mission.id)
    expect(openAfter([])).toEqual(['the-transfer-syntax'])
    expect(openAfter(['the-transfer-syntax'])).toEqual(['explicit-and-implicit'])
    expect(game.earnedIn('tell-explicit-from-implicit')?.id).toBe('explicit-and-implicit')
  })

  it('gives a mission its story and its folder', () => {
    const story = storyOf('the-transfer-syntax')
    expect(story?.title).toBe('The Transfer Syntax')
    expect([...(story?.sections.keys() ?? [])]).toEqual(['scene', 'debrief', 'real-world'])
    expect(story?.sections.get('real-world')).toContainEqual(expect.objectContaining({ kind: 'code' }))
    expect(folderOf('the-transfer-syntax')).toBe(FIXTURE_MISSION)
  })

  it('checks concepts, cards and the Field Guide together', () => {
    expect(game.concept('implicit-vr')?.codex).toBe('implicit-vr')
    expect(game.card('implicit-vr')?.missionId).toBe('explicit-and-implicit')
    expect(game.fieldGuide.entries.map((entry) => entry.firstMet)).toEqual(['the-transfer-syntax'])
  })
})

describe('broken content', () => {
  const missionPath = `${FIXTURE_MISSION}/mission.yaml`
  const storyPath = `${FIXTURE_MISSION}/story.md`
  const missionText = FIXTURE_FILES.missions[missionPath] ?? ''
  const storyText = FIXTURE_FILES.stories[storyPath] ?? ''

  it('names the file that is not YAML', () => {
    expect(errorsOf(withFiles({ chapters: 'chapters: [' }))[0]).toMatch(/^chapters\.yaml: not valid YAML/)
  })

  it('names the file and the field of a bad mission', () => {
    const text = missionText.replace('minutes: 15', 'minutes: soon')
    const errors = errorsOf(withFiles({ missions: { ...FIXTURE_FILES.missions, [missionPath]: text } }))
    expect(errors).toHaveLength(1)
    expect(errors[0]).toMatch(new RegExp(`^${missionPath}: minutes`))
  })

  it('names a hint that gives a command, and a check that reads a file the lab does not copy', () => {
    const text = missionText
      .replace('  - text: Everything after', '  - command: go-dicom show /lab/ct.dcm\n    text: Everything after')
      .replace('{ kind: answer, file: /lab/ct.dcm', '{ kind: answer, file: /lab/other.dcm')
    expect(errorsOf(withFiles({ missions: { ...FIXTURE_FILES.missions, [missionPath]: text } }))).toEqual([
      `${missionPath}: hints[0].command: no hint gives a command: point at the spot in its text instead`,
    ])
    const lost = missionText.replace('{ kind: answer, file: /lab/ct.dcm', '{ kind: answer, file: /lab/other.dcm')
    expect(errorsOf(withFiles({ missions: { ...FIXTURE_FILES.missions, [missionPath]: lost } }))).toEqual([
      `${missionPath}: objectives[1].check.file: "/lab/other.dcm" is not in the lab: expected a file of lab.files, under one of its folders, or under an AE's /lab/<ae>/received/`,
    ])
  })

  it('wants a story beside every mission', () => {
    const errors = errorsOf(withFiles({ stories: {} }))
    expect(errors).toHaveLength(Object.keys(FIXTURE_FILES.missions).length)
    expect(errors[0]).toBe(`${storyPath}: missing or empty`)
  })

  it('names the story section a mission points at and its story lacks, and each problem’s line', () => {
    const text = storyText.replace('## Debrief', '## Later').replace('## Scene', '## Scene\n\n### Aside')
    expect(errorsOf(withFiles({ stories: { ...FIXTURE_FILES.stories, [storyPath]: text } }))).toEqual([
      `${storyPath}:7: only "# Title" and "## Section" headings are read`,
      `${storyPath}: no section for "story.md#debrief"`,
    ])
  })

  it('wants the story’s title to be the mission’s', () => {
    const text = storyText.replace('# The Transfer Syntax', '# Another Title')
    expect(errorsOf(withFiles({ stories: { ...FIXTURE_FILES.stories, [storyPath]: text } }))).toEqual([
      `${storyPath}:1: the title is "Another Title", but mission.yaml calls it "The Transfer Syntax"`,
    ])
  })

  it('wants concepts.yaml and field-guide.yaml, and every concept a mission names in it', () => {
    expect(errorsOf(withFiles({ concepts: 'concepts: []' }))).toContain(
      'missions.the-transfer-syntax.teaches[0]: "transfer-syntax" is not a concept of concepts.yaml'
    )
    expect(errorsOf(withFiles({ fieldGuide: '' }))[0]).toMatch(/^field-guide\.yaml: /)
  })

  it('wants skills.yaml, every skill a mission names in it, and every skill earned', () => {
    expect(errorsOf(withFiles({ skills: '' }))[0]).toMatch(/^skills\.yaml: /)
    expect(errorsOf(withFiles({ skills: 'skills: []' }))).toContain(
      'missions.the-transfer-syntax.skills[0]: "read-the-transfer-syntax" is not a skill of skills.yaml'
    )
    const unearned = `${FIXTURE_FILES.skills}  - { id: ghost-skill, title: Nothing, region: transfer-syntaxes }\n`
    expect(errorsOf(withFiles({ skills: unearned }))).toEqual(['skills[2]: no mission earns "ghost-skill"'])
  })

  it('wants every stage with missions grouped in regions', () => {
    const chapters = FIXTURE_FILES.chapters.replace(/ {4}regions:\n(?: {6}.*\n)+/, '')
    expect(errorsOf(withFiles({ chapters }))).toEqual([
      'chapters.yaml: chapters[0].regions: a chapter with missions groups them in regions',
    ])
  })

  it('wants the folder to be named after the chapter and the mission', () => {
    const moved = '2-the-elements/01-something-else'
    const errors = errorsOf(
      withFiles({
        missions: { [`${moved}/mission.yaml`]: missionText },
        stories: { [`${moved}/story.md`]: storyText },
      })
    )
    expect(errors).toEqual([
      `${moved}/mission.yaml: chapter is "the-first-file", but the folder is in "the-elements"`,
      `${moved}/mission.yaml: id is "the-transfer-syntax", but the folder is named "something-else"`,
    ])
  })

  it('refuses a mission file outside a chapter folder', () => {
    expect(errorsOf(withFiles({ missions: { 'loose/mission.yaml': 'id: x' } }))[0]).toBe(
      'loose/mission.yaml: expected <number>-<chapter>/<number>-<mission>/mission.yaml'
    )
  })
})
