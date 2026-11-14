# DICOMFall: missions

How a mission is built and checked. Propose a mission with the **Mission proposal** issue
before writing one. [GAME.md](GAME.md) holds the vocabulary, and [`missions/`](missions/)
holds the spec of every mission and the [concept list](missions/concepts.md).

## Rules

- **Follow the mission loop:** Scene → See it → Build it → Watch it → Debrief → Real world.
  Watch it may open with a **Predict** beat: the player commits to what the bytes or the
  wire will show, then the Machine shows it. Nothing is scored.
- **One new idea per mission**, at most three concepts taught, 10–20 minutes. Earlier ideas
  may be reused, never assumed untaught. Players start knowing nothing: every term is
  explained the first time it appears, next to the evidence on screen, and every analogy
  says where it stops being true.
- **Show, then explain.** One idea per step; the depth goes in the Codex.
- **Judged by outcome, live:** the bytes found, the value read, the offset predicted, the
  files sorted, the UID received, the status returned. Never by which command was typed.
  Objectives tick by themselves after each command and each selection, and stay met.
- **No timers on the player**, free retries. Exactly three hints: a nudge, the idea, then
  the spot. **No hint gives a command.**
- **True to the Machine.** Every value, offset and piece of output in a mission's text is
  copied from a real run, never typed, and each mission is fact-checked by someone other
  than its author.
- **True to the standard.** Every DICOM fact cites the section of the standard it comes from
  (PS3.10 §7.1, PS3.5 §7.1.2). Link to sections; quote only short names and field labels;
  never copy whole tables or figures (the standard is © NEMA).
- **One journey.** A mission names what came before it, and its debrief hands off to the
  next one. The player follows one synthetic CT instance the whole way.
- **Take it home.** The Real world section gives the go-dicom commands to repeat the
  exercise on the player's own machine.

## Files

```
packages/missions/content/
  chapters.yaml       stages in play order, each with its Codex title page and its regions
  skills.yaml         the skill tree: what the player can do after each mission
  concepts.yaml       every concept a mission may teach, name or use
  field-guide.yaml    the Codex's page of commands
  1-the-first-file/03-128-empty-bytes/
    mission.yaml      the lab (AEs, links, files), objectives and their checks, three hints,
                      chips, Codex cards, teaches/names/uses, the skills it earns and needs,
                      its minutes
    story.md          Scene, See it, Build it, Watch it, Debrief, Real world
    solution.yaml     the golden runs: what a player might do, and whether it must pass
```

Folders are numbered in play order. Ids inside the YAML never change when folders are
renumbered, and carry no number (`128-empty-bytes`, not `1-3-…`). Mission files carry a
`version:` field. The bridge sits between stage 3 and stage 4 in play order; its folder is
`4-bridge`, and the map and the Codex call it **Bridge**, not stage 4.

### `chapters.yaml`

One entry per stage, in play order.

