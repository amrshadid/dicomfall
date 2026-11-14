# Stage 2: The Elements

Mission specs for stage 2. Read [GAME.md](../GAME.md) for the story, the guides and the
vocabulary, [MISSIONS.md](../MISSIONS.md) for how a mission is built and checked, and
[concepts.md](concepts.md) for the concept chain.

**Who it's for:** a player who has finished stage 1: they can find the four regions of a
file, read its transfer syntax, count offsets and read a little-endian number. They have not
yet looked inside an element.

**Guide:** VR. **Stands for:** Part 5, data structures and encoding.

The stage is eight missions, about **2 hours 5 minutes**. It opens one element: its tag
(2.1), its VR and length (2.2), the long form some VRs use (2.3), and elements that hold
several values (2.4). Then the same elements without their VR letters (2.5) and the whole
object in two encodings side by side (2.6). Then elements that hold other elements (2.7). The
capstone (2.8) reads an element at any offset by hand.

| #   | Title                    | Id                         | Region                | Time    | The one question                                                                     |
| --- | ------------------------ | -------------------------- | --------------------- | ------- | ------------------------------------------------------------------------------------ |
| 2.1 | Four Bytes of Name       | `four-bytes-of-name`       | Tag, VR, length       | ~15 min | How does an element say which element it is?                                         |
| 2.2 | Two Letters and a Length | `two-letters-and-a-length` | Tag, VR, length       | ~20 min | How does a reader know what kind of value comes next, and how long it is?            |
| 2.3 | The Long Form            | `the-long-form`            | Tag, VR, length       | ~15 min | Why do some elements have four more bytes before their value?                        |
| 2.4 | One Name, Many Values    | `one-name-many-values`     | Tag, VR, length       | ~10 min | How does one element hold several values?                                            |
| 2.5 | No Letters               | `no-letters`               | Explicit and implicit | ~15 min | How can an element leave out its VR and still be read?                               |
| 2.6 | The Same Object Twice    | `the-same-object-twice`    | Explicit and implicit | ~15 min | What changes, and what stays, when one object is written in another transfer syntax? |
| 2.7 | Elements Inside Elements | `elements-inside-elements` | Sequences             | ~20 min | How does one element hold whole sets of other elements?                              |
| 2.8 | Read Any Element         | `read-any-element`         | Sequences             | ~15 min | Capstone: given any offset, can you read the element there and find the next one?    |

**Where it leads:** stage 3, The Object, stops reading bytes and reads meaning: which study,
series and instance a file is, what kind of object it is, and how its pixel elements describe
its picture.

## Regions

```yaml
regions:
  - id: tag-vr-length
    name: Tag, VR, length
    caption: an element's tag, its VR, its length and its values
    guide: VR
    source: filereader/, tag/, valuerep/, PS3.5 §6.2, §6.4, §7.1
    missions: [four-bytes-of-name, two-letters-and-a-length, the-long-form, one-name-many-values]
  - id: explicit-and-implicit
    name: Explicit and implicit
    caption: elements without VR letters, and one object in two encodings
    guide: VR
    source: filereader/, tag/, PS3.5 §7.1.3, §10.1, Annex A
    missions: [no-letters, the-same-object-twice]
  - id: sequences
    name: Sequences
    caption: sequences, items and their delimiters
    guide: VR
    source: sequence/, filereader/, PS3.5 §7.5
    missions: [elements-inside-elements, read-any-element]
```

## The lab of stage 2

Stage 1's AE, `workstation`, alone. Missions 2.1–2.4 use `/lab/ct-explicit-le.dcm`; from 2.5
both files are there.

## Facts stage 2 relies on

- A tag is a group number and an element number, 16 bits each, written `(gggg,eeee)`; in a
  little-endian transfer syntax each is stored least significant byte first, so (0010,0010)
  is the bytes `10 00 10 00` (PS3.5 §7.1, §7.3).
- Elements of a Data Set are in increasing tag order (PS3.5 §7.1). Private elements have an
  odd group number (PS3.5 §7.8).
- **Explicit VR** (PS3.5 §7.1.2): tag 4 bytes, VR 2 characters, then either a 2-byte length
  (AE, AS, AT, CS, DA, DS, DT, FL, FD, IS, LO, LT, PN, SH, SL, SS, ST, TM, UI, UL, US) or 2
  reserved bytes `00 00` and a 4-byte length (every other VR, among them OB, OW, SQ, UN, UT).
  So a short-form element's tag, VR and length take 8 bytes, a long-form one's 12.
