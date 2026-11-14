# Stage 1: The First File

Mission specs for stage 1. Read [GAME.md](../GAME.md) for the story, the guides and the
vocabulary, [MISSIONS.md](../MISSIONS.md) for how a mission is built and checked, and
[concepts.md](concepts.md) for the concept chain.

**Who it's for:** someone who has never opened a DICOM file and may not know what a byte
offset or a hexadecimal number is. Every word is explained the first time it appears, next
to the bytes that show it.

**Guide:** The Preamble. **Stands for:** Part 10, the file format.

The stage is six missions, about **1 hour 35 minutes**. It starts with what a DICOM file
holds, read the easy way, with go-dicom (1.1), then the same file as bytes (1.2). Then the
four regions every Part 10 file has: the preamble and the prefix (1.3), the File Meta
Information and the Data Set (1.4). Then the one element that says how to read the rest, the
Transfer Syntax UID (1.5). The capstone (1.6) maps a second file the player has never opened,
and finds that it reads differently.

| #   | Title                | Id                     | Region              | Time    | The one question                                                          |
| --- | -------------------- | ---------------------- | ------------------- | ------- | ------------------------------------------------------------------------- |
| 1.1 | What the File Says   | `what-the-file-says`   | Open the file       | ~15 min | What does a DICOM file hold, and how do you read it?                      |
| 1.2 | Under the Words      | `under-the-words`      | Open the file       | ~15 min | What does the file look like as bytes, and how do you find a place in it? |
| 1.3 | 128 Empty Bytes      | `128-empty-bytes`      | The four regions    | ~15 min | Where does a DICOM file start, and how does a reader know it is one?      |
| 1.4 | The Envelope         | `the-envelope`         | The four regions    | ~20 min | What does the file say about itself before the object begins?             |
| 1.5 | How to Read the Rest | `how-to-read-the-rest` | The transfer syntax | ~15 min | What does the Transfer Syntax UID tell the reader?                        |
| 1.6 | A Second File        | `a-second-file`        | The transfer syntax | ~15 min | Capstone: can you map a file you have never opened?                       |

**Where it leads:** stage 2, The Elements, opens one element at a time: its tag, its VR, its
length and its value, and why the second file of 1.6 has no VR letters in its Data Set.

## Regions

```yaml
regions:
  - id: open-the-file
    name: Open the file
    caption: what a DICOM file holds, read with go-dicom and as bytes
    guide: The Preamble
    source: cli/show.go, cli/info.go, PS3.10 §7
    missions: [what-the-file-says, under-the-words]
  - id: the-four-regions
    name: The four regions
    caption: the preamble, the DICM prefix, the File Meta Information and the Data Set
    guide: The Preamble
    source: filereader/, PS3.10 §7.1
    missions: [128-empty-bytes, the-envelope]
  - id: the-transfer-syntax
    name: The transfer syntax
    caption: the Transfer Syntax UID, UIDs, and little endian
    guide: The Preamble
    source: filereader/, uid/, PS3.10 §7.1, PS3.5 §7.3, §9, §10
    missions: [how-to-read-the-rest, a-second-file]
```

## The lab of stage 1

One AE, `workstation`, with no link and no running service. The console opens there.

```yaml
lab:
  aes:
    - { name: workstation, title: WORKSTATION }
  links: []
  files: # per mission, from these two
    - { fixture: ct-explicit-le.dcm, to: /lab/ct-explicit-le.dcm }
    - { fixture: ct-implicit-le.dcm, to: /lab/ct-implicit-le.dcm }
  console: workstation
```

Each mission below names only its files.

## Facts stage 1 relies on

From the standard. Each is cited; the Machine's own output is recorded with the golden runs,
never written here.

- A Part 10 file is a 128-byte **File Preamble**, the 4-byte **DICM prefix**, the **File Meta
  Information**, then the **Data Set** (PS3.10 §7.1).
- If the preamble is not used, all 128 bytes are `00` (PS3.10 §7.1). The fixtures leave it
  unused [verify against the fixture].
- The File Meta Information is encoded in Explicit VR Little Endian, whatever the Data Set's
  transfer syntax (PS3.10 §7.1).