| Field       | Holds                                                                        |
| ----------- | ---------------------------------------------------------------------------- |
| `id`        | kebab-case, unique: `the-first-file`, `bridge`                               |
| `stage`     | its place in play order, from 1                                              |
| `title`     | `The First File`                                                             |
| `summary`   | one sentence for the map                                                     |
| `story`     | the stage's story in a few lines, for its Codex title page                   |
| `guide`     | the character who guides it, from [GAME.md](GAME.md#guides)                  |
| `standsFor` | the part of DICOM it stands for: `Part 10, the file format`                  |
| `outcomes`  | the "You can now…" lines, shown once every mission of the stage is completed |
| `regions`   | its missions grouped in play order (below)                                   |

**Regions.** A stage's missions are grouped in regions, as Kernelfall's acts and Peerfall's
regions are: each has its own heading on the Archive Map, its own progress and its own line
of stops. They are a `regions:` list in `chapters.yaml`, not folders. A region has an `id`
(unique across the game), a `name`, a `caption` (what its missions cover), a `guide`, a
`source` (where it lives in go-dicom's source tree and in the standard) and its `missions` by
id, in play order. Every mission of a stage is in exactly one of its regions. A stage's last
mission is its **capstone**: it asks for the whole task in one line.

```yaml
regions:
  - id: the-four-regions
    name: The four regions
    caption: the preamble, the DICM prefix, the File Meta Information and the Data Set
    guide: The Preamble
    source: filereader/, PS3.10 §7
    missions: [128-empty-bytes, the-envelope]
```

### Skills and prerequisites

As in Kernelfall and Peerfall, missions open by skill, not by mission. `skills.yaml` lists
each skill once: an `id`, a `title` in plain words for a beginner, the `region` whose mission
earns it, and the skills it builds on (`prerequisites`). A mission lists the skills it earns
(`skills:`, one, occasionally two) and the skills it needs (`prerequisites:`); it opens once
the missions completed so far have earned every one. The loader reports a skill id that is
not in `skills.yaml`, a prerequisite cycle, a skill no mission earns or two missions earn,
and a skill a mission needs that only a later mission earns. The map's Skills view names each
stop by the first skill its mission earns.

```yaml
# skills.yaml
skills:
  - id: find-the-file-meta-information
    title: Find where a DICOM file describes itself, and where the object begins
    region: the-four-regions
    prerequisites: [find-the-preamble-and-prefix]
# mission.yaml
skills: [find-the-file-meta-information]
prerequisites: [find-the-preamble-and-prefix]
minutes: 15 # about how long a new player takes; the map's Time row
```

### `mission.yaml`, field by field

| Field           | Holds                                                                                                         |
| --------------- | ------------------------------------------------------------------------------------------------------------- |
| `id`            | kebab-case, unique, never changed                                                                             |
| `version`       | goes up when a change makes earlier play-throughs incomparable; record the golden runs again after it changes |
| `title`         | `128 Empty Bytes`                                                                                             |
| `summary`       | one or two sentences for the map                                                                              |
| `minutes`       | about how long a new player takes, 10–20                                                                      |
| `chapter`       | the stage's id in `chapters.yaml`                                                                             |
| `objective`     | the whole mission in one sentence                                                                             |
| `skills`        | the skills it earns                                                                                           |
| `prerequisites` | the skills it needs                                                                                           |
| `teaches`       | concepts it introduces, at most three, from `concepts.yaml`                                                   |
| `names`         | concepts it only names; a later mission teaches them                                                          |
| `uses`          | concepts an earlier mission taught that it relies on                                                          |
| `lab`           | the AEs, links and files the mission starts from (below)                                                      |
| `objectives`    | each with an `id`, a `text` and one `check:`, in the order the player meets them                              |
| `hints`         | exactly three: nudge, idea, spot                                                                              |
| `chips`         | commands the player can click, each with what it does                                                         |
| `codex`         | the cards it adds                                                                                             |
| `story`         | the sections of `story.md` it uses: `scene`, `seeIt`, `buildIt`, `watchIt`, `debrief`, `realWorld`            |

## The lab

The Machine is one Linux computer in the browser. Every **application entity** (AE) the
player meets is a network namespace in it, with its own address and its own go-dicom
processes, joined to the others by veth pairs. This is Peerfall's router model with routers
replaced by AEs. Where DICOMFall differs from Peerfall:

- **An AE is not a router.** It runs no routing daemon; it runs go-dicom's CLI. Its
  services (`storescp`, `qrscp`, …) are started by the Machine or by the player.
- **The AE's name and its AE title are two things.** The name (`workstation`, `archive`) is
  the namespace and the console's prompt (`workstation:~#`). The AE title (`WORKSTATION`,
  `ARCHIVE`) is DICOM's: up to 16 characters, sent in the association request (PS3.8
  §9.3.2, PS3.5 §6.2, VR AE). The file stages never show AE titles.
- **The disk is shared.** Every namespace sees the same filesystem, so `/lab/` is one folder
  for every AE. A real archive keeps its own disk. Each AE that receives files writes them to
  its own folder, `/lab/<ae>/received/`, and the game says once (Bridge, B.1) that on a real
  network the two folders would be on two computers.
- **The files are synthetic fixtures.** They are generated by `packages/fixtures` with
  go-dicom, checked against pydicom, and described in `packages/fixtures/out/manifest.json`.
  The Machine copies the files a mission names into `/lab/` before the mission starts, so
  every mission starts from the same bytes. No real patient data exists anywhere in the game.
- **The file stages need one AE.** Stages 1 to 3 run on `workstation` alone, with no link.
  The bridge adds `archive`.

