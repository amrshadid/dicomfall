# @dicomfall/game

The game's rules, with no mission built in: mission definitions and their schema, the `check:`
kinds a mission declares, staged hints, the Codex and the Field Guide, the skill tree, and the
player's progress saved in the browser. The missions themselves come from
`@dicomfall/missions`. File checks are judged here, as pure functions of what the player did and
go-dicom's own readings of the lab; wire checks wait for go-dicom's event log and are left
unevaluated.

> **Note:** this package holds logic only. The app uses `configureGame()`, `setupGameListeners()`,
> `/hooks`, `/types` and `/utils`; the screens live in `apps/web/src/features/`.

## Structure

```
src/
├── config.ts                 → configureGame({ storage, content, clock, slot, autosave }), getGameConfig,
│                               getGameNow, resetGameConfig
├── events/
│   ├── types.ts              → GAME_EVENTS (opened, mission started/completed, attempt recorded, hint revealed,
│   │                           saved, save failed, progress changed/reset) + payloads
│   └── listeners.ts          → setupGameListeners / cleanupGameListeners: autosave on PROGRESS_CHANGED
├── hooks/
│   ├── mission/              → useMissionActions (start, begin, replay, recordAttempt, showDebrief,
│   │                           leaveDebrief, leave), useActiveMission, useMissionList
│   ├── hints/                → useHints, revealHint
│   ├── codex/                → useCodex, useFieldGuide
│   ├── notifications/        → useMissionCompleted, useSaveFailed
│   ├── saves/                → useSaveActions (open, saveNow, exportSave, importSave, reset)
│   └── progress/             → useProgress
├── services/
│   ├── api/save.api.ts       → saveApi: load, write, remove (atomic writes, `.prev` fallback)
│   └── utils/                → the save queue, saveProgress, announceProgress, storage keys, and the game's
│                               failures as ServiceResponses (locked mission, invalid save…)
├── store/progress.store.ts   → missions started and completed, attempts, hints used, the active mission,
│                               save state
├── types/definitions/
│   ├── mission.ts            → MissionDefinition, ObjectiveDefinition, HintDefinition, CodexCard,
│   │                           ChapterDefinition (stage or label, heading, numberPrefix), RegionDefinition
│   ├── lab.ts                → LabDefinition: the AEs (name, AE title, address, start), links, files, console
│   ├── checks.ts             → CheckDefinition (file and wire `check:` kinds, element paths, `sameAs`),
│   │                           MissionVerdict
│   ├── content.ts            → GameContent
│   ├── codex.ts, field-guide.ts, concepts.ts, skills.ts, hints.ts
│   └── progress.ts, saves.ts, store.ts, config.ts
├── utils/
│   ├── checks/               → judgeMission, evaluateCheck, mergeVerdicts, readingRequestOf; checkSelected,
│   │                           checkAnswer, checkOffset, checkGrouped, checkFile, checkAbsent; findTarget and
│   │                           rangeOf (element paths through items, the bytes of a part), sameValue
│   ├── validate/             → validateMission (mission.yaml), readCheck, readLab, inLab, validateChapters,
│   │                           validateSkills, validateConcepts, validateFieldGuide
│   ├── content/              → createGameContent: ids, chapters, skills, concepts, cards and the Field Guide
│   │                           checked together
│   ├── codex/                → codexView, collectCodex, glossaryOf: cards hidden, seen or filed
│   ├── field-guide/          → fieldGuideView
│   ├── concepts/             → conceptChain: taught before used, taught once, foundations used again
│   ├── skills/               → unlockedSkills, isMissionOpen, skillCycles
│   ├── hints/                → revealedHints, nextHint, hintsUsed
│   ├── progress/             → missionStatus, missionList, startMission, recordAttempt, replayMission, debrief…
│   └── saves/                → readSaveFile, importSave, exportSave, migrations
├── test/                     → example mission, labs and chapters, a mission with every wire check, verdicts,
│                               excerpts of go-dicom's real readings of the fixtures, fake clock, memory
│                               storage, installTestGame (not exported)
└── index.ts                  → configureGame, setupGameListeners, cleanupGameListeners
```

## Key Features

- **A pure engine:** no mission is known by id. Content is validated file by file
  (`validateMission`, `validateChapters`, `validateSkills`…) and bundled by
  `createGameContent({ chapters, missions })`; every problem comes back with the path of its field.
- **Judged by outcome:** a mission's `check:` blocks name outcomes and nothing else. File checks
  (`selected`, `answer`, `offset`, `grouped`, `file`, `absent`) read the lab's disk through go-dicom.
  Wire checks (`association`, `rejected-context`, `status`, `received`, `subops`, `echo`) read the
  event stream and the servers' state. No check can see which command was typed.