- Group 0002 is used only in the File Meta Information, never in a Data Set (PS3.10 §7.1).
- Its Type 1 elements are File Meta Information Group Length (0002,0000), File Meta
  Information Version (0002,0001), Media Storage SOP Class UID (0002,0002), Media Storage SOP
  Instance UID (0002,0003), Transfer Syntax UID (0002,0010) and Implementation Class UID
  (0002,0012) (PS3.10 §7.1).
- (0002,0000) is VR UL, so its element takes 12 bytes in explicit VR: tag 4, VR 2, length 2,
  value 4 (PS3.5 §7.1.2). It starts at offset 132 and ends at 144; its value counts the bytes
  of group 0002 after it. So the Data Set starts at **144 + the group length**.
- Explicit VR Little Endian is `1.2.840.10008.1.2.1`; Implicit VR Little Endian, the default
  transfer syntax, is `1.2.840.10008.1.2` (PS3.5 Annex A.1, A.2, §10.1).
- A UID is numbers joined by `.`, at most 64 characters; UIDs under `1.2.840.10008` are
  defined by DICOM (PS3.5 §9, §9.1).
- Little endian: a number's least significant byte is stored first (PS3.5 §7.3).

**About go-dicom (v1.8.0 source, read, not run):** `show` prints the File Meta Information
first, then the Data Set, one element per line, with columns `Tag`, `VR`, `Length`, `Value`,
and the tag written `0002,0010`. `show <file>::<tag>` prints one element when the tag is
written `0002,0010` or the dictionary name is given; the keyword form (`::TransferSyntaxUID`)
is not matched by that source [verify on the release]. `show` prints no offsets: the File
inspector needs go-dicom #259. `info` prints Patient Name, Patient ID, Study Date, Modality,
Rows and Columns. Whether the image ships `hexdump` (busybox) is [verify in the image].

---

## 1.1 — What the File Says

- **Id:** `what-the-file-says` · **Region:** Open the file · **Guide:** The Preamble ·
  **Time:** ~15 min
- **Question:** What does a DICOM file hold, and how do you read it?
- **The one new idea:** a DICOM file holds one object: a list of elements, each a numbered
  entry with a value, and one of them is the picture.
- **Teaches:** `dicom`, `dicom-file`, `data-element` · **Names:** `tag`, `vr`,
  `transfer-syntax`, `sop-instance-uid`, `pixel-data` · **Uses:** none
- **Skill:** `read-a-dicom-file` ("Read what a DICOM file holds with go-dicom") ·
  **Prerequisites:** none

No bytes yet: the player meets the file through go-dicom's reading of it, and the Lightbox's
picture of it. The fictional patient's name and the modality are the first two things they
read.

### Lab

Files: `/lab/ct-explicit-le.dcm`.

### Objectives

| Id             | Text                                                     | Check                                                                     |
| -------------- | -------------------------------------------------------- | ------------------------------------------------------------------------- |
| `modality`     | Give the kind of scan the file holds, as it says itself. | `{ kind: answer, file: /lab/ct-explicit-le.dcm, element: "(0008,0060)" }` |
| `patient-name` | Give the patient's name the file records.                | `{ kind: answer, file: /lab/ct-explicit-le.dcm, element: "(0010,0010)" }` |

### Beats

- **Scene.** The Preamble introduces itself as the 128 empty bytes at the front of tonight's
  file, and says nobody can send a file they cannot read.
- **See it.** `ls -l /lab`: one file, a size in bytes. `go-dicom info /lab/ct-explicit-le.dcm`:
  the patient, the date, the modality, 64 rows and 64 columns. The Lightbox shows the slice.
  DICOM named: the standard for medical images and the information that goes with them.
- **Build it.** `go-dicom show /lab/ct-explicit-le.dcm`: one element per line. The guide names
  the columns (tag, VR, length, value) and only explains "a numbered entry with a value"; tag
  and VR are named for stage 2. The player finds Modality and Patient's Name and gives them.
- **Watch it.** Predict: "Where is the picture in this list?" — nowhere / **one element, near
  the end, with a long value** / every element. The last line: Pixel Data, its value too long
  to print, the same bytes the Lightbox drew.