```yaml
lab:
  aes:
    - name: workstation # the namespace and the prompt
      title: WORKSTATION # the AE title
      address: 10.0.1.1/24
    - name: archive
      title: ARCHIVE
      address: 10.0.1.2/24
      start: # started by the Machine, in the AE's namespace, before the mission opens
        - go-dicom storescp -aet ARCHIVE -port 11112 -output /lab/archive/received
  links:
    - [workstation, archive]
  files: # fixtures copied into /lab/ before the mission starts
    - { fixture: ct-explicit-le.dcm, to: /lab/ct-explicit-le.dcm }
    - { fixture: series/, to: /lab/series/ }
  console: workstation # the AE the console opens in
```

| Field        | What it does                                                                                                               |
| ------------ | -------------------------------------------------------------------------------------------------------------------------- |
| AE `name`    | the namespace and the prompt; kebab-case                                                                                   |
| AE `title`   | the DICOM AE title, 1–16 characters, upper case by the game's convention                                                   |
| AE `address` | its IPv4 address with prefix length; left out for an AE with no link                                                       |
| AE `start`   | go-dicom commands the Machine runs in that AE before the mission opens; their output goes to the AE's log, not the console |
| `links`      | pairs of AE names joined by a veth pair                                                                                    |
| `files`      | fixtures from `packages/fixtures/out/` and where they land; paths are always under `/lab/`                                 |
| `console`    | the AE the console opens in; the player can switch to another AE from the Lightbox                                         |

A lab has **settled** once every `start` process listens on its port, or once nothing has
changed for a few seconds in a lab with none. Faults (a stopped server, a wrong AE title, a
refused presentation context, `tc netem` loss) arrive with the network stages and are
specified there.

## The story

`story.md` holds the mission's title, a `**Question:**` line, and its sections:
`## Scene`, `## See it`, `## Build it`, `## Watch it`, `## Debrief`, `## Real world`.
A guide speaks in a quote: `> **The Preamble:** Type \`go-dicom show /lab/ct-explicit-le.dcm\`.`
The Guide shows a step up to the next pause and the rest once the player has run a command,
made the selection the step asks for, or pressed **Continue**, so a result is on screen
before it is explained.

| Section    | What it does                                                                                     |
| ---------- | ------------------------------------------------------------------------------------------------ |
| Scene      | the guide sets up the problem in under a minute                                                  |
| See it     | the player looks with real commands and the inspector, and the guide names what they see         |
| Build it   | the player does what every objective needs, with guidance: finds, predicts, sorts, sends         |
| Watch it   | the result, shown: often a Predict beat first, then the Machine's answer                         |
| Debrief    | what was learned, in a few lines, and the hand-off to the next mission                           |
| Real world | the same go-dicom commands on the player's own machine, with real file names in place of `/lab/` |

### Pacing

- A line holding only `---` is a pause. Put one after every line that asks the player to do
  something: a command, a selection in the inspector, an answer.
- **One command per pause.** Each command or selection the player finishes releases the next
  pause, so a line that asks for two shows the second one's result after the first. Ask for
  one, pause, then ask for the next. A capstone, which asks for a whole task the player has
  already learned, may give it in one line, if what follows the pause reads true whenever it
  appears ("Once the archive has it…").
- **Build it asks for everything an objective needs.** Build it gives way to Watch it only
  once every objective is met, so a step asked for in Watch it would never be reached. Watch
  it shows what the finished work means: the same bytes in another file, the UID in another
  place, a Predict about the result.
- A question followed by a quoted list with one `[x]` is a Predict beat. The Guide waits for
  an answer, then marks the player's call beside what really happens.
- A code block is the Machine's own output, copied from a real run.

The loader reports a broken story with its file and line: a missing title or question, text
before the first section, a `###` heading, a section twice, an unclosed code block, more than
one `[x]`, or a section `mission.yaml` points at that the story lacks.

### Budgets

`pnpm content:report` (part of `pnpm verify` and CI) measures every mission: words per
section and per Codex card, concepts taught, banned phrases (the game's own internals and
hedges) and words used outside the meaning [GAME.md](GAME.md) gives them. Inline code and
code blocks are never counted or flagged. A test checks the concepts in play order: nothing
is used before it is taught.

| Unit                 | Budget      |
| -------------------- | ----------- |
| `teaches`            | ≤ 3         |
| Story (all sections) | 500–650     |
| Scene                | ≤ 80        |
| See it               | ≤ 200       |
| Build it             | ≤ 150       |
| Watch it             | ≤ 120       |
| Debrief              | ≤ 50        |
| Codex Simple / Deep  | ≤ 25 / ≤ 80 |
| Parenthetical asides | 0           |

