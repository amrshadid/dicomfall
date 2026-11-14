import { describe, expect, it } from 'vitest'
import {
  CT_IMAGE_STORAGE,
  EXAMPLE_CHAPTERS_YAML,
  EXAMPLE_MISSION_YAML,
  EXAMPLE_REGION,
  EXPLICIT_VR_LITTLE_ENDIAN,
  WIRE_MISSION_YAML,
} from '#test/index'
import { validateChapters } from '#utils/validate/chapters.schema'
import { validateMission } from '#utils/validate/mission.schema'
import { validateSkills } from '#utils/validate/skills.schema'

const YAML = EXAMPLE_MISSION_YAML
const [FIND_META, NAME_SYNTAX] = YAML.objectives

/** Every problem found in the example mission with `fields` changed. */
function errorsWith(fields: Readonly<Record<string, unknown>>): readonly string[] {
  const result = validateMission({ ...YAML, ...fields })
  return result.ok ? [] : result.errors
}

/** The check as read inside the example mission, or every problem with it. */
function read(check: unknown) {
  const result = validateMission({ ...YAML, objectives: [{ ...FIND_META, check }] })
  return result.ok ? result.value.objectives[0]?.check : result.errors
}

describe('validateMission', () => {
  it('accepts a mission that uses every field and returns it typed', () => {
    const result = validateMission(YAML)
    expect(result).toMatchObject({
      ok: true,
      value: { id: 'the-transfer-syntax', version: 1, chapter: 'the-first-file' },
    })
    expect(result.ok && result.value.objectives.map((objective) => objective.check)).toEqual([
      { kind: 'selected', file: '/lab/ct.dcm', region: 'file-meta-information' },
      { kind: 'answer', file: '/lab/ct.dcm', element: '(0002,0010)' },
      { kind: 'offset', file: '/lab/ct.dcm', element: '(0002,0010)', offset: 228 },
    ])
  })

  it('reports every problem at once, each with the path of its field', () => {
    expect(
      errorsWith({
        id: 'The Syntax',
        version: 0,
        title: '',
        objective: undefined,
        dificulty: 'hard',
      })
    ).toEqual([
      'dificulty: unknown field (expected one of: id, version, title, summary, minutes, chapter, objective, skills, prerequisites, teaches, names, uses, objectives, hints, chips, codex, story)',
      'id: expected a kebab-case id like the-first-file, got "The Syntax"',
      'version: expected a number from 1 to 9007199254740991, got 0',
      'title: expected non-empty text, got empty text',
      'objective: expected non-empty text, got nothing',
    ])
  })

  it('refuses something that is not a mission at all', () => {
    expect(validateMission('mission')).toMatchObject({ ok: false })
    expect(validateMission(null)).toMatchObject({ ok: false })
  })

  describe('hints', () => {
    const [nudge, concept, spot] = YAML.hints

    it('wants exactly three: nudge, concept, spot', () => {
      expect(errorsWith({ hints: [nudge, concept] })).toEqual([
        'hints: expected exactly 3 hints (nudge, concept, spot), got 2',
      ])
      expect(errorsWith({ hints: [nudge, concept, spot, nudge] })).toEqual([
        'hints: expected exactly 3 hints (nudge, concept, spot), got 4',
      ])
      expect(errorsWith({ hints: undefined })).toEqual(['hints: expected a list, got nothing'])
    })

    it('lets only the spot name a command', () => {
      expect(errorsWith({ hints: [{ ...nudge, command: 'go-dicom show /lab/ct.dcm' }, concept, spot] })).toEqual([
        'hints[0].command: only the third hint (the spot) may name a command',
      ])
      expect(errorsWith({ hints: [nudge, concept, { text: 'Look.', comand: 'go-dicom show' }] })).toEqual([
        'hints[2].comand: unknown field (expected one of: text, command)',
      ])
    })
  })

  describe('teaching fields', () => {
    it('reads the summary, minutes, concepts, chips, cards and story sections', () => {
      const result = validateMission(YAML)
      expect(result.ok && result.value).toMatchObject({
        summary: 'Read the one element that tells a reader how the rest of the file is encoded.',
        minutes: 15,
        teaches: ['transfer-syntax'],
        names: ['implicit-vr'],
        uses: ['file-meta-information'],
        chips: [{ command: 'go-dicom show /lab/ct.dcm' }],
        codex: [
          {
            id: 'transfer-syntax',
            term: 'Transfer Syntax',
            sources: ['filereader/meta.go'],
            tryIt: 'go-dicom show /lab/ct.dcm',
          },
        ],
        story: { scene: 'story.md#scene', debrief: 'story.md#debrief', realWorld: 'story.md#real-world' },
      })
    })

    it('leaves names, chips and cards empty when they are left out', () => {
      const { names: _names, chips: _chips, codex: _codex, ...rest } = YAML
      const result = validateMission(rest)
      expect(result.ok && [result.value.names, result.value.chips, result.value.codex]).toEqual([[], [], []])
    })

    it('keeps to the concept budget and says each concept once', () => {
      expect(errorsWith({ teaches: ['a', 'b', 'c', 'd'] })).toEqual(['teaches: expected at most 3 concepts, got 4'])
      expect(errorsWith({ uses: ['transfer-syntax'] })).toEqual(['uses: "transfer-syntax" is already in teaches'])
    })

    it('checks every card field', () => {
      const [card] = YAML.codex
      expect(
        errorsWith({
          codex: [
            { ...card, id: 'Card', deepens: 'card', sources: ['/abs path'], docs: 'http://x', summary: 'old' },
            { ...card, deepens: 'transfer-syntax' },
          ],
        })
      ).toEqual([
        'codex[0].summary: unknown field (expected one of: id, term, simple, deep, deepens, sources, docs, tryIt)',
        'codex[0].id: expected a kebab-case id like the-first-file, got "Card"',
        'codex[0].sources[0]: expected a path in go-dicom’s source tree like filereader/reader.go, got "/abs path"',
        'codex[0].docs: expected an https:// link, got "http://x"',
        'codex[1].deepens: a card cannot deepen itself',
      ])
    })

    it('points the story at sections of story.md, the scene, debrief and real world always', () => {
      expect(
        errorsWith({ story: { scene: 'story.md#scene', debrief: 'debrief.md', seeit: 'story.md#see-it' } })
      ).toEqual([
        'story.seeit: unknown field (expected one of: scene, seeIt, buildIt, watchIt, debrief, realWorld)',
        'story.debrief: expected a story section like story.md#scene, got "debrief.md"',
        'story.realWorld: expected non-empty text, got nothing',
      ])
    })

    it('keeps minutes between 1 and 120', () => {
      expect(errorsWith({ minutes: 0 })).toEqual(['minutes: expected a number from 1 to 120, got 0'])
    })
  })

  describe('objectives', () => {
    it('needs at least one, with ids that differ', () => {
      expect(errorsWith({ objectives: [] })).toEqual(['objectives: expected at least one objective'])
      expect(errorsWith({ objectives: [FIND_META, FIND_META] })).toEqual([
        'objectives: "find-the-meta" appears more than once',
      ])
    })

    it('carries no hints of its own: the mission has them', () => {
      expect(errorsWith({ objectives: [{ ...NAME_SYNTAX, hints: YAML.hints }] })).toEqual([
        'objectives[0].hints: unknown field (expected one of: id, text, check)',
      ])
    })

    it("reports a check's problems under the objective's path", () => {
      expect(
        errorsWith({
          objectives: [
            { ...FIND_META, check: { kind: 'typed', command: 'go-dicom show' } },
            { ...NAME_SYNTAX, check: { kind: 'answer', file: 'ct.dcm', element: '0002,0010', value: 'x' } },
          ],
        })
      ).toEqual([
        'objectives[0].check.kind: expected one of selected, answer, offset, grouped, file, absent, association, rejected-context, status, received, subops, echo, got "typed"',
        'objectives[1].check.value: unknown field (expected one of: kind, file, element)',
        'objectives[1].check.file: expected an absolute path like /lab/ct.dcm, got "ct.dcm"',
        'objectives[1].check.element: expected a tag like (0002,0010), got "0002,0010"',
      ])
    })
  })

  describe('file checks', () => {
    const FILE = '/lab/ct.dcm'

    it('reads each kind with its own fields', () => {
      expect(read({ kind: 'selected', file: FILE, element: '(7FE0,0010)' })).toEqual({
        kind: 'selected',
        file: FILE,
        element: '(7FE0,0010)',
      })
      expect(read({ kind: 'absent', file: FILE, element: '(0010,0010)' })).toEqual({
        kind: 'absent',
        file: FILE,
        element: '(0010,0010)',
      })
      expect(read({ kind: 'grouped', files: ['/lab/a.dcm', '/lab/b.dcm'] })).toEqual({
        kind: 'grouped',
        files: ['/lab/a.dcm', '/lab/b.dcm'],
      })
      const file = { kind: 'file', file: FILE, transferSyntax: '1.2.840.10008.1.2', attributes: { '(0010,0010)': '' } }
      expect(read(file)).toEqual(file)
      expect(read({ kind: 'file', file: FILE, transferSyntax: '1.2.840.10008.1.2' })).toEqual({
        kind: 'file',
        file: FILE,
        transferSyntax: '1.2.840.10008.1.2',
      })
    })

    it('selects one element or one Part 10 region, never both or neither', () => {
      const both =
        'objectives[0].check: expected "element" (one element\'s bytes) or "region" (a Part 10 region), not both'
      expect(read({ kind: 'selected', file: FILE })).toEqual([both])
      expect(read({ kind: 'selected', file: FILE, element: '(0002,0010)', region: 'preamble' })).toEqual([both])
      expect(read({ kind: 'selected', file: FILE, region: 'header' })).toEqual([
        'objectives[0].check.region: expected one of preamble, prefix, file-meta-information, data-set, got "header"',
      ])
    })

    it('reports what each kind is missing or has wrong', () => {
      expect(read({ kind: 'offset', file: FILE, element: '(0002,0010)', offset: -1 })).toEqual([
        'objectives[0].check.offset: expected a number from 0 to 9007199254740991, got -1',
      ])
      expect(read({ kind: 'grouped', files: [FILE] })).toEqual([
        'objectives[0].check.files: expected two or more files to sort',
      ])
      expect(read({ kind: 'file', file: FILE })).toEqual([
        'objectives[0].check: expected "transferSyntax", "attributes" or both: what the file must decode to',
      ])
      expect(
        read({ kind: 'file', file: FILE, transferSyntax: '1.2.840.010', attributes: { PatientName: 'x' } })
      ).toEqual([
        'objectives[0].check.transferSyntax: expected a UID like 1.2.840.10008.1.2.1, got "1.2.840.010"',
        'objectives[0].check.attributes.PatientName: expected the key to be a tag like (0002,0010)',
      ])
    })
  })

  describe('wire checks', () => {
    it('reads one check of every wire kind', () => {
      const result = validateMission(WIRE_MISSION_YAML)
      expect(result.ok ? result.value.objectives.map((objective) => objective.check) : result.errors).toEqual([
        { kind: 'echo', from: 'modality', to: 'archive' },
        { kind: 'association', abstractSyntax: CT_IMAGE_STORAGE, transferSyntax: EXPLICIT_VR_LITTLE_ENDIAN },
        { kind: 'rejected-context', abstractSyntax: CT_IMAGE_STORAGE, result: 'abstract-syntax-not-supported' },
        { kind: 'status', status: 0 },
        { kind: 'received', ae: 'archive', sopInstanceUid: '1.2.826.0.1.3680043.8.498.1' },
        { kind: 'subops', operation: 'C-GET', completed: 1 },
      ])
    })

    it('keeps a status to 16 bits, as YAML writes hex: 0xA801', () => {
      expect(read({ kind: 'status', status: 0xa801 })).toEqual({ kind: 'status', status: 0xa801 })
      expect(read({ kind: 'status', status: 0x10000 })).toEqual([
        'objectives[0].check.status: expected a number from 0 to 65535, got 65536',
      ])
      expect(read({ kind: 'status', status: '0xA801' })).toEqual([
        'objectives[0].check.status: expected a whole number, got text',
      ])
    })

    it('reports the fields of each wire kind', () => {
      expect(read({ kind: 'association', abstractSyntax: 'CT Image Storage' })).toEqual([
        'objectives[0].check.abstractSyntax: expected a UID like 1.2.840.10008.1.2.1, got "CT Image Storage"',
        'objectives[0].check.transferSyntax: expected non-empty text, got nothing',
      ])
      expect(read({ kind: 'rejected-context', abstractSyntax: CT_IMAGE_STORAGE, result: 'refused' })).toEqual([
        'objectives[0].check.result: expected one of user-rejection, no-reason, abstract-syntax-not-supported, transfer-syntaxes-not-supported, got "refused"',
      ])
      expect(read({ kind: 'received', ae: '', sopInstanceUid: `1.${'2'.repeat(63)}` })).toEqual([
        'objectives[0].check.ae: expected non-empty text, got empty text',
        `objectives[0].check.sopInstanceUid: expected a UID like 1.2.840.10008.1.2.1, got "1.${'2'.repeat(63)}"`,
      ])
      expect(read({ kind: 'subops', operation: 'C-FIND', completed: 0 })).toEqual([
        'objectives[0].check.operation: expected one of C-GET, C-MOVE, got "C-FIND"',
        'objectives[0].check.completed: expected a number from 1 to 9007199254740991, got 0',
      ])
      expect(read({ kind: 'echo', from: 'modality', to: 'archive', port: 104 })).toEqual([
        'objectives[0].check.port: unknown field (expected one of: kind, from, to)',
      ])
    })
  })

  it('reports a mission that needs a skill it earns, the same skill twice, or earns none', () => {
    expect(errorsWith({ prerequisites: [...YAML.skills] })).toEqual([
      'prerequisites: "read-the-transfer-syntax" is also a skill this mission earns',
    ])
    expect(errorsWith({ prerequisites: ['first-contact', 'first-contact'] })).toEqual([
      'prerequisites: "first-contact" appears more than once',
    ])
    expect(errorsWith({ skills: [] })).toEqual(['skills: expected at least one skill the mission earns'])
    expect(errorsWith({ skills: undefined })).toEqual(['skills: expected a list, got nothing'])
  })
})