- **Checks by shape, then against the lab:** `readCheck` validates each kind's fields (tags as
  `(0002,0010)`, paths into sequences as `(0008,1032)[0](0008,0100)` with `[0]` alone for the item,
  `part` of an element, the Wire inspector's `message` and `set`, `grouped`'s `into` and `by`,
  attributes `sameAs` another file's, UIDs as PS3.5 writes them, 16-bit statuses, paths under
  `/lab/`). The mission then checks them against its lab: every file a check reads is one
  `lab.files` copies, under a folder it copies, or under an AE's `/lab/<ae>/received/`; every AE a
  check names is a lab AE; a wire check needs a link, and `echo` a link between its two AEs.
  Whether an element is in a file is for the file to say.
- **File checks judged from go-dicom's reading:** `judgeMission(mission, actions, readings)` takes
  what the player did (`PlayerActions`: the range marked in the File inspector, each answer box,
  each predicted offset) and go-dicom's `show --json` readings of the lab (`LabReadings`, read by
  `@dicomfall/missions` as `readingRequestOf(mission)` asks), and returns a verdict per objective.
  The engine never parses DICOM: every offset, value and transfer syntax is go-dicom's.
  - `selected`: the marked range equals, byte for byte and in the named file, go-dicom's range
    for the region (`preamble`, `prefix`, `file-meta-information` → go-dicom's `fileMeta`,
    `data-set` → `dataSet`), the element or item (`tagOffset` to `endOffset`), or its `part`:
    `tag` the 4 tag bytes; `vr` from `vrOffset` to `lengthOffset`, so a long-form VR's reserved
    bytes are in it (none under implicit VR, none on an item); `length` the length field;
    `value` its content, stopping before the 8-byte delimiter of an undefined length.
  - `answer`: go-dicom's decoded value, compared value by value (split on `\`), each trimmed of
    spaces and NUL padding; case-blind for VR CS only; as numbers for IS, DS, US, UL, SS, SL, FL,
    FD, SV and UV (`0` matches `00`); exact otherwise, names and UIDs included. An empty box,
    a sequence or binary data never passes.
  - `offset`: the prediction equals go-dicom's `tagOffset`; the spec's own `offset` is kept as
    evidence (`declared`), so a spec that disagrees with go-dicom shows.
  - `grouped`: the set's SOP Instance UIDs, read as the lab started, are all found under `into`,
    at `into/<study>/<file>` (or `into/<study>/<series>/<file>`), and the folders split every
    DICOM file under `into` exactly as their Study (and Series) Instance UIDs do.
  - `file`: the transfer syntax go-dicom read the file with, and each attribute compared as
    `answer` compares; `sameAs` reads the other file's value.
  - `absent`: the file decodes and holds no element at the path.
  - Wire checks, and the Wire inspector's `selected`, come back `not_evaluated`, never passed.
- **Verdicts with evidence:** each `ObjectiveVerdict` holds a `CheckResult`: its `kind`, `passed`,
  a `failure` from `CHECK_FAILURES` (null exactly when passed) and what it read (go-dicom's range
  and the marked one, go-dicom's value and the given one, the files found under a folder…).
  `mergeVerdicts` keeps an objective met once met; an unmet one takes the latest reason.
- **A lab in every mission:** `readLab` reads the AEs (kebab-case names, AE titles as VR AE allows
  them, IPv4 addresses with a prefix length for linked AEs only, go-dicom `start` commands), the
  links between known AEs on one network, the fixtures copied to `/lab/` (a folder to a folder,
  no two overlapping) and the AE the console opens in.
- **Stages and labels:** a chapter with a `label` (`Bridge`) is called by it and left out of the
  stage numbers, so the stages after it keep theirs. Each chapter carries its `heading` (`Stage 2`
  or `Bridge`) and its `numberPrefix`, and `numberOf` gives `2.3` or `B.1`.
- **Verdicts from outside:** `recordAttempt(verdict)` keeps a verdict judged elsewhere as one more
  attempt and completes the mission the first time one passes. The debrief keeps the verdict it was
  shown with.
- **Opens by skill:** a mission opens once the missions completed so far have earned every skill it
  needs, as `skills.yaml` lays out the tree.
- **Never lose progress:** every change autosaves before its flow resolves; writes are atomic
  (`.next`, then swap, `.prev` kept); a save that can't be read or is from a newer game is never
  overwritten; with no storage the game plays in memory and `exportSave()` is the way out. Saves
  start at version 1, with the migration mechanism ready for the next.
- **Free retries, staged hints:** attempts and hints used are recorded and never held against the
  player. A mission's three hints go from where to look to the exact spot, as text: a hint with a
  `command` does not validate.
- **Flows without React:** `createMissionActions()`, `createSaveActions()` and `revealHint()` are plain
  functions; the hooks only memoize them.

## Dependencies

- `@dicomfall/core`: event bus, service responses, storage adapter, `ObjectReader`
- go-dicom's readings come in as `FileReading`, the part of `@dicomfall/machine`'s `ShowReading`
  the checks read; `@dicomfall/missions` checks that one fits the other
- `zustand`: the progress store
- `react` (peer): only for the hooks