A mission over budget is a warning; once rewritten it joins `ENFORCED_MISSIONS`, and over
budget then fails the tests.

## Concepts

`concepts.yaml` lists every concept once: an `id`, the `term` as the player meets it, its
`part` and the Codex card that explains it. The parts, in curriculum order: `foundations`,
`file-format`, `encoding`, `information-model`, `pixel-data`, `association`, `dimse`,
`query-retrieve`, `interoperability`.

A mission's concepts come in three lists:

- **`teaches`**, at most three: introduced here, explained next to the evidence, and given a
  Codex card.
- **`names`**: mentioned with one plain line, because the evidence on screen shows it, and
  taught by a later mission. A named concept is never relied on.
- **`uses`**: taught by an earlier mission and relied on here.

The concept test reports a concept used before it is taught, a concept taught twice, and a
concept of the first two stages taught or named and never used again.

## Hints, chips and the Codex

```yaml
hints: # exactly three: a nudge, the idea, the spot; none gives a command
  - text: Open the File inspector and look at the first rows of the hex pane. What do the first 128 bytes hold?
  - text: A DICOM file starts with a preamble of 128 bytes, then four letters that say "this is DICOM".
  - text: The four letters start at offset 128. Look for them in the text column on the right.
chips: # commands the player can click, each with what it does
  - { command: go-dicom show /lab/ct-explicit-le.dcm, explain: "print every element of the file, one per line" }
codex: # cards this mission adds to the Codex
  - id: preamble
    term: the preamble
    simple: The first 128 bytes of a DICOM file. DICOM gives them no meaning; unused, they are all zero.
    deep: …
    deepens: part-10-file # an earlier card this one goes deeper into
    sources: [filereader/]
    docs: https://dicom.nema.org/medical/dicom/current/output/chtml/part10/chapter_7.html
    tryIt: go-dicom show ct.dcm
teaches: [part-10-file, preamble, dicm-prefix] # at most three, from concepts.yaml
names: [file-meta-information] # named here, taught later
uses: [byte-and-hex, offset] # taught earlier, relied on here
```

**Hints.** Exactly three, revealed in order, free.

1. **A nudge:** where to look. A view, a command already met, a column of the output.
2. **The idea:** the concept that solves it, in one or two plain sentences.
3. **The spot:** the exact place: the element, the offset, the region, the folder, the flag.

No hint gives the command or the answer itself. The third hint points so precisely that the
player only has to act, but the acting is theirs. Leave the `command:` field of a hint out.

**Chips.** In stage 1 a chip is a whole line (`go-dicom show /lab/ct-explicit-le.dcm`);
from stage 2 on, a command without its arguments (`go-dicom show`), and the player types the
rest.

**Codex cards.** Every concept a mission teaches becomes a card.

| Field     | Holds                                                                        |
| --------- | ---------------------------------------------------------------------------- |
| `id`      | unique across the game; usually the concept's id                             |
| `term`    | the real term, as the player meets it: `Transfer Syntax UID`, `the preamble` |
| `simple`  | plain words, at most 25                                                      |
| `deep`    | the standard's side and go-dicom's, at most 80 words                         |
| `deepens` | an earlier card this one goes deeper into, earlier in play order             |
| `sources` | paths in go-dicom's source tree: `filereader/`, `network/pdu.go`             |
| `docs`    | a link to the standard's section (below)                                     |
| `tryIt`   | a go-dicom command to try on the player's own machine                        |

A card is shown once its mission starts and filed once the mission is passed. Each stage has
a title page in the Codex. A card not found yet is a blank outline with its mission's number.

**Links to the standard** use the section pages of the current edition:
`https://dicom.nema.org/medical/dicom/current/output/chtml/part05/sect_7.1.2.html`, or a
chapter page with an anchor, `…/chtml/part10/chapter_7.html#sect_7.1`. Write the citation in
the text as `PS3.5 §7.1.2`. The current edition changes over time: the fact-checker opens
every link.

## The Field Guide

The Codex's page of commands. `field-guide.yaml` has one entry per go-dicom command, from the
mission where it is first met: the command, what it does in one line, the options the game
uses, the mission that first uses it, and an example on the player's own machine. A few Linux
commands the missions lean on (`hexdump`, `ls -l`, `cmp`, `mv`) have entries too, marked
`kind: shell`, so a newcomer is never left with a command nobody explained.