describe('validateSkills', () => {
  it('reads each skill and reports what is wrong with it', () => {
    expect(validateSkills({ skills: [{ id: 'a', title: 'A', region: 'r' }] })).toEqual({
      ok: true,
      value: [{ id: 'a', title: 'A', region: 'r', prerequisites: [] }],
    })
    expect(validateSkills({ skills: [{ id: 'A b', title: '', region: 'r', prerequisites: ['x'], level: 1 }] })).toEqual(
      {
        ok: false,
        errors: [
          'skills[0].level: unknown field (expected one of: id, title, region, prerequisites)',
          'skills[0].id: expected a kebab-case id like the-first-file, got "A b"',
          'skills[0].title: expected non-empty text, got empty text',
        ],
      }
    )
  })
})

describe('validateChapters', () => {
  it('numbers the stages in the order of the file', () => {
    expect(validateChapters(EXAMPLE_CHAPTERS_YAML)).toMatchObject({
      ok: true,
      value: [
        { id: 'the-first-file', stage: 1, title: 'The first file' },
        { id: 'the-elements', stage: 2 },
      ],
    })
  })

  it('reports every problem with its path', () => {
    const [first] = EXAMPLE_CHAPTERS_YAML.chapters
    expect(validateChapters({ chapters: [first, { ...first, summary: '', stage: 4 }], version: 1 })).toEqual({
      ok: false,
      errors: [
        'version: unknown field (expected one of: chapters)',
        'chapters[1].stage: unknown field (expected one of: id, title, summary, story, guide, standsFor, outcomes, regions)',
        'chapters[1].summary: expected non-empty text, got empty text',
        'chapters: "the-first-file" appears more than once',
      ],
    })
    expect(validateChapters({ chapters: [] })).toEqual({
      ok: false,
      errors: ['chapters: expected at least one chapter'],
    })
    expect(validateChapters([])).toMatchObject({ ok: false })
  })

  it("reads a chapter's regions, each with at least one mission", () => {
    const [first] = EXAMPLE_CHAPTERS_YAML.chapters
    expect(validateChapters({ chapters: [{ ...first, regions: [EXAMPLE_REGION] }] })).toMatchObject({
      ok: true,
      value: [{ regions: [EXAMPLE_REGION] }],
    })
    expect(validateChapters(EXAMPLE_CHAPTERS_YAML)).toMatchObject({
      ok: true,
      value: [{ regions: [] }, { regions: [] }],
    })
    const broken = { ...EXAMPLE_REGION, id: 'Syntax', missions: ['a', 'a'], stops: 1 }
    expect(
      validateChapters({ chapters: [{ ...first, regions: [broken, { ...EXAMPLE_REGION, missions: [] }] }] })
    ).toEqual({
      ok: false,
      errors: [
        'chapters[0].regions[0].stops: unknown field (expected one of: id, name, caption, guide, source, missions)',
        'chapters[0].regions[0].id: expected a kebab-case id like the-first-file, got "Syntax"',
        'chapters[0].regions[0].missions: "a" appears more than once',
        'chapters[0].regions[1].missions: expected at least one mission',
      ],
    })
  })
})