- **Implicit VR** (PS3.5 §7.1.3): tag 4 bytes, length 4 bytes, value. 8 bytes before every
  value. The VR comes from the data dictionary.
- A value's length is even. Text values are padded with a space (`20`); UI values with one
  `00`; OB with one `00` (PS3.5 §6.2).
- A UID is at most 64 characters (PS3.5 §6.2, §9.1).
- Value Multiplicity: in text values, several values are separated by `\` (PS3.5 §6.4).
- Implicit VR Little Endian (`1.2.840.10008.1.2`) is the default transfer syntax, which every
  conformant implementation supports (PS3.5 §10.1). In it, Pixel Data is OW (PS3.5 Annex A.1).
  In Explicit VR Little Endian, Pixel Data with Bits Allocated above 8 is OW (Annex A.2).
- The File Meta Information is Explicit VR Little Endian in every Part 10 file (PS3.10 §7.1),
  so the implicit file's group 0002 still carries VR letters.
- (0002,0000) is UL, short form, 12 bytes from offset 132. (0002,0001) is OB, long form: 12
  bytes, then a 2-byte value `00 01` (PS3.10 §7.1). So (0002,0002) starts at **158** in every
  Part 10 file that is written in tag order, as both fixtures must be.
- Sequences (PS3.5 §7.5): an SQ element's value is items, each starting with the item tag
  (FFFE,E000) and its length. An item or a sequence of undefined length (`FFFFFFFF`) ends with
  an Item Delimitation Item (FFFE,E00D) or a Sequence Delimitation Item (FFFE,E0DD). In
  implicit VR, only SQ and OB may have undefined length [verify the exact wording in §7.1.3].

**About go-dicom (v1.8.0 source):** `show` prints elements inside a sequence indented one
level per depth, and `--top` leaves them out. Its `Length` column is the length of the value
go-dicom holds [verify: with or without the padding byte]. `tag-doc <tag>` takes `0010,0010`,
`(0010,0010)` or `00100010`, and `tag-doc -keyword PatientName` a keyword; both print the
dictionary's name, VR and VM.

**About the fixture:** the sequence of 2.7, the multi-valued elements of 2.4 and the first
Data Set element are whatever `manifest.json` lists [verify against the manifest]. A spec
below that needs a value names the element, never the value.

---

## 2.1 — Four Bytes of Name

- **Id:** `four-bytes-of-name` · **Region:** Tag, VR, length · **Guide:** VR · **Time:** ~15 min
- **Question:** How does an element say which element it is?
- **The one new idea:** every element starts with its tag, four bytes in little endian, and
  the dictionary turns the tag into a name.
- **Teaches:** `tag`, `tag-order`, `data-dictionary` · **Names:** `private-tag` · **Uses:** `data-element`, `little-endian`, `offset`, `byte-and-hex`
- **Skill:** `read-a-tag` ("Find an element's tag in the bytes and look it up") ·
  **Prerequisites:** `map-a-part-10-file`

VR introduces itself and the stage. The `part` field of the `selected` check is met for the
first time: the player marks only the tag.

### Lab

Files: `/lab/ct-explicit-le.dcm`.

### Objectives

| Id             | Text                                               | Check                                                                                    |
| -------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `modality-tag` | Mark the four bytes of the Modality element's tag. | `{ kind: selected, file: /lab/ct-explicit-le.dcm, element: "(0008,0060)", part: tag }`   |
| `id-offset`    | Give the offset where Patient ID's tag starts.     | `{ kind: offset, file: /lab/ct-explicit-le.dcm, element: "(0010,0020)", offset: <run> }` |

### Beats

- **Scene.** VR: "Stage 1 found the regions. Now one element, and I will be exact about it."
- **See it.** The Modality row in the tree; its bytes in the hex start `08 00 60 00`. Tag named:
  group then element; each half little endian, so `0008` is stored `08 00`.
- **Build it.** Mark those four bytes. `go-dicom tag-doc 0010,0020`: the dictionary's name,
  keyword and more (VR and VM taught later). Find `10 00 20 00` in the hex and give its offset.
- **Watch it.** Predict: "Which comes first in the file, (0010,0010) or (0008,0060)?" —
  (0010,0010) / **(0008,0060): elements are in increasing tag order** / any order. Odd groups
  named: private elements, defined by a vendor.
- **Debrief.** A tag is a number; the dictionary gives it a name. Two Letters and a Length reads
  what comes after it.
- **Real world.** `go-dicom tag-doc 0010,0020`, `go-dicom tag-doc -keyword Modality`.

### Hints

1. **Nudge:** "Select Modality in the tree and look at the first bytes it lights up."
2. **The idea:** "A tag is a group and an element, two bytes each, each stored low byte
   first."
3. **The spot:** "Patient ID is (0010,0020): look for the bytes 10 00 20 00 just after
   Patient's Name."

### Chips

| Command            | Explain                                                    |
| ------------------ | ---------------------------------------------------------- |
| `go-dicom tag-doc` | look a tag up in the dictionary: its name, keyword, VR, VM |
| `go-dicom show`    | every element; add `::<tag>` for one                       |

### Codex (chapter: The Elements)

- **A tag** (`tag`, deepens: `data-element`)
- **Tag order** (`tag-order`, deepens: `tag`)
- **The data dictionary** (`data-dictionary`)

### Field Guide

`go-dicom tag-doc` (with `-keyword`).

### Debrief links

PS3.5 §7.1 (data elements, tag order); PS3.5 §7.8 (private elements); PS3.6 §6 (the registry
of data elements) [verify section number].

### Golden runs

- `start` (fails); `tag-big-endian` (fails: predicts the offset of `00 10 00 20`, which is not
  there); `both` (passes).

---

## 2.2 — Two Letters and a Length

- **Id:** `two-letters-and-a-length` · **Region:** Tag, VR, length · **Guide:** VR ·
  **Time:** ~20 min
- **Question:** How does a reader know what kind of value comes next, and how long it is?
- **The one new idea:** after the tag, two letters say what kind of value it is, and two bytes
  say how many bytes it takes, always an even number.
- **Teaches:** `vr`, `value-length`, `value-padding` · **Names:** `long-form` · **Uses:**
  `tag`, `tag-order`, `little-endian`, `offset`, `transfer-syntax`
- **Skill:** `read-vr-and-length` ("Read an element's VR and length, and find where it ends") ·
  **Prerequisites:** `read-a-tag`

The first prediction of an element's end. 1.5's padded UID is explained.

### Lab

Files: `/lab/ct-explicit-le.dcm`.

### Objectives

| Id            | Text                                                            | Check                                                                                     |
| ------------- | --------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `modality-vr` | Mark the two letters that give Modality its VR.                 | `{ kind: selected, file: /lab/ct-explicit-le.dcm, element: "(0008,0060)", part: vr }`     |
| `name-length` | Mark the length of Patient's Name.                              | `{ kind: selected, file: /lab/ct-explicit-le.dcm, element: "(0010,0010)", part: length }` |
| `next-start`  | Predict where the element after the Transfer Syntax UID starts. | `{ kind: offset, file: /lab/ct-explicit-le.dcm, element: "(0002,0012)", offset: <run> }`  |

### Beats

- **Scene.** VR: "Four bytes say which element. My two letters say what kind of value."
- **See it.** Modality: `08 00 60 00`, then `43 53`, `CS`, then `02 00`, then `43 54`. VR named
  (PS3.5 §6.2); `CS` a code string, `PN` a person's name, `UI` a UID, `US` an unsigned 16-bit
  number. Value length named: little endian, in bytes.
- **Build it.** Mark Modality's VR. Mark Patient's Name's length. Then the Transfer Syntax UID:
  its length is 20 for 19 characters, the last byte `00`. Padding named. Predict: the tag's
  offset, plus 8, plus the length, is where the next element starts.
- **Watch it.** Predict: "Patient's Name has an odd number of letters. What fills it out?" —
  `00` / **a space, `20`** / nothing. Per VR: space for text, `00` for UI [verify the fixture's
name length is odd; if even, the Predict uses another text element].
- **Debrief.** Tag, VR, length, value: eight bytes, then the value. Some VRs need more room. The
  Long Form shows them.
- **Real world.** `go-dicom show <file>`, reading the VR and Length columns; `go-dicom tag-doc`.

### Hints

1. **Nudge:** "Look at the two bytes just after Modality's tag, in the text column."
2. **The idea:** "After the tag: two letters of VR, then a two-byte little-endian length, then
   that many bytes of value."
3. **The spot:** "The Transfer Syntax UID starts at its tag; add 8 and its length, 20, to find
   the next tag."

### Chips

| Command            | Explain                               |
| ------------------ | ------------------------------------- |
| `go-dicom show`    | every element, with its VR and length |
| `go-dicom tag-doc` | the dictionary's VR for a tag         |

### Codex

- **VR, the Value Representation** (`vr`, deepens: `data-element`)
- **Value length** (`value-length`, deepens: `vr`)
- **Padding** (`value-padding`, deepens: `value-length`)

### Field Guide

None new.

### Debrief links

PS3.5 §6.2 (value representations and padding); PS3.5 §7.1.2 (explicit VR elements).

### Golden runs

- `start` (fails); `forgot-the-eight` (fails: predicts tag offset + 20); `all-three` (passes).

---

## 2.3 — The Long Form

- **Id:** `the-long-form` · **Region:** Tag, VR, length · **Guide:** VR · **Time:** ~15 min
- **Question:** Why do some elements have four more bytes before their value?
- **The one new idea:** for binary and long values the VR is followed by two reserved bytes
  and a four-byte length, so an element can hold up to about 4 GB.
- **Teaches:** `long-form`, `binary-vr` · **Names:** `pixel-data`, `sequence` · **Uses:**
  `vr`, `value-length`, `tag`, `offset`, `group-length`
- **Skill:** `read-long-form-elements` ("Read elements whose length takes four bytes") ·
  **Prerequisites:** `read-vr-and-length`

The prediction of 1.4 comes back with its reason: File Meta Information Version (0002,0001)
is OB.

### Lab

Files: `/lab/ct-explicit-le.dcm`.

### Objectives

| Id              | Text                                              | Check                                                                                     |
| --------------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `after-version` | Predict where Media Storage SOP Class UID starts. | `{ kind: offset, file: /lab/ct-explicit-le.dcm, element: "(0002,0002)", offset: 158 }`    |
| `pixel-length`  | Mark the length of Pixel Data.                    | `{ kind: selected, file: /lab/ct-explicit-le.dcm, element: "(7FE0,0010)", part: length }` |

### Beats

- **Scene.** VR: "Two bytes of length count to 65,535. A CT picture needs more."
- **See it.** (0002,0001) at offset 144: `02 00 01 00 4F 42 00 00 02 00 00 00 00 01`. `OB`, two
  zero bytes, a four-byte length of 2. Long form named; OB and OW named as raw bytes and 16-bit
  words.
- **Build it.** Predict (0002,0002): 144 + 12 + 2. Then Pixel Data: `OW`, `00 00`, four bytes of
  length; mark them. The guide reads the length in the hex.
- **Watch it.** Predict: "64 rows × 64 columns × 2 bytes. Pixel Data's length?" — 4,096 /
  **8,192** / 64. The four length bytes `00 20 00 00` read as 0x2000 [verify against the
fixture].
- **Debrief.** Short form 8 bytes, long form 12, and the VR decides which. One Name, Many
  Values looks at what a value can hold.
- **Real world.** `go-dicom show <file>::7FE0,0010`.

### Hints

1. **Nudge:** "Look at the bytes right after the VR letters of (0002,0001)."
2. **The idea:** "Some VRs, OB, OW, SQ, UN, UT among them, put two reserved bytes and a
   four-byte length after the VR."
3. **The spot:** "(0002,0001) starts at 144: twelve bytes before its value, and its value is
   two bytes long."

### Chips

| Command         | Explain                              |
| --------------- | ------------------------------------ |
| `go-dicom show` | every element; add `::<tag>` for one |

### Codex

- **The long form** (`long-form`, deepens: `value-length`)
- **OB and OW** (`binary-vr`, deepens: `vr`)

### Field Guide

None new.

### Debrief links

PS3.5 §7.1.2 (the two forms of an explicit element); PS3.5 §6.2 (OB, OW); PS3.10 §7.1 (File
Meta Information Version).

### Golden runs

- `start` (fails); `short-form-guess` (fails: predicts 154); `both` (passes).

---

## 2.4 — One Name, Many Values

- **Id:** `one-name-many-values` · **Region:** Tag, VR, length · **Guide:** VR ·
  **Time:** ~10 min
- **Question:** How does one element hold several values?
- **The one new idea:** an element's VM says how many values it may hold; text values are
  separated by `\`, binary ones follow one another.
- **Teaches:** `value-multiplicity` · **Names:** none · **Uses:** `vr`, `value-length`,
  `data-dictionary`
- **Skill:** `read-multiple-values` ("Read an element that holds several values") ·
  **Prerequisites:** `read-long-form-elements`

A short mission, by design, after the longest of the region.

### Lab

Files: `/lab/ct-explicit-le.dcm`.

### Objectives

| Id              | Text                                      | Check                                                                     |
| --------------- | ----------------------------------------- | ------------------------------------------------------------------------- |
| `image-type`    | Give every value of Image Type, in order. | `{ kind: answer, file: /lab/ct-explicit-le.dcm, element: "(0008,0008)" }` |
| `pixel-spacing` | Give both values of Pixel Spacing.        | `{ kind: answer, file: /lab/ct-explicit-le.dcm, element: "(0028,0030)" }` |

Both elements must be in the fixture [verify against the manifest]. Image Type is Type 1 in
the CT Image Module (PS3.3 §C.8.2.1); Pixel Spacing is in the Image Plane Module (PS3.3
§C.7.6.2) [verify the fixture includes it].

### Beats

- **Scene.** VR: "One element, one name. Not always one value."
- **See it.** `go-dicom show /lab/ct-explicit-le.dcm::0008,0008`: values joined by `\`. In the
  hex, the backslash is `5C`. VM named.
- **Build it.** `go-dicom tag-doc 0008,0008`: VM `2-n`; `tag-doc 0028,0030`: VM `2` [verify both
as go-dicom prints them]. Give both answers.
- **Watch it.** Predict: "Is the backslash part of the length?" — **yes** / no. Length counts
  every byte of the value, separators and padding.
- **Debrief.** VM is how many values; `\` is how text keeps them apart. No Letters takes the VR
  away.
- **Real world.** `go-dicom tag-doc 0028,0030`.

### Hints

1. **Nudge:** "Show the element on its own and read its value closely."
2. **The idea:** "Several values in one text element are separated by a backslash."
3. **The spot:** "Image Type is 0008,0008 and Pixel Spacing is 0028,0030; give the values with
   `\` between them."

### Chips

| Command            | Explain                       |
| ------------------ | ----------------------------- |
| `go-dicom show`    | add `::<tag>` for one element |
| `go-dicom tag-doc` | the dictionary's VM for a tag |

### Codex

- **VM, the Value Multiplicity** (`value-multiplicity`, deepens: `vr`)

### Field Guide

None new.

### Debrief links

PS3.5 §6.4 (value multiplicity and delimitation); PS3.6 §6 [verify section number].

### Golden runs

- `start` (fails); `first-value-only` (fails); `both` (passes).

---

## 2.5 — No Letters

- **Id:** `no-letters` · **Region:** Explicit and implicit · **Guide:** VR · **Time:** ~15 min
- **Question:** How can an element leave out its VR and still be read?
- **The one new idea:** in Implicit VR Little Endian an element is tag, four-byte length,
  value; the reader takes the VR from the dictionary.
- **Teaches:** `explicit-vr`, `implicit-vr`, `default-transfer-syntax` · **Names:** none ·
  **Uses:** `tag`, `vr`, `value-length`, `long-form`, `data-dictionary`, `transfer-syntax`
- **Skill:** `read-implicit-elements` ("Read an element that carries no VR") ·
  **Prerequisites:** `read-multiple-values`

`explicit-vr` was named in 1.5 and 2.2 to 2.4 read explicit elements without the word; here
it is taught against its opposite. VR's voice is at its most pedantic: it is missing from the bytes.

### Lab

Files: `/lab/ct-explicit-le.dcm`, `/lab/ct-implicit-le.dcm`.

### Objectives

| Id                | Text                                                  | Check                                                                                     |
| ----------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `name-implicit`   | Mark the Patient's Name element in the implicit file. | `{ kind: selected, file: /lab/ct-implicit-le.dcm, element: "(0010,0010)" }`               |
| `length-implicit` | Mark its length.                                      | `{ kind: selected, file: /lab/ct-implicit-le.dcm, element: "(0010,0010)", part: length }` |
| `next-implicit`   | Predict where Patient ID starts in the implicit file. | `{ kind: offset, file: /lab/ct-implicit-le.dcm, element: "(0010,0020)", offset: <run> }`  |

### Beats

- **Scene.** VR: "In the second file I am not written down. Someone still has to know me."
- **See it.** Patient's Name in the implicit file: `10 00 10 00`, then four bytes of length,
  then the name. No letters. `go-dicom show` still prints `PN`. Implicit VR named; the
  dictionary supplies the VR.
- **Build it.** Mark the element, then its four length bytes. Predict Patient ID: the tag's
  offset, plus 8, plus the length (8 for every element here, whatever its VR).
- **Watch it.** Predict: "Why does DICOM keep a syntax that drops the VR?" — it is smaller /
  **it is the default every implementation must support** / it is faster. PS3.5 §10.1. Where
  it fails: an element the dictionary doesn't know, such as a private one, has no VR to read.
- **Debrief.** Explicit carries the VR; implicit leaves it to the dictionary. The Same Object
  Twice lays the two files side by side.
- **Real world.** `go-dicom show <file>`; `go-dicom tag-doc <tag>`.

### Hints

1. **Nudge:** "Compare Patient's Name in the two files, byte by byte, in the hex."
2. **The idea:** "In Implicit VR Little Endian, each element is a tag, a four-byte length and
   the value. Nothing else."
3. **The spot:** "In the implicit file, Patient's Name's length is the four bytes right after
   `10 00 10 00`."

### Chips

| Command            | Explain                               |
| ------------------ | ------------------------------------- |
| `go-dicom show`    | every element; the VR is the reader's |
| `go-dicom tag-doc` | the dictionary entry the reader used  |

### Codex

- **Explicit VR** (`explicit-vr`, deepens: `vr`)
- **Implicit VR** (`implicit-vr`, deepens: `explicit-vr`)
- **The default transfer syntax** (`default-transfer-syntax`, deepens: `transfer-syntax`)

### Field Guide

None new.

### Debrief links

PS3.5 §7.1.2, §7.1.3 (explicit and implicit elements); PS3.5 §10.1 (the default transfer
syntax); PS3.5 Annex A.1.

### Golden runs

- `start` (fails); `explicit-arithmetic` (fails: predicts with a two-byte length); `all-three`
  (passes).

---

## 2.6 — The Same Object Twice

- **Id:** `the-same-object-twice` · **Region:** Explicit and implicit · **Guide:** VR ·
  **Time:** ~15 min
- **Question:** What changes, and what stays, when one object is written in another transfer
  syntax?
- **The one new idea:** the values are the same; the bytes, the offsets and the size are not,
  and the File Meta Information stays explicit in both.
- **Teaches:** `same-object-other-bytes`, `file-meta-always-explicit` · **Names:**
  `sop-instance-uid` · **Uses:** `explicit-vr`, `implicit-vr`, `long-form`,
  `file-meta-information`, `transfer-syntax`
- **Skill:** `compare-encodings` ("Tell what changes between two encodings of the same
  object") · **Prerequisites:** `read-implicit-elements`

The files differ in size by 2 bytes in the File Meta Information and 4 bytes for each element
that uses the long form in explicit VR [verify against the fixture sizes].

### Lab

Files: `/lab/ct-explicit-le.dcm`, `/lab/ct-implicit-le.dcm`.

### Objectives

| Id            | Text                                                                 | Check                                                                                    |
| ------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `meta-vr`     | Mark the VR letters of the Transfer Syntax UID in the implicit file. | `{ kind: selected, file: /lab/ct-implicit-le.dcm, element: "(0002,0010)", part: vr }`    |
| `pixel-moved` | Predict where Pixel Data starts in the implicit file.                | `{ kind: offset, file: /lab/ct-implicit-le.dcm, element: "(7FE0,0010)", offset: <run> }` |

### Beats

- **Scene.** VR: "Two files, one object. Prove which parts are the same."
- **See it.** `ls -l /lab`: two sizes. `go-dicom show` on both: the same values line by line,
  and the same VR column. The instance's name, (0008,0018), named: the same in both.
- **Build it.** In the implicit file's group 0002: `UI` is there. Mark it. Then predict Pixel
  Data's offset from the explicit file's and the count of long-form elements before it, or by
  walking the implicit file.
- **Watch it.** Predict: "Which file is larger?" — implicit / **explicit** / the same. The
  difference, explained: 2 bytes of Transfer Syntax UID, and 4 per long-form element.
- **Debrief.** A transfer syntax changes the bytes, never the values. Elements Inside Elements
  opens the one element that holds others.
- **Real world.** `ls -l`, `go-dicom show a.dcm`, `go-dicom show b.dcm`, `cmp a.dcm b.dcm`.

### Hints

1. **Nudge:** "Look at group 0002 of the implicit file in the hex: what sits after each tag?"
2. **The idea:** "Every Part 10 file writes its File Meta Information in Explicit VR Little
   Endian; only the Data Set follows the Transfer Syntax UID."
3. **The spot:** "In the implicit file, every element before Pixel Data takes 8 bytes before
   its value. Count from the start of the Data Set."

### Chips

| Command         | Explain                               |
| --------------- | ------------------------------------- |
| `ls -l`         | files with their sizes in bytes       |
| `go-dicom show` | every element of a file               |
| `cmp`           | the first byte where two files differ |

### Codex

- **Same object, other bytes** (`same-object-other-bytes`, deepens: `transfer-syntax`)
- **The File Meta Information is always explicit** (`file-meta-always-explicit`, deepens:
  `file-meta-information`)

### Field Guide

Shell: `cmp`.

### Debrief links

PS3.10 §7.1 (the File Meta Information's transfer syntax); PS3.5 §10 (transfer syntaxes);
PS3.5 Annex A.1, A.2.

### Golden runs

- `start` (fails); `explicit-offset` (fails: gives Pixel Data's offset in the explicit file);
  `both` (passes).

---

## 2.7 — Elements Inside Elements

- **Id:** `elements-inside-elements` · **Region:** Sequences · **Guide:** VR · **Time:** ~20 min
- **Question:** How does one element hold whole sets of other elements?
- **The one new idea:** an SQ element's value is a list of items; each item is a small set of
  elements, and a length of `FFFFFFFF` means "until the delimiter".
- **Teaches:** `sequence`, `item`, `undefined-length` · **Names:** none · **Uses:** `vr`,
  `long-form`, `value-length`, `tag`, `explicit-vr`
- **Skill:** `read-a-sequence` ("Read a sequence, its items and their elements") ·
  **Prerequisites:** `compare-encodings`

The fixture's sequence, its item count and its lengths (defined or undefined) are whatever
`manifest.json` says [verify against the manifest]. The undefined-length part of the beats
needs at least one undefined length in the fixture; if it has none, Watch it shows the rule
and `undefined-length` moves to a named concept here and to a taught one in 2.8.

### Lab

Files: `/lab/ct-explicit-le.dcm`.

### Objectives

| Id             | Text                                           | Check                                                                                      |
| -------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `sequence`     | Mark the sequence element.                     | `{ kind: selected, file: /lab/ct-explicit-le.dcm, element: <the sequence's tag> }`         |
| `first-item`   | Mark its first item.                           | `{ kind: selected, file: /lab/ct-explicit-le.dcm, element: "<the sequence's tag>[0]" }`    |
| `nested-value` | Give the value of an element inside that item. | `{ kind: answer, file: /lab/ct-explicit-le.dcm, element: "<the sequence's tag>[0]<tag>" }` |

The element path `[0]` with nothing after it means the item itself, from its (FFFE,E000) tag
to the end of its value or its delimiter.

### Beats

- **Scene.** VR: "Some of my kind are not values at all. SQ holds elements."
- **See it.** `go-dicom show /lab/ct-explicit-le.dcm`: indented lines. `--top`: they vanish. The
  tree folds the sequence. In the hex: `53 51` (`SQ`), `00 00`, a length, then `FE FF 00 E0`,
  the item tag. Sequence and item named.
- **Build it.** Mark the sequence, then its first item, then read an element inside it and
  give its value.
- **Watch it.** Predict: "A length of `FF FF FF FF`. How does the reader find the end?" —
  it reads 4 GB / **it looks for a delimitation item** / the file's end. (FFFE,E00D) and
  (FFFE,E0DD) named.
- **Debrief.** A sequence is an element of elements, as deep as needed. The capstone reads
  any element, anywhere.
- **Real world.** `go-dicom show <file>`, `go-dicom show <file> --top`.

### Hints

1. **Nudge:** "Look for the indented lines in `go-dicom show`, and the element just above them."
2. **The idea:** "An SQ element's value is items. Each item starts with the tag (FFFE,E000) and
   holds elements of its own."
3. **The spot:** "The sequence is the element right above the first indented line; its first
   item starts right after its length."

### Chips

| Command         | Explain                                  |
| --------------- | ---------------------------------------- |
| `go-dicom show` | every element; `--top` leaves out nested |

### Codex

- **A sequence** (`sequence`, deepens: `long-form`)
- **An item** (`item`, deepens: `sequence`)
- **Undefined length** (`undefined-length`, deepens: `value-length`)

### Field Guide

`go-dicom show --top` (an option of `go-dicom show`).

### Debrief links

PS3.5 §7.5 (nesting of Data Sets), §7.5.1 (items), §7.5.2 (delimitation); PS3.5 §7.1.1
(undefined length).

### Golden runs

- `start` (fails); `item-as-sequence` (fails: marks the item for the sequence); `all-three`
  (passes).

---

## 2.8 — Read Any Element (capstone)

- **Id:** `read-any-element` · **Region:** Sequences · **Guide:** VR · **Time:** ~15 min
- **Question:** Given any offset in a file, can you read the element that starts there and say
  where the next one starts?
- **The one new idea:** none: the whole stage, at an offset the player has not seen, in the
  implicit file.
- **Teaches:** none · **Names:** none · **Uses:** `tag`, `vr`, `value-length`,
  `value-padding`, `long-form`, `value-multiplicity`, `implicit-vr`, `data-dictionary`,
  `sequence`, `item`, `undefined-length`
- **Skill:** `read-any-element` ("Read any element of a file by hand, in either little-endian
  encoding") · **Prerequisites:** `read-a-sequence`

One line: "An element starts at offset N of `/lab/ct-implicit-le.dcm`. Read it, and find the
next one." N is the offset of an element chosen from the fixture, with a multi-valued or
padded value [verify against the manifest].

### Lab

Files: `/lab/ct-explicit-le.dcm`, `/lab/ct-implicit-le.dcm`.

### Objectives

| Id          | Text                                     | Check                                                                                 |
| ----------- | ---------------------------------------- | ------------------------------------------------------------------------------------- |
| `its-tag`   | Mark the tag of the element at offset N. | `{ kind: selected, file: /lab/ct-implicit-le.dcm, element: <its tag>, part: tag }`    |
| `its-value` | Give its value.                          | `{ kind: answer, file: /lab/ct-implicit-le.dcm, element: <its tag> }`                 |
| `next`      | Predict where the next element starts.   | `{ kind: offset, file: /lab/ct-implicit-le.dcm, element: <next tag>, offset: <run> }` |

### Beats

- **Scene.** VR: "No tree this time. Bytes, an offset, and what you know."
- **See it.** The tree is still there, but the guide asks the player to read the hex first.
- **Build it.** One line. The player reads the tag, looks it up with `tag-doc`, reads the
  four-byte length, the value, and predicts the next offset.
- **Watch it.** The tree confirms: the element's row, its VR from the dictionary, its value.
- **Debrief.** Any element, any encoding of these two. Stage 3 asks what the elements mean.
- **Real world.** `hexdump -C -s N -n 32 <file>`, `go-dicom tag-doc <tag>`.

### Hints

1. **Nudge:** "Go to offset N in the hex. Which transfer syntax is this file in?"
2. **The idea:** "In implicit VR: four bytes of tag, four of length, then the value. The
   dictionary gives the VR."
3. **The spot:** "The tag is the four bytes at N, low byte first in each half; the length is
   the next four."

### Chips

| Command            | Explain                                 |
| ------------------ | --------------------------------------- |
| `hexdump -C`       | a file's bytes; `-s` skips to an offset |
| `go-dicom tag-doc` | look up a tag                           |

### Codex

No new cards. **You can now…**:

- read any element's tag, VR, length and value by hand;
- predict where the next element starts, in explicit or implicit VR;
- find a sequence's items and the elements inside them.

### Field Guide

None new.

### Debrief links

PS3.5 §7.1, §7.5; PS3.5 Annex A.1.

### Golden runs

- `start` (fails); `value-only` (fails: no prediction); `explicit-lengths` (fails: predicts as
  if the VR were written); `all-three` (passes).