```yaml
entries:
  - command: go-dicom show
    kind: go-dicom
    explain: print every element of a file, File Meta Information first, one per line
    options:
      - { flag: "<file>::<tag>", explain: "print one element; the tag is written 0002,0010" }
      - { flag: --top, explain: "leave out the elements inside sequences" }
    firstMission: what-the-file-says
    example: go-dicom show ct.dcm
```

## The Dictionary

A searchable tag lookup (tag, keyword, name, VR, VM), generated at build time from go-dicom's
own dictionary, which follows PS3.6. It opens from any tag in the hex pane or the tree. It is
not a mission's work: missions point at it, and `go-dicom tag-doc` gives the same answers in
the console.

## Checks

Each objective has one `check:`. No check can see which command was typed. Objectives are
judged live: after each command the player finishes, after each selection or answer, and
whenever the lab settles. There are two families, and a mission may use both.

### File checks

They read the lab's disk as root, through go-dicom: the decoded values are go-dicom's,
never a parser of the game's own. Byte ranges come from go-dicom's element offsets (see
[Engine dependencies](#engine-dependencies)).

Element tags are written `(gggg,eeee)`, in upper-case hex, as PS3.5 §7.1 writes them. An
element inside a sequence is written as a path: the sequence's tag, the item's index from 0
in brackets, then the element's tag: `(0008,1032)[0](0008,0100)`.

| Kind       | Fields                                                                             | Passes when                                                                                                                                           |
| ---------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `selected` | `file`; `element` or `region`; optional `part` (wire: `message`, `set`, `element`) | the player has marked in the File inspector exactly the byte range of that element, that part of it, or that Part 10 region                           |
| `answer`   | `file`, `element`                                                                  | a value the player typed or picked matches go-dicom's decoded value of that element                                                                   |
| `offset`   | `file`, `element`, `offset`                                                        | the player's predicted start of the element, in bytes from the start of the file, equals its real start                                               |
| `grouped`  | `files`, `into`, `by`                                                              | every one of `files` sits under `into` in a folder holding only its own study (`by: study`), or in a study folder then a series folder (`by: series`) |
| `file`     | `file`; `transferSyntax` and/or `attributes`                                       | the file decodes, with that Transfer Syntax UID, to those values                                                                                      |
| `absent`   | `file`, `element`                                                                  | the file decodes and no longer holds that element                                                                                                     |

- **`selected`.** `region` is one of `preamble` (bytes 0–127), `prefix` (128–131),
  `file-meta-information` (from offset 132 to the end of group 0002) and `data-set` (from
  there to the end of the file), as PS3.10 §7.1 lays them out. `part` narrows an element to
  `tag`, `vr`, `length` or `value`; for an element whose explicit VR uses the long form, `vr`
  also covers the two reserved bytes, as the inspector draws them. The player marks a range
  by clicking a row of the tree, a band, or by dragging over the hex; the check compares the
  marked range with go-dicom's, byte for byte. The objective is met the moment the right
  range is marked and stays met. In the Wire inspector, `selected` takes `message` (the
  DIMSE message as the inspector labels it, `C-STORE-RQ`), `set` (`command` or `data`) and
  `element` in place of `file`, and compares with the bytes of that message in the event log:
  the Bridge marks (0000,1000) in a Command Set this way.
- **`answer`.** The Guide shows an answer box beside the objective. The player's text is
  compared with go-dicom's decoded value after trimming spaces and the padding byte, and
  case-blind for a code string (VR CS). A number is compared as a number, so `0` and `00`
  match. A value with several values is compared value by value, with `\` between them.
- **`offset`.** `offset` is the expected value, copied from a real run of go-dicom's
  offsets on the fixture, never computed by hand in the spec.
- **`grouped`.** The player sorts real files with `mkdir` and `mv` (or `cp`) in the console.
  Folder names are free: the check reads each file's Study Instance UID (0020,000D) and Series
  Instance UID (0020,000E) through go-dicom, finds each of `files` by its SOP Instance UID
  under `into`, and passes when the folders split them exactly as their UIDs do.
- **`file`.** `attributes` maps tags to values as go-dicom prints them. A value may be
  `{ sameAs: { file, element } }`, to say "the same as that element of that file" rather than
  copying a UID into the spec.
- **`absent`.** For de-identification. No mission of 0.1.0 uses it.

```yaml
objectives:
  - id: preamble-found
    text: Mark the preamble in the File inspector.
    check: { kind: selected, file: /lab/ct-explicit-le.dcm, region: preamble }
  - id: vr-found
    text: Mark the two letters that give Modality its VR.
    check: { kind: selected, file: /lab/ct-explicit-le.dcm, element: "(0008,0060)", part: vr }
  - id: syntax-read
    text: Give the Transfer Syntax UID of the file.
    check: { kind: answer, file: /lab/ct-explicit-le.dcm, element: "(0002,0010)" }
  - id: next-predicted
    text: Predict where Media Storage SOP Class UID starts.
    check: { kind: offset, file: /lab/ct-explicit-le.dcm, element: "(0002,0002)", offset: 158 }
  - id: sorted-by-study
    text: Put the files of each study in a folder of its own under /lab/sorted.
    check:
      kind: grouped
      files: [/lab/series/a.dcm, /lab/series/b.dcm] # every file of the set
      into: /lab/sorted
      by: study
  - id: stored-explicit
    text: The archive's copy is a file in Explicit VR Little Endian, holding our instance.
    check:
      kind: file
      file: /lab/archive/received/<sop-instance-uid>.dcm # the UID, copied from the manifest
      transferSyntax: 1.2.840.10008.1.2.1
      attributes:
        "(0008,0018)": { sameAs: { file: /lab/ct-implicit-le.dcm, element: "(0008,0018)" } }
  - id: name-gone
    text: The shared copy no longer holds Patient's Name.
    check: { kind: absent, file: /lab/shared.dcm, element: "(0010,0010)" }
```

### Wire checks

They read the event stream (go-dicom's event log and tcpdump on the links, each event stamped
with the Machine's time) and the servers' state.

| Kind               | Fields                             | Passes when                                                                                                          |
| ------------------ | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `association`      | `abstractSyntax`, `transferSyntax` | an association was accepted with a presentation context for that abstract syntax, accepted with that transfer syntax |
| `rejected-context` | `abstractSyntax`, `result`         | a presentation context for that abstract syntax was refused with that result                                         |
| `status`           | `status`                           | a DIMSE response carried that status                                                                                 |
| `received`         | `ae`, `sopInstanceUid`             | that AE's store holds an instance with that SOP Instance UID                                                         |
| `subops`           | `operation`, `completed`           | a C-GET or C-MOVE finished with that many sub-operations completed and none failed                                   |
| `echo`             | `from`, `to`                       | the AE `to` answered a C-ECHO from the AE `from` with status `0x0000`                                                |

- **`rejected-context`.** `result` is the A-ASSOCIATE-AC's result for the context, by name
  (PS3.8 §9.3.3.2): `user-rejection` (1), `no-reason` (2), `abstract-syntax-not-supported`
  (3), `transfer-syntaxes-not-supported` (4).
- **`status`.** A 16-bit value written in hex: `0x0000` success, `0xA801` move destination
  unknown, `0xC000` an error the receiver could not process. The meaning of each value is per
  service, in PS3.4; the spec cites the table.
- **`received`.** The check reads the AE's receive folder through go-dicom and matches SOP
  Instance UID (0008,0018), not file names.
- **`subops`.** `operation` is `C-GET` or `C-MOVE`.

```yaml
objectives:
  - id: agreed-implicit
    text: Send the instance so that the archive accepts it in Implicit VR Little Endian.
    check:
      kind: association
      abstractSyntax: 1.2.840.10008.5.1.4.1.1.2 # CT Image Storage
      transferSyntax: 1.2.840.10008.1.2 # Implicit VR Little Endian
  - id: context-refused
    text: See the archive refuse the compressed offer.
    check:
      { kind: rejected-context, abstractSyntax: 1.2.840.10008.5.1.4.1.1.2, result: transfer-syntaxes-not-supported }
  - id: move-refused
    text: Find the status the archive answered the move with.
    check: { kind: status, status: 0xA801 }
  - id: archive-has-it
    text: The archive holds our CT instance.
    check: { kind: received, ae: archive, sopInstanceUid: <sop-instance-uid> } # copied from the manifest
  - id: study-retrieved
    text: Retrieve every instance of the study with C-GET.
    check: { kind: subops, operation: C-GET, completed: 3 }
  - id: archive-answers
    text: The archive answers C-ECHO from the workstation.
    check: { kind: echo, from: workstation, to: archive }
```

An objective once met stays met for the rest of the play-through, until Start over. The
attempt is recorded, and the mission completed, the first time every objective is met.

### Engine dependencies

Two check families wait on go-dicom releases, which DICOMFall uses as any user does:

- `selected` and `offset` need each element's byte offsets from `go-dicom show`
  (go-dicom #259). Until a release has them, no mission that uses those checks can be
  recorded.
- Every wire check, and the Wire inspector, need go-dicom's event log (go-dicom #260).
  tcpdump on the links gives an independent copy of the PDUs.

## Golden runs

Every mission has scripted runs on the real image that its checks must judge correctly.
`solution.yaml` lists them, and must hold at least: the mission as it starts (no changes,
not passed), the reference solution (passed), and one plausible wrong or half-done solution
(not passed).

```yaml
runs:
  - id: start
    passes: false
    changes: []
  - id: prefix-only # half done: the four letters, not the 128 bytes before them
    passes: false
    changes:
      - select: { file: /lab/ct-explicit-le.dcm, from: 128, to: 132 }
  - id: both-regions
    passes: true
    changes:
      - ae: workstation
        shell: [go-dicom show /lab/ct-explicit-le.dcm] # typed at that AE's console
      - select: { file: /lab/ct-explicit-le.dcm, from: 0, to: 128 } # a range, end excluded
      - select: { file: /lab/ct-explicit-le.dcm, from: 128, to: 132 }
```

A change is one of:

| Change    | What it does                                                                |
| --------- | --------------------------------------------------------------------------- |
| `shell`   | lines typed at an AE's console, one after another, in its namespace         |
| `select`  | a byte range marked in the File inspector, `from` inclusive, `to` exclusive |
| `answer`  | a value given in an objective's answer box: `{ objective, value }`          |
| `predict` | `{ offset }` given in an `offset` objective's box: `{ objective, offset }`  |

A `shell` line that exits non-zero fails the recording, unless the change is marked
`fails: true`: for a run whose point is that go-dicom refuses something. The recorder logs
what go-dicom printed and plays on.

```sh
pnpm --filter @dicomfall/missions vm:golden                # every mission
pnpm --filter @dicomfall/missions vm:golden <mission-id>   # only that mission
```

The recorder boots the image in Node, sets up the lab, plays each run, and judges it as live
play does. A run judged as `solution.yaml` says is written to
`packages/missions/src/test/runs/<mission-id>/<run-id>.json`. The recorded runs are judged
again without a VM by `pnpm --filter @dicomfall/missions test`, one test file per mission. A
change that flips a verdict fails there.

**No objective is met at the start.** Objectives are judged live, and one met by the lab as
it starts would stay met all game, so every mission's `start` run meets none.

Content that does not load stops the whole game, so a mission goes into `content/` only once
it is complete and its runs are judged as its solution says. Until then keep it in a folder
of its own, laid out like `content/`, and record it from there with
`DICOMFALL_CONTENT_DIR=<folder> DICOMFALL_RUNS_DIR=<folder>`.

## Accuracy

- **Output is copied, never typed.** Every code block, value, offset, length and UID in a
  story, a hint or a card comes from a recorded run on the Machine, with the fixture of that
  run. When a fixture is generated again, its missions are recorded again and their text is
  checked against the new run.
- **The fixtures are the source of values.** A spec names the element; the value comes from
  `manifest.json` and the run. A spec never invents a UID, a name or an offset.
- **Cross-checks.** Every fixture's decoded tree is compared with pydicom. The first mission
  of each DIMSE kind runs once against pynetdicom in `lab/`.
- **Cite the standard.** Each fact names its part and section. A fact the author could not
  check against the standard or the Machine is marked `[verify]` in the spec, and the mark
  is removed only by the fact-checker.
- **Say where the Machine differs.** One shared disk, AEs as namespaces, synthetic files:
  the game says so the first time it matters.

## Review

Every mission is reviewed twice before it ships, by people who did not write it:

1. **Fact-check on the Machine.** The reviewer runs every command of the story on the image,
   compares each output with the text, opens every link to the standard and checks each
   claim against it, and confirms the golden runs are judged as `solution.yaml` says.
2. **Play-through in the app.** The reviewer plays the mission end to end, following only the
   Guide, as a newcomer would: every objective reachable, every term explained before it is
   relied on, each hint helpful at its tier, the budgets met.

A mission ships when both reviews pass. An Inaccuracy issue reopens it.
