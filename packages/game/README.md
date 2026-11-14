# @dicomfall/game

The game's rules, with no mission built in: mission definitions and their schema, the `check:`
kinds a mission declares, staged hints, the Codex and the Field Guide, the skill tree, and the
player's progress saved in the browser. The missions themselves will come from
`@dicomfall/missions`; judging a check against the lab is not here yet.

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
│                               fake clock, memory storage, installTestGame (not exported)
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
  Whether an element is in a file is for the file to say, and evaluating a check is not in this
  package.
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
- `zustand`: the progress store
- `react` (peer): only for the hooks