- **Debrief.** A DICOM file is one object, and an object is a list of elements. go-dicom read
  them for you. Under the Words reads them without help.
- **Real world.** `go-dicom info <file>`, `go-dicom show <file>`, `go-dicom show <file> --top`.

### Hints

1. **Nudge:** "Run `go-dicom info` on the file and read each line's label."
2. **The idea:** "Each element has a number and a value. The kind of scan is an element
   called Modality; the name is Patient's Name."
3. **The spot:** "Modality is the element numbered 0008,0060; Patient's Name is 0010,0010.
   Read the value at the end of each line."

### Chips

| Command                                 | Explain                                       |
| --------------------------------------- | --------------------------------------------- |
| `ls -l /lab`                            | list the lab's files with their sizes         |
| `go-dicom info /lab/ct-explicit-le.dcm` | print the file's key elements in plain labels |
| `go-dicom show /lab/ct-explicit-le.dcm` | print every element of the file, one per line |

### Codex (chapter: The First File)

- **DICOM** (`dicom`)
- **A DICOM file** (`dicom-file`, deepens: `dicom`)
- **An element** (`data-element`)

### Field Guide

`go-dicom info`, `go-dicom show`; shell: `ls -l`.

### Debrief links

PS3.1 §1 (scope of DICOM) [verify section]; PS3.10 §7 (DICOM File Format); PS3.5 §7.1 (data
elements).

### Golden runs

- `start` (fails); `modality-only` (fails: only Modality given); `both` (passes: `show`, then
  both answers); `from-info` (passes: both answers read from `info`).

---

## 1.2 — Under the Words

- **Id:** `under-the-words` · **Region:** Open the file · **Guide:** The Preamble ·
  **Time:** ~15 min
- **Question:** What does the file look like as bytes, and how do you find a place in it?
- **The one new idea:** a file is a row of numbered bytes, each written as two hex digits;
  text values are readable in them.
- **Teaches:** `byte-and-hex`, `offset`, `text-in-bytes` · **Names:** `preamble`,
  `dicm-prefix` · **Uses:** `dicom-file`, `data-element`
- **Skill:** `find-bytes-in-hex` ("Find a value among a file's bytes") · **Prerequisites:**
  `read-a-dicom-file`

The File inspector opens for the first time. The player marks a whole element by clicking its
row in the tree, and sees the same bytes light up in the hex.

### Lab

Files: `/lab/ct-explicit-le.dcm`.

### Objectives

| Id               | Text                                          | Check                                                                       |
| ---------------- | --------------------------------------------- | --------------------------------------------------------------------------- |
| `name-bytes`     | Mark the bytes of the Patient's Name element. | `{ kind: selected, file: /lab/ct-explicit-le.dcm, element: "(0010,0010)" }` |
| `modality-bytes` | Mark the bytes of the Modality element.       | `{ kind: selected, file: /lab/ct-explicit-le.dcm, element: "(0008,0060)" }` |

### Beats

- **Scene.** The Preamble: go-dicom read the file for you; now read what go-dicom read.
- **See it.** `hexdump -C /lab/ct-explicit-le.dcm | head`: offset column, sixteen bytes, a text
  column. Hex named: two digits, `00` to `FF`. Offset named: counted from 0. The first rows are
  all `00` (named: the preamble, 1.3), then `DICM` in the text column.
- **Build it.** The File inspector: the tree beside the hex. Click Patient's Name in the tree;
  its bytes light up, and the name is readable in the text column. Then Modality: `CT`, two
  bytes, `43 54`.
- **Watch it.** Predict: "The letters C and T are stored as…" — pictures / **one byte each, by
  a code shared by every computer** / two bytes each. ASCII named in one line as the default
  character repertoire (PS3.5 §6.1).
- **Debrief.** Every value is bytes at an offset. Text shows through; numbers don't. 128 Empty
  Bytes starts at offset 0.
- **Real world.** `hexdump -C <file> | head`, `go-dicom show <file>`.

### Hints

1. **Nudge:** "Open the File inspector and find Patient's Name in the tree on the left."
2. **The idea:** "Selecting an element in the tree marks its bytes in the hex. Text values
   show in the text column on the right."
