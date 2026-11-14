# @dicomfall/missions

The game's content and its loader: the stages in play order with their Codex title pages, the
skill tree, the concepts, the Field Guide and every mission with its story. The loader reads
`content/` at build time and hands `@dicomfall/game` one checked `LoadedContent`, or every problem
with its file and field.

> **Note:** this package holds content and logic only. The app uses `/types` and `/utils`
> (`appContent()`, then `configureGame({ content: loaded.value.game })`); the screens live in
> `apps/web/src/features/`.

## Golden runs and live judging

`pnpm --filter @dicomfall/missions vm:golden [mission-id …]` (`scripts/golden-runs.ts`, after
`pnpm vm:image`) boots the image in Node and plays every run of each mission's `solution.yaml`
on its own clean lab: `shell` lines typed at the AE's console as the recorder types them (each
line's exit status read after it; non-zero fails the run unless the change says `fails: true`),
`select`, `answer` and `predict` as the player's actions. It judges the mission's checks with
go-dicom's readings taken on the Machine, as live play does: once the lab has settled, then after
each change, merged so a met objective stays met. It prints a table and exits 1 when a run is not
judged as its solution says, when the lab as it starts meets an objective, or when a line failed.
A run judged as its solution says is written to `src/test/runs/<mission-id>/<run-id>.json` (its
steps: each change, the player's actions after it and the readings judged against), with go-dicom's
readings once per mission in `readings.json`; `src/test/golden-runs.test.ts` judges them again
without a VM. Each mission's log, with what every line printed:
`node_modules/.cache/dicomfall-golden/<mission-id>.log`.

The app judges live with `createMissionJudge(mission, reader)`: `start()` once the lab is built,
then `judge(actions, reread)` after each finished command (`reread: true`, since a command may
change the files) and after each selection or answer (`false`). `createLiveJudge` collapses quick
requests into one judging at a time. The `reader` is the Machine: `readShow` and `run`, which
`useMachineControls()` gives.

## Structure

```
content/
├── chapters.yaml             → the seven stages in play order, their title pages, and their regions once
│                               they have missions (the first draft's regions are noted under each stage)
├── skills.yaml               → the skill tree: each skill, the region that earns it, the skills it builds on
├── concepts.yaml             → every concept a mission may teach, name or use
├── field-guide.yaml          → the Codex page of commands
└── <n>-<stage>/<nn>-<mission>/
    ├── mission.yaml          → the lab, objectives and checks, three hints, chips, Codex cards, concepts, skills
    └── story.md              → Scene · See it · Build it · Watch it · Debrief · Real world
scripts/
├── content-report.ts         → pnpm content:report: every mission against the budgets, and the chain of concepts
├── record.ts                 → pnpm vm:record: fills each story's recorded blocks from the Machine
└── golden-runs.ts            → vm:golden: plays and judges every solution.yaml run on the Machine
src/
├── types/definitions/
│   ├── content.ts            → ContentFiles, LoadedContent, the content file names
│   ├── story.ts              → Story, StoryBlock (line, code, pause, predict), StoryStep, StoryProblem
│   └── lint.ts               → MissionLint, StepWords, CardWords, VocabularyRule, BannedUse
├── utils/
│   ├── loader/               → loadContent (files → LoadedContent or every problem), appContent (the
│   │                           repository's content, checked once), readYaml, CONTENT_FILES (Vite's glob),
│   │                           readContentDir (the same files from disk, for Node; not in the barrel)
│   ├── run/                  → validateSolution (solution.yaml), applyChange, readLab and readStart
│   │                           (go-dicom's readings a mission's checks ask for), createMissionJudge,
│   │                           createLiveJudge, recordReadings / rejudgeRun (recorded runs), and
│   │                           createConsoleDriver (the recorder's typing, for vm:golden; not in the barrel)
│   ├── story/                → parseStory, storyProblems, storySteps, slugify, sectionOf
│   └── lint/                 → lintMission, countWords, countAsides, strayWords; the budgets, the banned
│                               phrases, the vocabulary and ENFORCED_MISSIONS
├── test/                     → a valid content folder with two missions (fixture-content/), FIXTURE_FILES,
│                               the content budget and concept chain tests, the recorded golden runs
│                               (runs/) and the test that judges them again (not exported)
└── index.ts                  → exports the types and utils
```

## Key Features

- **Every problem at once:** `loadContent` parses each YAML file, validates it with `game`'s
  schemas (`validateChapters`, `validateMission`, `validateSkills`…) and bundles it with
  `createGameContent`. A broken file shows as a list of `<file>: <field>: <problem>` lines, never
  a crash, and invalid content never reaches the game.
- **Folders say what is inside:** a mission lives in `<n>-<stage>/<nn>-<mission>/`, numbered in
  play order; the stage and mission ids after the numbers must match the YAML, and ids never
  change when folders are renumbered.
- **A story beside every mission:** `story.md` is read into paced beats: spoken lines, narration,
  the Machine's output as code, `---` pauses, and Predict questions with one `[x]` answer. Every
  section `mission.yaml` points at must be there, and the title must match.
- **Bundled, offline:** Vite inlines every content file at build time, so the game needs no
  server. `solution.yaml` is never globbed, so the golden runs stay out of the bundle.
- **Budgets checked:** `pnpm content:report` measures each mission against the story budgets
  (500–650 words in all; Scene 80, See it 200, Build it 150, Watch it 120, Debrief 50), Codex cards
  (25 / 80 words), no parenthetical asides, at most three concepts taught, the banned phrases and
  the vocabulary, then walks the chain of concepts. Missions in `ENFORCED_MISSIONS` fail the tests
  and the report; the others only warn.
- **A skeleton for now:** `content/` holds the seven stages with draft title pages and empty
  skills, concepts and Field Guide. It loads with no problems; missions are written later against
  real runs.

## Dependencies

- `@dicomfall/core`: `Validated` results
- `@dicomfall/game`: the content schemas, `createGameContent`, `conceptChain`, `judgeMission`
- `@dicomfall/machine`: the VM session, `readMachineShow`, and the lab's network for a mission
- `yaml`: parses the content files
