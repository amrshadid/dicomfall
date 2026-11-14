import { describe, expect, it } from 'vitest'
import {
  CT_IMAGE_STORAGE,
  EXAMPLE_CHAPTERS_YAML,
  EXAMPLE_LAB_YAML,
  EXAMPLE_MISSION_YAML,
  EXAMPLE_REGION,
  EXPLICIT_VR_LITTLE_ENDIAN,
  WIRE_LAB_YAML,
  WIRE_MISSION_YAML,
} from '#test/index'
import { DIMSE_MESSAGES } from '#types/definitions/checks'
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

/** The check as read inside the example mission, in a lab with a link and every file it may name, or every problem with it. */
function read(check: unknown) {
  const result = validateMission({ ...YAML, lab: WIRE_LAB_YAML, objectives: [{ ...FIND_META, check }] })
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
      'dificulty: unknown field (expected one of: id, version, title, summary, minutes, chapter, objective, skills, prerequisites, teaches, names, uses, lab, objectives, hints, chips, codex, story)',
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

    it('lets no hint give a command, not even the spot', () => {
      expect(
        errorsWith({ hints: [nudge, concept, { ...spot, command: 'go-dicom show /lab/ct.dcm', tier: 3 }] })
      ).toEqual([
        'hints[2].command: no hint gives a command: point at the spot in its text instead',
        'hints[2].tier: unknown field (expected one of: text)',
      ])
      expect(errorsWith({ hints: [{ command: 'go-dicom show' }, concept, spot] })).toEqual([
        'hints[0].command: no hint gives a command: point at the spot in its text instead',
        'hints[0].text: expected non-empty text, got nothing',
      ])
    })

    it('reads each hint as its text alone', () => {
      const result = validateMission(YAML)
      expect(result.ok && result.value.hints).toEqual([nudge, concept, spot])
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
        'objectives[1].check.file: expected a path under /lab/ like /lab/ct.dcm, got "ct.dcm"',
        'objectives[1].check.element: expected a tag like (0002,0010), or a path into a sequence like (0008,1032)[0](0008,0100), got "0002,0010"',
      ])
    })
  })

  describe('file checks', () => {
    const FILE = '/lab/ct.dcm'
    const SERIES = ['/lab/series/a.dcm', '/lab/series/b.dcm']

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
      const grouped = { kind: 'grouped', files: SERIES, into: '/lab/sorted', by: 'series' }
      expect(read(grouped)).toEqual(grouped)
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

    it("narrows an element to its tag, VR, length or value, and only an element's", () => {
      for (const part of ['tag', 'vr', 'length', 'value']) {
        expect(read({ kind: 'selected', file: FILE, element: '(0008,0060)', part })).toEqual({
          kind: 'selected',
          file: FILE,
          element: '(0008,0060)',
          part,
        })
      }
      expect(read({ kind: 'selected', file: FILE, element: '(0008,0060)', part: 'padding' })).toEqual([
        'objectives[0].check.part: expected one of tag, vr, length, value, got "padding"',
      ])
      expect(read({ kind: 'selected', file: FILE, region: 'preamble', part: 'value' })).toEqual([
        'objectives[0].check.part: only an element has parts: leave "part" out for a region',
      ])
      expect(read({ kind: 'selected', file: FILE, element: '(0008,1032)[0]', part: 'vr' })).toEqual([
        'objectives[0].check.part: an item has no VR: expected tag, length or value',
      ])
    })

    it('reads paths into sequences, an item alone where the check can mark or place one', () => {
      const nested = '(0008,1032)[0](0008,0100)'
      expect(read({ kind: 'answer', file: FILE, element: nested })).toEqual({
        kind: 'answer',
        file: FILE,
        element: nested,
      })
      expect(read({ kind: 'selected', file: FILE, element: '(0040,0275)[1](0040,0008)[0]' })).toEqual({
        kind: 'selected',
        file: FILE,
        element: '(0040,0275)[1](0040,0008)[0]',
      })
      expect(read({ kind: 'offset', file: FILE, element: '(0008,1032)[0]', offset: 400 })).toMatchObject({
        element: '(0008,1032)[0]',
      })
      const elementOnly =
        'expected a tag like (0002,0010), or a path into a sequence like (0008,1032)[0](0008,0100), got "(0008,1032)[0]"'
      expect(read({ kind: 'answer', file: FILE, element: '(0008,1032)[0]' })).toEqual([
        `objectives[0].check.element: ${elementOnly}`,
      ])
      expect(read({ kind: 'absent', file: FILE, element: '(0008,1032)[01](0008,0100)' })).toEqual([
        'objectives[0].check.element: expected a tag like (0002,0010), or a path into a sequence like (0008,1032)[0](0008,0100), got "(0008,1032)[01](0008,0100)"',
      ])
      expect(read({ kind: 'selected', file: FILE, element: '(0008,1032)(0008,0100)' })).toEqual([
        'objectives[0].check.element: expected a tag like (0002,0010), a path into a sequence like (0008,1032)[0](0008,0100), or an item like (0008,1032)[0], got "(0008,1032)(0008,0100)"',
      ])
    })

    it('sorts files into a folder by study or by series, none of them there already', () => {
      expect(read({ kind: 'grouped', files: SERIES })).toEqual([
        'objectives[0].check.into: expected non-empty text, got nothing',
        'objectives[0].check.by: expected one of study, series, got undefined',
      ])
      expect(read({ kind: 'grouped', files: [...SERIES, SERIES[0]], into: '/lab/series', by: 'patient' })).toEqual([
        'objectives[0].check.by: expected one of study, series, got "patient"',
        'objectives[0].check.files[0]: "/lab/series/a.dcm" already sits under "/lab/series"',
        'objectives[0].check.files[1]: "/lab/series/b.dcm" already sits under "/lab/series"',
        'objectives[0].check.files[2]: "/lab/series/a.dcm" is listed twice',
        'objectives[0].check.files[2]: "/lab/series/a.dcm" already sits under "/lab/series"',
      ])
    })

    it('takes an attribute as go-dicom prints it, or as the same as another file’s', () => {
      const sameAs = { sameAs: { file: '/lab/ct.dcm', element: '(0008,0018)' } }
      const stored = {
        kind: 'file',
        file: '/lab/archive/received/1.2.3.dcm',
        transferSyntax: '1.2.840.10008.1.2.1',
        attributes: { '(0008,0018)': sameAs, '(0008,0060)': 'CT' },
      }
      expect(read(stored)).toEqual(stored)
      expect(
        read({
          kind: 'file',
          file: FILE,
          attributes: {
            '(0008,0018)': { sameAs: { file: FILE, element: '(0008,0018)' } },
            '(0008,0060)': { same: { file: FILE } },
            '(0010,0010)': 7,
          },
        })
      ).toEqual([
        'objectives[0].check.attributes.(0008,0060).same: unknown field (expected one of: sameAs)',
        'objectives[0].check.attributes.(0008,0060).sameAs: expected an object, got nothing',
        'objectives[0].check.attributes.(0010,0010): expected the value as go-dicom prints it, or { sameAs: { file, element } }, got a number',
        'objectives[0].check.attributes.(0008,0018): is the same as itself: name another file or element',
      ])
    })

    it('reports what each kind is missing or has wrong', () => {
      expect(read({ kind: 'offset', file: FILE, element: '(0002,0010)', offset: -1 })).toEqual([
        'objectives[0].check.offset: expected a number from 0 to 9007199254740991, got -1',
      ])
      expect(read({ kind: 'grouped', files: [FILE], into: '/lab/sorted', by: 'study' })).toEqual([
        'objectives[0].check.files: expected two or more files to sort',
      ])
      expect(read({ kind: 'answer', file: '/lab/../etc/passwd', element: '(0010,0010)' })).toEqual([
        'objectives[0].check.file: expected a path under /lab/ like /lab/ct.dcm, got "/lab/../etc/passwd"',
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

    it('marks an element of a DIMSE message in the Wire inspector, in place of a file', () => {
      const uid = { kind: 'selected', message: 'C-STORE-RQ', set: 'command', element: '(0000,1000)' }
      expect(read(uid)).toEqual(uid)
      const nested = { kind: 'selected', message: 'C-STORE-RQ', set: 'data', element: '(0008,1032)[0]', part: 'length' }
      expect(read(nested)).toEqual(nested)
      expect(read({ ...uid, file: '/lab/ct.dcm' })).toEqual([
        'objectives[0].check: expected "file" (the File inspector) or "message" and "set" (the Wire inspector), not both',
      ])
      expect(
        read({ kind: 'selected', message: 'C-STORE', set: 'meta', element: '(0000,1000)', region: 'prefix' })
      ).toEqual([
        `objectives[0].check.message: expected one of ${DIMSE_MESSAGES.join(', ')}, got "C-STORE"`,
        'objectives[0].check.set: expected one of command, data, got "meta"',
        'objectives[0].check.region: a region is a part of a file: a message has none',
      ])
    })

    it('keeps the Command Set to group 0000, with no sequence and no VR on the wire', () => {
      const store = { kind: 'selected', message: 'C-STORE-RQ' }
      expect(read({ ...store, set: 'command', element: '(0008,0018)' })).toEqual([
        'objectives[0].check.element: a Command Set holds only group 0000 elements',
      ])
      expect(read({ ...store, set: 'data', element: '(0000,1000)' })).toEqual([
        'objectives[0].check.element: group 0000 is the Command Set\'s: expected "set: command"',
      ])
      expect(read({ ...store, set: 'command', element: '(0000,1000)', part: 'vr' })).toEqual([
        'objectives[0].check.part: a Command Set element has no VR on the wire: expected tag, length or value',
      ])
      expect(read({ ...store, set: 'command', element: '(0000,1000)[0](0000,0100)' })).toEqual([
        'objectives[0].check.element: expected a tag like (0002,0010), got "(0000,1000)[0](0000,0100)"',
      ])
    })
  })

  describe('lab', () => {
    const LAB = WIRE_LAB_YAML
    const [MODALITY, ARCHIVE] = LAB.aes

    /** Every problem with the wire mission once its lab has `fields` changed. */
    const labErrors = (fields: Readonly<Record<string, unknown>>) => {
      const result = validateMission({ ...WIRE_MISSION_YAML, lab: { ...LAB, ...fields } })
      return result.ok ? [] : result.errors
    }

    it('reads the AEs, links, files and console, filling what is left out', () => {
      expect(validateMission(WIRE_MISSION_YAML)).toMatchObject({
        ok: true,
        value: {
          lab: {
            aes: [
              { name: 'modality', title: 'MODALITY', address: '10.0.1.1/24', start: [] },
              { name: 'archive', title: 'ARCHIVE', address: '10.0.1.2/24', start: ARCHIVE.start },
            ],
            links: [['modality', 'archive']],
            files: LAB.files,
            console: 'modality',
          },
        },
      })
      const result = validateMission(YAML)
      expect(result.ok && result.value.lab).toEqual({
        aes: [{ name: 'workstation', title: 'WORKSTATION', start: [] }],
        links: [],
        files: [{ fixture: 'ct-explicit-le.dcm', to: '/lab/ct.dcm' }],
        console: 'workstation',
      })
      const { links: _links, files: _files, ...bare } = EXAMPLE_LAB_YAML
      const noFiles = validateMission({ ...YAML, lab: bare })
      expect(noFiles.ok ? noFiles.value.lab : noFiles.errors).toEqual([
        'objectives[0].check.file: "/lab/ct.dcm" is not in the lab: expected a file of lab.files, under one of its folders, or under an AE\'s /lab/<ae>/received/',
        'objectives[1].check.file: "/lab/ct.dcm" is not in the lab: expected a file of lab.files, under one of its folders, or under an AE\'s /lab/<ae>/received/',
        'objectives[2].check.file: "/lab/ct.dcm" is not in the lab: expected a file of lab.files, under one of its folders, or under an AE\'s /lab/<ae>/received/',
      ])
    })

    it('wants a lab in every mission: every check reads one', () => {
      expect(errorsWith({ lab: undefined })).toEqual(['lab: expected an object, got nothing'])
      expect(errorsWith({ lab: { ...EXAMPLE_LAB_YAML, router: 'r1' } })).toEqual([
        'lab.router: unknown field (expected one of: aes, links, files, console)',
      ])
    })

    it('wants AE names unique and kebab-case', () => {
      expect(labErrors({ aes: [] })).toEqual(['lab.aes: expected at least one AE: the console opens in one'])
      expect(
        labErrors({ aes: [MODALITY, { ...ARCHIVE, name: 'modality', title: 'OTHER', address: '10.0.1.3/24' }] })
      ).toEqual(['lab.aes: "modality" appears more than once', 'lab.links[0]: no AE "archive" in lab.aes'])
      expect(labErrors({ aes: [{ ...MODALITY, name: 'Modality' }, ARCHIVE] })).toEqual([
        'lab.aes[0].name: expected a kebab-case id like the-first-file, got "Modality"',
      ])
    })

    it('wants AE titles as PS3.5 writes VR AE: 16 characters, no backslash or control character, not all spaces', () => {
      const titled = (title: unknown) => labErrors({ aes: [{ ...MODALITY, title }, ARCHIVE] })
      const expected = (got: string) =>
        `lab.aes[0].title: expected an AE title of 1 to 16 characters, with no backslash or control character, like WORKSTATION, got "${got}"`
      expect(titled('SIXTEEN_CHARS_OK')).toEqual([])
      expect(titled(' CT 1 ')).toEqual([])
      expect(titled('SEVENTEEN_CHARS_X')).toEqual([expected('SEVENTEEN_CHARS_X')])
      expect(titled('CT\\1')).toEqual([expected('CT\\1')])
      expect(titled('CT\t1')).toEqual([expected('CT\t1')])
      expect(titled('CTÉ')).toEqual([expected('CTÉ')])
      expect(titled('   ')).toEqual(['lab.aes[0].title: expected non-empty text, got empty text'])
      expect(labErrors({ aes: [MODALITY, { ...ARCHIVE, title: 'MODALITY' }] })).toEqual([
        'lab.aes: "MODALITY" appears more than once',
      ])
    })

    it('wants IPv4 addresses with a prefix length, one per AE, on a link’s network', () => {
      const addressed = (address: string) => labErrors({ aes: [{ ...MODALITY, address }, ARCHIVE] })
      const expected = (got: string) =>
        `lab.aes[0].address: expected an IPv4 address with its prefix length like 10.0.1.1/24, got "${got}"`
      for (const wrong of ['10.0.1.1', '10.0.1.256/24', '10.0.01.1/24', '10.0.1.1/33', '10.0.1/24', '10.0.1.1/0']) {
        expect(addressed(wrong)).toEqual([expected(wrong)])
      }
      expect(addressed('10.0.1.2/24')).toEqual(['lab.aes: "10.0.1.2" appears more than once'])
      expect(addressed('10.0.2.1/24')).toEqual([
        'lab.links[0]: "modality" and "archive" are on different networks: a veth pair joins one',
      ])
    })

    it('gives a linked AE an address and an AE with no link none', () => {
      const { address: _address, ...bare } = MODALITY
      expect(labErrors({ aes: [bare, ARCHIVE] })).toEqual([
        'lab.aes[0].address: "modality" is linked, so it needs an address',
      ])
      expect(labErrors({ aes: [...LAB.aes, { name: 'viewer', title: 'VIEWER', address: '10.0.1.3/24' }] })).toEqual([
        'lab.aes[2].address: "viewer" has no link: leave its address out',
      ])
    })

    it('wants each link to join two known AEs, once', () => {
      expect(
        labErrors({
          links: [
            ['modality', 'archive'],
            ['archive', 'modality'],
            ['modality', 'modality'],
            ['modality', 'pacs'],
            ['modality'],
            'modality-archive',
            ['modality', 'Archive'],
          ],
        })
      ).toEqual([
        'lab.links[4]: expected a pair of AE names like [workstation, archive], got a list',
        'lab.links[5]: expected a pair of AE names like [workstation, archive], got text',
        'lab.links[6][1]: expected an AE name like workstation, got "Archive"',
        'lab.links[1]: "archive" and "modality" are already linked',
        'lab.links[2]: a link joins two AEs, not "modality" to itself',
        'lab.links[3]: no AE "pacs" in lab.aes',
      ])
    })

    it('lets the Machine start go-dicom commands only', () => {
      expect(
        labErrors({ aes: [MODALITY, { ...ARCHIVE, start: ['storescp -port 11112', 'go-dicom storescp\n-port 104'] }] })
      ).toEqual([
        'lab.aes[1].start[0]: expected one go-dicom command on one line, got "storescp -port 11112"',
        'lab.aes[1].start[1]: expected one go-dicom command on one line, got "go-dicom storescp\n-port 104"',
      ])
    })

    it('copies fixtures to /lab/, a folder to a folder, each to a place of its own', () => {
      expect(
        labErrors({
          files: [
            { fixture: 'ct-explicit-le.dcm', to: '/lab/ct.dcm' },
            { fixture: '../secret.dcm', to: '/tmp/ct.dcm' },
            { fixture: 'series/', to: '/lab/series' },
            { fixture: 'series/', to: '/lab/series/' },
            { fixture: 'ct-implicit-le.dcm', to: '/lab/series/a.dcm', from: 'x' },
            { fixture: 'ct-implicit-le.dcm', to: '/lab/ct.dcm' },
          ],
        })
      ).toEqual([
        'lab.files[1].fixture: expected a path in packages/fixtures/out/ like ct-explicit-le.dcm, or a folder like series/, got "../secret.dcm"',
        'lab.files[1].to: expected a path under /lab/ like /lab/ct.dcm, or a folder like /lab/series/, got "/tmp/ct.dcm"',
        'lab.files[2].to: a folder fixture lands in a folder, a file in a file: end both in "/" or neither',
        'lab.files[4].from: unknown field (expected one of: fixture, to)',
        'lab.files[3].to: "/lab/series/" overlaps "/lab/series"',
        'lab.files[4].to: "/lab/series/a.dcm" overlaps "/lab/series/"',
        'lab.files[5].to: "/lab/ct.dcm" overlaps "/lab/ct.dcm"',
      ])
    })

    it('opens the console in one of its AEs', () => {
      expect(labErrors({ console: 'workstation' })).toEqual(['lab.console: no AE "workstation" in lab.aes'])
      expect(labErrors({ console: undefined })).toEqual(['lab.console: expected non-empty text, got nothing'])
    })
  })

  describe('checks against the lab', () => {
    /** Every problem with a mission whose one check is `check`, in `lab`. */
    const checkErrors = (check: unknown, lab: unknown = WIRE_LAB_YAML) => {
      const result = validateMission({ ...YAML, lab, objectives: [{ ...FIND_META, check }] })
      return result.ok ? [] : result.errors
    }
    const notInLab = (field: string, path: string) =>
      `objectives[0].check.${field}: "${path}" is not in the lab: expected a file of lab.files, under one of its folders, or under an AE's /lab/<ae>/received/`

    it('reads only files the lab copies, files under a folder it copies, or what an AE receives', () => {
      expect(checkErrors({ kind: 'answer', file: '/lab/series/c.dcm', element: '(0010,0010)' })).toEqual([])
      expect(
        checkErrors({ kind: 'file', file: '/lab/archive/received/1.2.3.dcm', transferSyntax: '1.2.840.10008.1.2.1' })
      ).toEqual([])
      expect(checkErrors({ kind: 'answer', file: '/lab/other.dcm', element: '(0010,0010)' })).toEqual([
        notInLab('file', '/lab/other.dcm'),
      ])
      expect(
        checkErrors({ kind: 'file', file: '/lab/viewer/received/1.dcm', transferSyntax: '1.2.840.10008.1.2.1' })
      ).toEqual([notInLab('file', '/lab/viewer/received/1.dcm')])
      expect(
        checkErrors({
          kind: 'grouped',
          files: ['/lab/series/a.dcm', '/lab/seriesb.dcm'],
          into: '/lab/sorted',
          by: 'study',
        })
      ).toEqual([notInLab('files[1]', '/lab/seriesb.dcm')])
      expect(
        checkErrors({
          kind: 'file',
          file: '/lab/ct.dcm',
          attributes: { '(0008,0018)': { sameAs: { file: '/lab/gone.dcm', element: '(0008,0018)' } } },
        })
      ).toEqual([notInLab('attributes.(0008,0018).sameAs.file', '/lab/gone.dcm')])
    })

    it('names only AEs of the lab', () => {
      expect(checkErrors({ kind: 'received', ae: 'pacs', sopInstanceUid: '1.2.3' })).toEqual([
        'objectives[0].check.ae: no AE "pacs" in lab.aes',
      ])
      expect(checkErrors({ kind: 'echo', from: 'workstation', to: 'archive' })).toEqual([
        'objectives[0].check.from: no AE "workstation" in lab.aes',
      ])
    })

    it('reads the wire only in a lab with a link, between AEs a link joins', () => {
      const alone = EXAMPLE_LAB_YAML
      expect(checkErrors({ kind: 'status', status: 0 }, alone)).toEqual([
        'objectives[0].check: a status check reads the wire, and the lab has no link',
      ])
      expect(
        checkErrors({ kind: 'selected', message: 'C-STORE-RQ', set: 'command', element: '(0000,1000)' }, alone)
      ).toEqual(['objectives[0].check: a selected check reads the wire, and the lab has no link'])
      const viewer = { name: 'viewer', title: 'VIEWER' }
      const three = { ...WIRE_LAB_YAML, aes: [...WIRE_LAB_YAML.aes, viewer] }
      expect(checkErrors({ kind: 'echo', from: 'viewer', to: 'archive' }, three)).toEqual([
        'objectives[0].check: no link joins "viewer" and "archive"',
      ])
      expect(checkErrors({ kind: 'received', ae: 'viewer', sopInstanceUid: '1.2.3' }, three)).toEqual([
        'objectives[0].check.ae: "viewer" has no link to receive on',
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
        { id: 'the-first-file', stage: 1, heading: 'Stage 1', numberPrefix: '1', title: 'The first file' },
        { id: 'the-elements', stage: 2, heading: 'Stage 2', numberPrefix: '2' },
      ],
    })
  })

  it('calls a labelled chapter by its label and leaves it out of the stage numbers', () => {
    const [first, second] = EXAMPLE_CHAPTERS_YAML.chapters
    const bridge = { ...second, id: 'the-bridge', title: 'On disk and on the wire', label: 'Bridge' }
    const result = validateChapters({ chapters: [first, bridge, { ...second, id: 'the-association' }] })
    expect(
      result.ok &&
        result.value.map(({ id, stage, label, heading, numberPrefix }) => ({ id, stage, label, heading, numberPrefix }))
    ).toEqual([
      { id: 'the-first-file', stage: 1, label: undefined, heading: 'Stage 1', numberPrefix: '1' },
      { id: 'the-bridge', stage: undefined, label: 'Bridge', heading: 'Bridge', numberPrefix: 'B' },
      { id: 'the-association', stage: 2, label: undefined, heading: 'Stage 2', numberPrefix: '2' },
    ])
    expect(result.ok && 'stage' in (result.value[1] ?? {})).toBe(false)
  })

  it('wants a label to start with a letter no other label starts with', () => {
    const [first, second] = EXAMPLE_CHAPTERS_YAML.chapters
    expect(
      validateChapters({
        chapters: [
          { ...first, label: 'Bridge' },
          { ...second, label: 'bonus' },
          { ...second, id: 'third', label: '4th' },
        ],
      })
    ).toEqual({
      ok: false,
      errors: [
        'chapters[2].label: expected one line starting with a letter, like Bridge, got "4th"',
        'chapters[1].label: "bonus" starts with "B", as "Bridge" does: their missions would share numbers',
      ],
    })
  })

  it('reports every problem with its path', () => {
    const [first] = EXAMPLE_CHAPTERS_YAML.chapters
    expect(validateChapters({ chapters: [first, { ...first, summary: '', stage: 4 }], version: 1 })).toEqual({
      ok: false,
      errors: [
        'version: unknown field (expected one of: chapters)',
        'chapters[1].stage: unknown field (expected one of: id, label, title, summary, story, guide, standsFor, outcomes, regions)',
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
