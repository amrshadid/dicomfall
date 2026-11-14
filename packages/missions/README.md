# @dicomfall/missions

The game's content and its loader: the stages in play order with their Codex title pages, the
skill tree, the concepts, the Field Guide and every mission with its story. The loader reads
`content/` at build time and hands `@dicomfall/game` one checked `LoadedContent`, or every problem
with its file and field.

> **Note:** this package holds content and logic only. The app uses `/types` and `/utils`
> (`appContent()`, then `configureGame({ content: loaded.value.game })`); the screens live in
> `apps/web/src/features/`.

> **Golden runs arrive with the Machine.** Recording a mission's `solution.yaml` on the real image,
> the flow that runs a mission against the lab, and judging its checks live all need
> `@dicomfall/machine`, which does not exist yet.

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
└── content-report.ts         → pnpm content:report: every mission against the budgets, and the chain of concepts
src/
├── types/definitions/
│   ├── content.ts            → ContentFiles, LoadedContent, the content file names
│   ├── story.ts              → Story, StoryBlock (line, code, pause, predict), StoryStep, StoryProblem
│   └── lint.ts               → MissionLint, StepWords, CardWords, VocabularyRule, BannedUse
├── utils/
│   ├── loader/               → loadContent (files → LoadedContent or every problem), appContent (the
│   │                           repository's content, checked once), readYaml, CONTENT_FILES (Vite's glob),
│   │                           readContentDir (the same files from disk, for Node; not in the barrel)
│   ├── story/                → parseStory, storyProblems, storySteps, slugify, sectionOf
│   └── lint/                 → lintMission, countWords, countAsides, strayWords; the budgets, the banned
│                               phrases, the vocabulary and ENFORCED_MISSIONS
├── test/                     → a valid content folder with two missions (fixture-content/), FIXTURE_FILES,
│                               the content budget and concept chain tests (not exported)
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
- `@dicomfall/game`: the content schemas, `createGameContent`, `conceptChain`
- `yaml`: parses the content files