3. **The spot:** "Patient's Name is the row tagged 0010,0010; Modality is 0008,0060. Click
   each row."

### Chips

| Command                                      | Explain                                      |
| -------------------------------------------- | -------------------------------------------- |
| `hexdump -C /lab/ct-explicit-le.dcm \| head` | the file's first bytes: offset, hex and text |
| `go-dicom show /lab/ct-explicit-le.dcm`      | every element of the file, one per line      |

### Codex

- **Bytes and hex** (`byte-and-hex`)
- **An offset** (`offset`)
- **Text in bytes** (`text-in-bytes`, deepens: `byte-and-hex`)

### Field Guide

Shell: `hexdump -C`, `head`.

### Debrief links

PS3.5 §6.1 (character repertoires: the default is ISO 646, the basic G0 set) [verify the exact
wording]; PS3.5 §7.1.

### Golden runs

- `start` (fails); `name-only` (fails); `both-elements` (passes); `value-only` (fails: only the
  value bytes of Patient's Name dragged, not the whole element).

---

## 1.3 — 128 Empty Bytes

- **Id:** `128-empty-bytes` · **Region:** The four regions · **Guide:** The Preamble ·
  **Time:** ~15 min
- **Question:** Where does a DICOM file start, and how does a reader know it is one?
- **The one new idea:** a Part 10 file starts with 128 bytes DICOM gives no meaning, then the
  four letters `DICM`.
- **Teaches:** `part-10-file`, `preamble`, `dicm-prefix` · **Names:** `file-meta-information`,
  `data-set` · **Uses:** `dicom`, `byte-and-hex`, `offset`, `text-in-bytes`, `dicom-file`
- **Skill:** `find-the-preamble-and-prefix` ("Find where a DICOM file starts") ·
  **Prerequisites:** `find-bytes-in-hex`

The Preamble speaks about itself. The bands of the hex pane appear for the first time, the
first two lit.

### Lab

Files: `/lab/ct-explicit-le.dcm`.

### Objectives

| Id         | Text                            | Check                                                                 |
| ---------- | ------------------------------- | --------------------------------------------------------------------- |
| `preamble` | Mark the file's preamble.       | `{ kind: selected, file: /lab/ct-explicit-le.dcm, region: preamble }` |
| `prefix`   | Mark the four letters after it. | `{ kind: selected, file: /lab/ct-explicit-le.dcm, region: prefix }`   |

### Beats

- **Scene.** The Preamble: "I am 128 bytes, and in this file every one of me is zero. I am
  still required."
- **See it.** `hexdump -C /lab/ct-explicit-le.dcm | head -n 10`: eight rows of `00` collapsed
  by hexdump into `*`, then `44 49 43 4d` / `DICM` at offset `0x80`. Offset 0x80 named as 128.
- **Build it.** Drag over offsets 0 to 127 in the hex pane: the preamble band. Then the four
  bytes at 128 to 131: the prefix band.
- **Watch it.** Predict: "Why 128 bytes nobody reads?" — padding for speed / **room for another
  program's own use, so one file can be read by both** / a checksum. PS3.10 §7.1: an
  application profile or implementation may use it; unused, all `00`. Where the analogy of an
  empty envelope flap stops: the reader skips the preamble whatever it holds.
- **Debrief.** A reader skips 128 bytes and checks for `DICM`; then the file describes itself.
  The Envelope reads that description.
- **Real world.** `head -c 132 <file> | hexdump -C`.

### Hints

1. **Nudge:** "Look at the first rows of the hex pane. What do the first bytes hold?"
2. **The idea:** "A DICOM file starts with 128 bytes of preamble, then four letters that say
   this is DICOM."
3. **The spot:** "The preamble is offsets 0 to 127. The four letters are 128 to 131: find them
   in the text column."

### Chips

| Command                                            | Explain                                       |
| -------------------------------------------------- | --------------------------------------------- |
| `hexdump -C /lab/ct-explicit-le.dcm \| head -n 10` | the first bytes; `*` stands for repeated rows |

### Codex

- **The Part 10 file** (`part-10-file`, deepens: `dicom-file`)
- **The preamble** (`preamble`, deepens: `part-10-file`)
- **The DICM prefix** (`dicm-prefix`, deepens: `part-10-file`)

### Field Guide

Shell: `head -c`.

### Debrief links

PS3.10 §7.1 (DICOM File Meta Information: preamble and prefix); PS3.10 §7 (the file format).

### Golden runs

- `start` (fails); `prefix-only` (fails); `one-byte-short` (fails: 0–126 marked); `both`
  (passes).

---

## 1.4 — The Envelope

- **Id:** `the-envelope` · **Region:** The four regions · **Guide:** The Preamble ·
  **Time:** ~20 min
- **Question:** What does the file say about itself before the object begins?
- **The one new idea:** after the prefix, group 0002 describes the file, and its first element
  says how long the group is, so a reader knows where the object begins.
- **Teaches:** `file-meta-information`, `group-length`, `data-set` · **Names:**
  `transfer-syntax`, `media-storage-uids` · **Uses:** `part-10-file`, `dicm-prefix`, `offset`,
  `data-element`
- **Skill:** `find-the-file-meta-information` ("Find where a DICOM file describes itself, and
  where the object begins") · **Prerequisites:** `find-the-preamble-and-prefix`

The arithmetic of the stage: 132, plus the 12 bytes of the group length element, plus its
value. The player predicts the first offset of the Data Set before marking it.

### Lab

Files: `/lab/ct-explicit-le.dcm`.

### Objectives

| Id          | Text                                                          | Check                                                                                                    |
| ----------- | ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `file-meta` | Mark the File Meta Information.                               | `{ kind: selected, file: /lab/ct-explicit-le.dcm, region: file-meta-information }`                       |
| `predict`   | Predict the offset where the Data Set's first element starts. | `{ kind: offset, file: /lab/ct-explicit-le.dcm, element: <first Data Set tag>, offset: <from the run> }` |
| `data-set`  | Mark the Data Set.                                            | `{ kind: selected, file: /lab/ct-explicit-le.dcm, region: data-set }`                                    |

The first Data Set element's tag and its offset come from the fixture's run: likely
(0008,0005) or (0008,0008) [verify against the manifest].

### Beats

- **Scene.** The Preamble: after `DICM`, the file tells a reader about itself, like the label
  on an envelope; where that stops being true: the label is written for the reader's software,
  not the postman.
- **See it.** `go-dicom show /lab/ct-explicit-le.dcm | head`: the first lines all start `0002,`.
  Group named: the first four hex digits of the number. The band after the prefix in the hex.
- **Build it.** `go-dicom show /lab/ct-explicit-le.dcm::0002,0000`: the group length, in bytes.
  The guide gives the 12 bytes of that element's own size (tag, two letters, length, four-byte
  value, all explained by stage 2). The player adds 144 and the group length and gives the
  offset, then marks group 0002, then the rest.
- **Watch it.** Predict: "What is in the Data Set's first element's group?" — 0002 /
  **a different group: 0002 never appears in the Data Set** / random. PS3.10 §7.1.
- **Debrief.** The File Meta Information is about the file; the Data Set is the object. One
  element of the envelope says how the object is written. How to Read the Rest finds it.
- **Real world.** `go-dicom show <file>::0002,0000`, `go-dicom show <file> | head`.

### Hints

1. **Nudge:** "In `go-dicom show`, look at the first four digits of each tag. Where do they
   change?"
2. **The idea:** "Group 0002 is the File Meta Information. Its first element says how many
   bytes of the group come after that element."
3. **The spot:** "The group length element starts at offset 132 and takes 12 bytes. The Data
   Set starts at 144 plus its value."

### Chips

| Command                                            | Explain                                   |
| -------------------------------------------------- | ----------------------------------------- |
| `go-dicom show /lab/ct-explicit-le.dcm`            | every element, the file's own first       |
| `go-dicom show /lab/ct-explicit-le.dcm::0002,0000` | one element: the File Meta group's length |

### Codex

- **File Meta Information** (`file-meta-information`, deepens: `part-10-file`)
- **Group length** (`group-length`)
- **The Data Set** (`data-set`, deepens: `part-10-file`)

### Field Guide

`go-dicom show <file>::<tag>` (an option of `go-dicom show`).

### Debrief links

PS3.10 §7.1 (the File Meta Information and its elements); PS3.5 §7.2 (group length) [verify
section number]; PS3.5 §7.1.2.

### Golden runs

- `start` (fails); `off-by-twelve` (fails: predicts 132 + group length); `meta-only` (fails);
  `all-three` (passes).

---

## 1.5 — How to Read the Rest

- **Id:** `how-to-read-the-rest` · **Region:** The transfer syntax · **Guide:** The Preamble ·
  **Time:** ~15 min
- **Question:** What does the Transfer Syntax UID tell the reader?
- **The one new idea:** one element of the File Meta Information, a UID, names the rules the
  Data Set is written by: whether each element carries its VR, the byte order, and whether the
  pixels are compressed.
- **Teaches:** `transfer-syntax`, `uid`, `little-endian` · **Names:** `explicit-vr`,
  `implicit-vr`, `vr` · **Uses:** `file-meta-information`, `group-length`, `data-set`
- **Skill:** `read-the-transfer-syntax` ("Find a file's transfer syntax and say what it means")
  · **Prerequisites:** `find-the-file-meta-information`

Little endian is met in the group length's four bytes, the number the player used in 1.4: the
same value, read backwards in the hex.

### Lab

Files: `/lab/ct-explicit-le.dcm`.

### Objectives

| Id         | Text                                  | Check                                                                       |
| ---------- | ------------------------------------- | --------------------------------------------------------------------------- |
| `ts-bytes` | Mark the Transfer Syntax UID element. | `{ kind: selected, file: /lab/ct-explicit-le.dcm, element: "(0002,0010)" }` |
| `ts-value` | Give the file's Transfer Syntax UID.  | `{ kind: answer, file: /lab/ct-explicit-le.dcm, element: "(0002,0010)" }`   |

### Beats

- **Scene.** The Preamble: the envelope says how the letter is written. Without it, a reader
  guesses.
- **See it.** The group length's four value bytes at 140–143 in the hex: the value from 1.4,
  least significant byte first. Little endian named. UID named: numbers and dots, at most 64
  characters; `1.2.840.10008` is DICOM's own root.
- **Build it.** `go-dicom show /lab/ct-explicit-le.dcm::0002,0010`. Mark the element in the
  tree; give the value. The guide reads `1.2.840.10008.1.2.1` as Explicit VR Little Endian:
  each element writes its VR (named for stage 2), numbers are little endian, pixels are not
  compressed.
- **Watch it.** Predict: "The UID has 19 characters. How long is its value in the file?" —
  19 / **20** / 64. The extra byte in the hex is `00`, padding to an even length (taught in
  2.2).
- **Debrief.** The Transfer Syntax UID tells the reader how to read the Data Set. Another file
  in `/lab/` names another one. A Second File opens it.
- **Real world.** `go-dicom show <file>::0002,0010`, `go-dicom tag-doc 0002,0010`.

### Hints

1. **Nudge:** "The answer is in the File Meta Information: look through group 0002 in the
   tree."
2. **The idea:** "A UID names something defined once, worldwide. This one names the rules
   the Data Set is encoded by."
3. **The spot:** "It is element 0002,0010, Transfer Syntax UID."

### Chips

| Command                                            | Explain                                     |
| -------------------------------------------------- | ------------------------------------------- |
| `go-dicom show /lab/ct-explicit-le.dcm::0002,0010` | one element: the Transfer Syntax UID        |
| `go-dicom tag-doc 0002,0010`                       | what the dictionary says about that element |

### Codex

- **Transfer syntax** (`transfer-syntax`, deepens: `file-meta-information`)
- **A UID** (`uid`)
- **Little endian** (`little-endian`, deepens: `byte-and-hex`)

### Field Guide

`go-dicom tag-doc`.

### Debrief links

PS3.10 §7.1 (Transfer Syntax UID); PS3.5 §10 (transfer syntax) and Annex A.2 (Explicit VR
Little Endian); PS3.5 §7.3 (byte ordering); PS3.5 §9 (UIDs); PS3.6 Annex A (the registry of
DICOM UIDs).

### Golden runs

- `start` (fails); `wrong-uid` (fails: gives the Media Storage SOP Class UID); `both`
  (passes).

---

## 1.6 — A Second File (capstone)

- **Id:** `a-second-file` · **Region:** The transfer syntax · **Guide:** The Preamble ·
  **Time:** ~15 min
- **Question:** Can you map a file you have never opened: its four regions and its transfer
  syntax?
- **The one new idea:** none: the whole stage on a new file, asked in one line.
- **Teaches:** none · **Names:** `implicit-vr`, `default-transfer-syntax` · **Uses:**
  `part-10-file`, `preamble`, `dicm-prefix`, `file-meta-information`, `group-length`,
  `data-set`, `transfer-syntax`, `uid`
- **Skill:** `map-a-part-10-file` ("Map any DICOM file into its four regions and read its
  transfer syntax") · **Prerequisites:** `read-the-transfer-syntax`

The capstone asks in one line: "Map `/lab/ct-implicit-le.dcm`: its four regions and its
transfer syntax." The Data Set's start moves by two bytes from 1.4's file, because this UID
is two characters shorter [verify against the fixture].

### Lab

Files: `/lab/ct-explicit-le.dcm`, `/lab/ct-implicit-le.dcm`.

### Objectives

| Id          | Text                             | Check                                                                              |
| ----------- | -------------------------------- | ---------------------------------------------------------------------------------- |
| `preamble`  | Mark the second file's preamble. | `{ kind: selected, file: /lab/ct-implicit-le.dcm, region: preamble }`              |
| `prefix`    | Mark its prefix.                 | `{ kind: selected, file: /lab/ct-implicit-le.dcm, region: prefix }`                |
| `file-meta` | Mark its File Meta Information.  | `{ kind: selected, file: /lab/ct-implicit-le.dcm, region: file-meta-information }` |
| `data-set`  | Mark its Data Set.               | `{ kind: selected, file: /lab/ct-implicit-le.dcm, region: data-set }`              |
| `ts-value`  | Give its Transfer Syntax UID.    | `{ kind: answer, file: /lab/ct-implicit-le.dcm, element: "(0002,0010)" }`          |

### Beats

- **Scene.** The Preamble: a second file arrived with the first. Same patient, same picture,
  says `info`. Map it before anyone trusts it.
- **See it.** `go-dicom info /lab/ct-implicit-le.dcm`: the same patient and image.
- **Build it.** One line: map it. The player uses what the stage taught: hexdump, the tree,
  the group length, `::0002,0010`.
- **Watch it.** Predict: "`1.2.840.10008.1.2`: same rules as the first file?" — yes / **no: no
  VR letters in the Data Set** / no: big endian. The hex of the Data Set: no two-letter VRs
  between the tags. Implicit VR named; the default transfer syntax named (PS3.5 §10.1).
- **Debrief.** Four regions, every time; the transfer syntax decides the rest. The Data Set
  here reads differently. Stage 2 opens an element and finds out why.
- **Real world.** `go-dicom info <file>`, `go-dicom show <file>::0002,0010`, `hexdump -C`.

### Hints

1. **Nudge:** "Start where every DICOM file starts: offset 0."
2. **The idea:** "The four regions are always in the same order; the group length says where
   the third ends."
3. **The spot:** "This file's group length is at offset 132, as in the first file. Its
   Transfer Syntax UID is element 0002,0010."

### Chips

| Command         | Explain                              |
| --------------- | ------------------------------------ |
| `go-dicom info` | a file's key elements                |
| `go-dicom show` | every element; add `::<tag>` for one |
| `hexdump -C`    | a file's bytes                       |

### Codex

No new cards. The chapter's title page and its **You can now…** lines are filed when this
mission is passed:

- find the four regions of any DICOM file;
- read where the object starts from its group length;
- read a file's transfer syntax and say what it decides.

### Field Guide

None new.

### Debrief links

PS3.10 §7.1; PS3.5 §10.1 (the default transfer syntax) and Annex A.1.

### Golden runs

- `start` (fails); `wrong-file` (fails: maps `ct-explicit-le.dcm` instead); `regions-only`
  (fails: no answer); `all` (passes).
