# Stage 3: The Object

Mission specs for stage 3. Read [GAME.md](../GAME.md) for the story, the guides and the
vocabulary, [MISSIONS.md](../MISSIONS.md) for how a mission is built and checked, and
[concepts.md](concepts.md) for the concept chain.

**Who it's for:** a player who has finished stage 2: they can read any element by hand in
either little-endian encoding. They have not yet asked what the elements mean together.

**Guide:** The Instance UID. **Stands for:** Part 3, information object definitions, and the
Storage SOP Classes of Part 4.

The stage is seven missions, about **1 hour 45 minutes**. It leaves the bytes and reads
meaning. First identity: which study a file belongs to (3.1), which series (3.2), and the name
that belongs to one instance only (3.3). Then kind: the SOP Class, and how the File Meta
Information repeats it (3.4). Then the picture: the elements that describe its size and
encoding (3.5) and how a stored number becomes a CT value (3.6). The capstone (3.7) finds our
instance in a fresh pile of files and describes it.

| #   | Title                       | Id                           | Region                  | Time    | The one question                                                                          |
| --- | --------------------------- | ---------------------------- | ----------------------- | ------- | ----------------------------------------------------------------------------------------- |
| 3.1 | Two Visits                  | `two-visits`                 | Study, Series, Instance | ~15 min | How does DICOM say which files belong to the same examination?                            |
| 3.2 | Three Series                | `three-series`               | Study, Series, Instance | ~15 min | Inside a study, what makes a series?                                                      |
| 3.3 | The One Instance            | `the-one-instance`           | Study, Series, Instance | ~15 min | How is one object named so that it is never confused with any other?                      |
| 3.4 | What It Is, Which One It Is | `what-it-is-which-one-it-is` | SOP Class and instance  | ~15 min | What tells a reader what kind of object this is, apart from which one it is?              |
| 3.5 | 64 by 64                    | `64-by-64`                   | The pixel attributes    | ~15 min | How do a few elements describe the picture in Pixel Data?                                 |
| 3.6 | Numbers into Shades         | `numbers-into-shades`        | The pixel attributes    | ~15 min | How does a stored pixel number become a CT value and a shade of grey?                     |
| 3.7 | Our Instance                | `our-instance`               | The pixel attributes    | ~15 min | Capstone: in a pile of files, can you find our instance, place it and describe its image? |

**Where it leads:** the Bridge sends the instance to another AE, and follows its SOP Instance
UID from the file onto the wire.

## Regions

```yaml
regions:
  - id: study-series-instance
    name: Study, Series, Instance
    caption: the information model, and the three UIDs that place an instance
    guide: The Instance UID
    source: dataset/, uid/, PS3.3 §7, §C.7.2.1, §C.7.3.1, §C.12.1
    missions: [two-visits, three-series, the-one-instance]
  - id: sop-class-and-instance
    name: SOP Class and instance
    caption: what kind of object it is, which one it is, and the file's copy of both
    guide: The Instance UID
    source: uid/, filereader/, PS3.4 §B.5, PS3.3 §A.3, PS3.10 §7.1
    missions: [what-it-is-which-one-it-is]
  - id: the-pixel-attributes
    name: The pixel attributes
    caption: rows, columns, the pixel encoding, and how stored values become CT values
    guide: The Instance UID
    source: pixels/, PS3.3 §C.7.6.3, §C.8.2.1, §C.11.2
    missions: [64-by-64, numbers-into-shades, our-instance]
```

## The lab of stage 3

`workstation` alone. Files per mission:

- `/lab/ct-explicit-le.dcm`, the instance of stages 1 and 2;
- `/lab/series/`: about six files, two studies, three series, named so that the names do not
  give the grouping away.

```yaml
files:
  - { fixture: ct-explicit-le.dcm, to: /lab/ct-explicit-le.dcm }
  - { fixture: series/, to: /lab/series/ }
```

**Fixture requirement.** 3.3 and 3.7 need one file of `series/` to hold our instance: the
same SOP Instance UID as `ct-explicit-le.dcm`, under a name that does not say so. All six
files should share the one fictional patient, so that "two studies" means two examinations of
one patient [verify against the manifest; asked of the fixtures generator].

The `grouped` checks list every file of `series/` under `files` and use `into: /lab/sorted`.
The player sorts with `mkdir` and `mv` or `cp`; folder names are free.

## Facts stage 3 relies on

- The DICOM model of the real world: a patient has studies; a study has series; a series has
  instances (PS3.3 §7, §7.1).
- Study Instance UID (0020,000D) is in the General Study Module (PS3.3 §C.7.2.1); Series
  Instance UID (0020,000E), Series Number (0020,0011) and Modality (0008,0060) in the General
  Series Module (PS3.3 §C.7.3.1); SOP Class UID (0008,0016) and SOP Instance UID (0008,0018)
  in the SOP Common Module (PS3.3 §C.12.1); Instance Number (0020,0013) in the General Image
  Module (PS3.3 §C.7.6.1) [verify that module number].
- A series holds instances of one modality (PS3.3 §C.7.3.1, Modality) [verify the exact
wording of the series definition].
- UIDs are unique worldwide; numbers such as Series Number and Instance Number are not, and
  can repeat across studies (PS3.5 §9; PS3.3 §C.7.3.1).
- CT Image Storage is `1.2.840.10008.5.1.4.1.1.2` (PS3.4 §B.5, Table B.5-1; PS3.6 Annex A).
- A SOP Class pairs an IOD with a service; the CT Image IOD is PS3.3 §A.3 [verify the
definition's section in PS3.4 §6].
- Media Storage SOP Class UID (0002,0002) and Media Storage SOP Instance UID (0002,0003) in the
  File Meta Information identify the object the file holds (PS3.10 §7.1).
- Image Pixel Module (PS3.3 §C.7.6.3): Samples per Pixel (0028,0002), Photometric
  Interpretation (0028,0004), Rows (0028,0010), Columns (0028,0011), Bits Allocated
  (0028,0100), Bits Stored (0028,0101), High Bit (0028,0102), Pixel Representation
  (0028,0103), Pixel Data (7FE0,0010). Pixel Representation `0` is unsigned, `1` two's
  complement.
- CT Image Module (PS3.3 §C.8.2.1): Samples per Pixel 1; Photometric Interpretation
  `MONOCHROME1` or `MONOCHROME2`; Bits Allocated 16; Bits Stored 12 to 16; High Bit one less
  than Bits Stored; Rescale Intercept (0028,1052) and Rescale Slope (0028,1053) Type 1, and
  output units = slope × stored value + intercept, Hounsfield units for an original axial
  image.
- `MONOCHROME2`: the lowest value is shown black (PS3.3 §C.7.6.3.1.2).
- Window Center (0028,1050) and Window Width (0028,1051) choose which range of values is shown
  as greys (PS3.3 §C.11.2) [verify the module number: VOI LUT].
- Native Pixel Data length = Rows × Columns × Samples per Pixel × Bits Allocated / 8 × frames,
  for one frame of the fixture 64 × 64 × 1 × 2 = 8,192 bytes (follows from PS3.5 §8.1.1)
  [verify the section].

**About go-dicom (v1.8.0 source):** `convert <file> <out.png> --format png` writes the image
windowed with the file's own Window Center and Width, or `--window center,width`; the PNG
holds pixels only. The Lightbox's preview is go-dicom's rendering.

**About the fixture:** Photometric Interpretation, Bits Stored, Pixel Representation, Rescale
Slope and Intercept and the window are whatever `manifest.json` lists [verify against the
manifest].

---

## 3.1 — Two Visits

- **Id:** `two-visits` · **Region:** Study, Series, Instance · **Guide:** The Instance UID ·
  **Time:** ~15 min
- **Question:** How does DICOM say which files belong to the same examination?
- **The one new idea:** DICOM files the world as patient, study, series, instance, and every
  file carries the UID of its study.
- **Teaches:** `information-model`, `study`, `study-instance-uid` · **Names:** `series`,
  `sop-instance-uid` · **Uses:** `uid`, `data-element`, `tag`
- **Skill:** `sort-by-study` ("Sort DICOM files into their studies") · **Prerequisites:**
  `read-any-element`

The Instance UID speaks for the first time. The Lightbox's UID trail shows its first link,
Study.

### Lab

Files: `/lab/ct-explicit-le.dcm`, `/lab/series/`.

### Objectives

| Id         | Text                                                                  | Check                                                                                   |
| ---------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `by-study` | Put the files of each study in a folder of its own under /lab/sorted. | `{ kind: grouped, files: [<every file of /lab/series>], into: /lab/sorted, by: study }` |

### Beats

- **Scene.** The Instance UID: "Six files came in tonight. Their names tell you nothing. Ours
  is not the only scan of this patient."
- **See it.** `ls /lab/series`. `go-dicom info` on two of them: the same patient, two dates.
  The information model named: patient, study, series, instance.
- **Build it.** `go-dicom show <file>::0020,000D` on each file. `mkdir -p /lab/sorted/<name>`
  and `mv` each file into its study's folder.
- **Watch it.** Predict: "Two files have the same Study Date. Same study?" — yes / **only if
  their Study Instance UIDs match** [verify the fixture has two studies on one date, or the
Predict uses the description instead].
- **Debrief.** A study is one examination, and its UID, not its date, says so. Three Series
  looks inside one.
- **Real world.** `for f in *.dcm; do go-dicom show "$f::0020,000D"; done`.

### Hints

1. **Nudge:** "`go-dicom info` gives each file's date and description. Is that enough to be
   sure?"
2. **The idea:** "Every file holds its study's UID. Files with the same Study Instance UID are
   one study."
3. **The spot:** "Study Instance UID is 0020,000D. Read it in every file of /lab/series."

### Chips

| Command         | Explain                                |
| --------------- | -------------------------------------- |
| `go-dicom show` | add `::0020,000D` for one element      |
| `go-dicom info` | a file's patient, date and description |
| `mkdir -p`      | make a folder, and its parents         |
| `mv`            | move a file into a folder              |

### Codex (chapter: The Object)

- **The information model** (`information-model`)
- **A study** (`study`, deepens: `information-model`)
- **Study Instance UID** (`study-instance-uid`, deepens: `uid`)

### Field Guide

Shell: `mkdir -p`, `mv`, a `for` loop.

### Debrief links

PS3.3 §7 (the DICOM model of the real world); PS3.3 §C.7.2.1 (General Study Module).

### Golden runs

- `start` (fails); `by-date` (fails: sorted by Study Date, where the fixture makes dates and
  UIDs disagree [verify]); `by-description` (fails if descriptions repeat [verify]);
  `by-uid` (passes); `copied` (passes: `cp` instead of `mv`).

---

## 3.2 — Three Series

- **Id:** `three-series` · **Region:** Study, Series, Instance · **Guide:** The Instance UID ·
  **Time:** ~15 min
- **Question:** Inside a study, what makes a series?
- **The one new idea:** a series is a set of instances of one modality inside a study, named by
  its own UID; its number is a label for people.
- **Teaches:** `series`, `series-instance-uid`, `uid-not-number` · **Names:** none · **Uses:**
  `information-model`, `study`, `study-instance-uid`, `uid`
- **Skill:** `sort-by-series` ("Sort a study's files into series") · **Prerequisites:**
  `sort-by-study`

The lab starts fresh: the player sorts again, one level deeper.

### Lab

Files: `/lab/series/`.

### Objectives

| Id          | Text                                                                          | Check                                                                                    |
| ----------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `by-series` | Under /lab/sorted, make a folder per study and inside it a folder per series. | `{ kind: grouped, files: [<every file of /lab/series>], into: /lab/sorted, by: series }` |

### Beats

- **Scene.** The Instance UID: "One study can hold several runs of the scanner. Each is a
  series."
- **See it.** `go-dicom show <file>::0020,000E` and `::0020,0011` on several files: Series
  Number 1 in two different series [verify the fixture repeats a Series Number across
studies].
- **Build it.** Sort into study folders, then series folders inside them.
- **Watch it.** Predict: "Series Number 1 in both studies: the same series?" — yes / **no: the
  number is for people; the UID decides**.
- **Debrief.** Study, then series, each by its UID. The One Instance names one file of one
  series.
- **Real world.** `go-dicom show <file>::0020,000E`.

### Hints

1. **Nudge:** "Look at Series Number in each file. Can two different series share it?"
2. **The idea:** "A series is named by its Series Instance UID; Series Number can repeat."
3. **The spot:** "Series Instance UID is 0020,000E. Group by study first, then by it."

### Chips

| Command         | Explain                        |
| --------------- | ------------------------------ |
| `go-dicom show` | add `::<tag>` for one element  |
| `mkdir -p`      | make a folder, and its parents |
| `mv`            | move a file into a folder      |

### Codex

- **A series** (`series`, deepens: `information-model`)
- **Series Instance UID** (`series-instance-uid`, deepens: `study-instance-uid`)
- **A UID is not a number** (`uid-not-number`, deepens: `uid`)

### Field Guide

None new.

### Debrief links

PS3.3 §C.7.3.1 (General Series Module); PS3.5 §9 (UIDs).

### Golden runs

- `start` (fails); `by-series-number` (fails); `flat-by-uid` (fails: series folders not
  inside study folders, as `by: series` requires); `nested-by-uid` (passes).

---

## 3.3 — The One Instance

- **Id:** `the-one-instance` · **Region:** Study, Series, Instance · **Guide:** The Instance
  UID · **Time:** ~15 min
- **Question:** How is one object named so that it is never confused with any other?
- **The one new idea:** every instance has its own SOP Instance UID, made once and never
  reused; Instance Number only orders a series for people.
- **Teaches:** `sop-instance-uid`, `instance-number`, `uid-root` · **Names:** `sop-class` ·
  **Uses:** `uid`, `uid-not-number`, `series`, `study`
- **Skill:** `identify-an-instance` ("Find one instance among many by its UID") ·
  **Prerequisites:** `sort-by-series`

The Instance UID speaks about itself: "I have never been anywhere twice." The UID trail
completes Study ▸ Series ▸ SOP Instance.

### Lab

Files: `/lab/ct-explicit-le.dcm`, `/lab/series/`.

### Objectives

| Id           | Text                                                           | Check                                                                    |
| ------------ | -------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `its-number` | Find our instance in /lab/series and give its Instance Number. | `{ kind: answer, file: /lab/series/<our copy>, element: "(0020,0013)" }` |
| `its-series` | Give the Series Instance UID it belongs to.                    | `{ kind: answer, file: /lab/series/<our copy>, element: "(0020,000E)" }` |

### Beats

- **Scene.** The Instance UID: "Our file has a copy in that pile, under another name. Find me."
- **See it.** `go-dicom show /lab/ct-explicit-le.dcm::0008,0018`. SOP Instance UID named. Its
  root named: the first components say who made it; `2.25.` is a root any implementation may
  use, from a UUID (PS3.5 §B.2) [verify the fixtures' root against the manifest].
- **Build it.** Read (0008,0018) in each file of `/lab/series`; the match is our instance.
  Give its Instance Number and its Series Instance UID.
- **Watch it.** Predict: "Two files with Instance Number 1. Same instance?" — yes / **no** /
  only in one study. Instance Number orders, UIDs identify.
- **Debrief.** Study, series, instance: three UIDs place one object anywhere. What It Is,
  Which One It Is asks what kind of object it is.
- **Real world.** `go-dicom show <file>::0008,0018`, and a `for` loop over a folder.

### Hints

1. **Nudge:** "File names don't help. What in each file names the instance?"
2. **The idea:** "Each instance has its own SOP Instance UID. A copy of a file keeps it."
3. **The spot:** "Read 0008,0018 in our file, then in each file of /lab/series."

### Chips

| Command         | Explain                       |
| --------------- | ----------------------------- |
| `go-dicom show` | add `::<tag>` for one element |

### Codex

- **SOP Instance UID** (`sop-instance-uid`, deepens: `series-instance-uid`)
- **Instance Number** (`instance-number`, deepens: `uid-not-number`)
- **A UID's root** (`uid-root`, deepens: `uid`)

### Field Guide

None new.

### Debrief links

PS3.3 §C.12.1 (SOP Common Module); PS3.5 §9 (UIDs) and Annex B (creating UIDs), §B.2 (UUID
derived UIDs).

### Golden runs

- `start` (fails); `wrong-file` (fails: Instance Number of another file); `both` (passes).

---

## 3.4 — What It Is, Which One It Is

- **Id:** `what-it-is-which-one-it-is` · **Region:** SOP Class and instance · **Guide:** The
  Instance UID · **Time:** ~15 min
- **Question:** What tells a reader what kind of object this is, apart from which one it is?
- **The one new idea:** the SOP Class UID says what kind of object it is (CT Image Storage),
  the SOP Instance UID which one; the File Meta Information carries a copy of both.
- **Teaches:** `sop-class`, `iod`, `media-storage-uids` · **Names:** `storage-service` ·
  **Uses:** `sop-instance-uid`, `file-meta-information`, `uid`, `data-dictionary`
- **Skill:** `identify-a-sop-class` ("Say what kind of object a file holds") ·
  **Prerequisites:** `identify-an-instance`

`media-storage-uids` was named in 1.4; here it is taught.

### Lab

Files: `/lab/ct-explicit-le.dcm`.

### Objectives

| Id          | Text                                                       | Check                                                                       |
| ----------- | ---------------------------------------------------------- | --------------------------------------------------------------------------- |
| `class`     | Give the instance's SOP Class UID.                         | `{ kind: answer, file: /lab/ct-explicit-le.dcm, element: "(0008,0016)" }`   |
| `meta-copy` | Mark the File Meta Information's copy of its instance UID. | `{ kind: selected, file: /lab/ct-explicit-le.dcm, element: "(0002,0003)" }` |

### Beats

- **Scene.** The Instance UID: "I say which one. Someone else says what."
- **See it.** `go-dicom show /lab/ct-explicit-le.dcm::0008,0016`: `1.2.840.10008.5.1.4.1.1.2`.
  The guide names it CT Image Storage (PS3.4 §B.5). SOP Class named; IOD named: the CT Image
  IOD lists what a CT object must hold.
- **Build it.** Give the SOP Class UID. Then in group 0002, find (0002,0002) and (0002,0003),
  and mark the instance one.
- **Watch it.** Predict: "Must (0002,0003) equal (0008,0018)?" — **yes: the file's label names
  the object inside** / no. The UID trail shows both.
- **Debrief.** Class is what, instance is which; the file repeats both on its envelope. 64 by
  64 reads the picture.
- **Real world.** `go-dicom show <file>::0008,0016`, `go-dicom show <file>::0002,0002`.

### Hints

1. **Nudge:** "One element near SOP Instance UID names the kind of object."
2. **The idea:** "SOP Class UID says what kind; the File Meta Information repeats the class and
   the instance as Media Storage UIDs."
3. **The spot:** "SOP Class UID is 0008,0016; the File Meta's copy of the instance is
   0002,0003."

### Chips

| Command            | Explain                         |
| ------------------ | ------------------------------- |
| `go-dicom show`    | add `::<tag>` for one element   |
| `go-dicom tag-doc` | the dictionary's name for a tag |

### Codex

- **SOP Class** (`sop-class`, deepens: `sop-instance-uid`)
- **IOD** (`iod`, deepens: `sop-class`)
- **Media Storage SOP Class and Instance UIDs** (`media-storage-uids`, deepens:
  `file-meta-information`)

### Field Guide

None new.

### Debrief links

PS3.4 §B.5 (Standard SOP Classes); PS3.3 §A.3 (CT Image IOD); PS3.10 §7.1; PS3.6 Annex A.

### Golden runs

- `start` (fails); `instance-uid-as-class` (fails); `class-only` (fails: `meta-copy` not
  marked); `both` (passes). A class read from (0002,0002) meets `class`: the value is the same.

---

## 3.5 — 64 by 64

- **Id:** `64-by-64` · **Region:** The pixel attributes · **Guide:** The Instance UID ·
  **Time:** ~15 min
- **Question:** How do a few elements describe the picture in Pixel Data?
- **The one new idea:** Rows, Columns, Samples per Pixel and Photometric Interpretation say how
  to lay out Pixel Data's bytes as a picture; its length follows from them.
- **Teaches:** `rows-columns`, `photometric-interpretation`, `pixel-data` · **Names:**
  `bits-allocated-stored` · **Uses:** `binary-vr`, `long-form`, `value-length`, `sop-class`
- **Skill:** `describe-the-image` ("Describe an image from its pixel elements") ·
  **Prerequisites:** `identify-a-sop-class`

The Lightbox's preview and its side list (Rows, Columns, Bits Allocated, Photometric
Interpretation) are the evidence.

### Lab

Files: `/lab/ct-explicit-le.dcm`.

### Objectives

| Id            | Text                                     | Check                                                                     |
| ------------- | ---------------------------------------- | ------------------------------------------------------------------------- |
| `columns`     | Give the image's width in pixels.        | `{ kind: answer, file: /lab/ct-explicit-le.dcm, element: "(0028,0011)" }` |
| `photometric` | Give how its pixel values become shades. | `{ kind: answer, file: /lab/ct-explicit-le.dcm, element: "(0028,0004)" }` |

### Beats

- **Scene.** The Instance UID: "Pixel Data is 8,192 bytes of numbers. Something has to say
  which way is up."
- **See it.** `go-dicom show /lab/ct-explicit-le.dcm` from (0028,0002) to (0028,0103). Rows and
  Columns named; Samples per Pixel 1 for greyscale; Photometric Interpretation named.
- **Build it.** Give Columns; give Photometric Interpretation.
- **Watch it.** Predict: "Rows 64, Columns 64, 2 bytes a pixel. Pixel Data's length?" — 64 /
  4,096 / **8,192**. 2.3's number, explained. The Lightbox draws the slice.
- **Debrief.** A handful of elements turn bytes into a picture. Numbers into Shades reads what
  the numbers mean.
- **Real world.** `go-dicom convert <file> slice.png --format png`.

### Hints

1. **Nudge:** "The elements of group 0028 describe the image."
2. **The idea:** "Rows is the height, Columns the width; Photometric Interpretation says how
   values become greys or colours."
3. **The spot:** "Columns is 0028,0011; Photometric Interpretation is 0028,0004."

### Chips

| Command            | Explain                                  |
| ------------------ | ---------------------------------------- |
| `go-dicom show`    | every element; group 0028 is the image's |
| `go-dicom convert` | `--format png` writes the picture        |

### Codex

- **Rows and Columns** (`rows-columns`)
- **Photometric Interpretation** (`photometric-interpretation`, deepens: `rows-columns`)
- **Pixel Data** (`pixel-data`, deepens: `binary-vr`)

### Field Guide

`go-dicom convert` (`--format png`).

### Debrief links

PS3.3 §C.7.6.3 (Image Pixel Module) and §C.7.6.3.1.2 (Photometric Interpretation); PS3.5
§8.1.1 (pixel data encoding) [verify section]; PS3.3 §C.8.2.1.

### Golden runs

- `start` (fails); `bits-for-columns` (fails: gives Bits Allocated, 16, as the width);
  `both` (passes). Rows and Columns are both 64, so a player who gives Rows meets `columns`:
  the check is by value, which is right.

---

## 3.6 — Numbers into Shades

- **Id:** `numbers-into-shades` · **Region:** The pixel attributes · **Guide:** The Instance UID
  · **Time:** ~15 min
- **Question:** How does a stored pixel number become a CT value and a shade of grey?
- **The one new idea:** each pixel takes Bits Allocated bits, of which Bits Stored hold the
  value, signed or not; slope and intercept turn it into Hounsfield units, and a window picks
  which of them are drawn as greys.
- **Teaches:** `bits-allocated-stored`, `pixel-representation`, `rescale` · **Names:**
  `window` · **Uses:** `pixel-data`, `photometric-interpretation`, `little-endian`
- **Skill:** `read-ct-values` ("Turn stored pixel values into CT values") · **Prerequisites:**
  `describe-the-image`

`window` stays named: the player tries `--window` and sees the picture change, but no
objective needs it and no mission of 0.1.0 teaches it.

### Lab

Files: `/lab/ct-explicit-le.dcm`.

### Objectives

| Id            | Text                                                          | Check                                                                     |
| ------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `bits-stored` | Give how many bits of each pixel hold its value.              | `{ kind: answer, file: /lab/ct-explicit-le.dcm, element: "(0028,0101)" }` |
| `intercept`   | Give the number added to turn a stored value into a CT value. | `{ kind: answer, file: /lab/ct-explicit-le.dcm, element: "(0028,1052)" }` |

### Beats

- **Scene.** The Instance UID: "Water is 0 and air is about −1000 in a CT. The file stores
  neither number."
- **See it.** Bits Allocated 16, Bits Stored, High Bit, Pixel Representation. CT's rules named
  (PS3.3 §C.8.2.1).
- **Build it.** Give Bits Stored; give Rescale Intercept. The guide works one stored value
  through slope × value + intercept.
- **Watch it.** Predict: "A stored value of 0 with this intercept is…" — 0 HU / **the intercept,
  in HU** / black. Then `go-dicom convert … --format png --window 40,400` and another window:
  the same numbers, other greys.
- **Debrief.** Stored value, CT value, grey: three steps, each in an element. Our Instance puts
  the stage together.
- **Real world.** `go-dicom convert <file> soft.png --format png --window 40,400`.

### Hints

1. **Nudge:** "Look at the elements just after Columns in group 0028."
2. **The idea:** "Bits Stored is how many of the allocated bits are used; Rescale Intercept and
   Slope turn the stored value into Hounsfield units."
3. **The spot:** "Bits Stored is 0028,0101; Rescale Intercept is 0028,1052."

### Chips

| Command            | Explain                                 |
| ------------------ | --------------------------------------- |
| `go-dicom show`    | add `::<tag>` for one element           |
| `go-dicom convert` | `--window center,width` picks the greys |

### Codex

- **Bits Allocated and Bits Stored** (`bits-allocated-stored`, deepens: `pixel-data`)
- **Pixel Representation** (`pixel-representation`, deepens: `bits-allocated-stored`)
- **Rescale Slope and Intercept** (`rescale`, deepens: `pixel-data`)

### Field Guide

`go-dicom convert` (`--window`).

### Debrief links

PS3.3 §C.7.6.3 (Image Pixel Module); PS3.3 §C.8.2.1 (CT Image Module: rescale and HU); PS3.3
§C.11.2 (VOI LUT: window) [verify].

### Golden runs

- `start` (fails); `allocated-for-stored` (fails, unless Bits Stored is 16 in the fixture
  [verify]); `slope-for-intercept` (fails); `both` (passes).

---

## 3.7 — Our Instance (capstone)

- **Id:** `our-instance` · **Region:** The pixel attributes · **Guide:** The Instance UID ·
  **Time:** ~15 min
- **Question:** In a pile of files, can you find our instance, place it in its study and
  series, and describe its image?
- **The one new idea:** none: the stage in one line.
- **Teaches:** none · **Names:** none · **Uses:** `information-model`, `study-instance-uid`,
  `series-instance-uid`, `sop-instance-uid`, `sop-class`, `rows-columns`,
  `photometric-interpretation`, `rescale`
- **Skill:** `place-and-describe-an-instance` ("Place an instance in its study and series, and
  describe it") · **Prerequisites:** `read-ct-values`

One line: "Sort `/lab/series` by study and series, and tell me what our instance is and how
big its picture is."

### Lab

Files: `/lab/ct-explicit-le.dcm`, `/lab/series/`.

### Objectives

| Id       | Text                                            | Check                                                                                    |
| -------- | ----------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `sorted` | Sort /lab/series into study and series folders. | `{ kind: grouped, files: [<every file of /lab/series>], into: /lab/sorted, by: series }` |
| `class`  | Give our instance's SOP Class UID.              | `{ kind: answer, file: /lab/series/<our copy>, element: "(0008,0016)" }`                 |
| `rows`   | Give its height in pixels.                      | `{ kind: answer, file: /lab/series/<our copy>, element: "(0028,0010)" }`                 |

### Beats

- **Scene.** The Instance UID: "Tonight's pile again, shuffled. The archive wants it in order."
- **See it.** `ls /lab/series`.
- **Build it.** One line. The player sorts, finds our copy by (0008,0018), reads its class and
  rows.
- **Watch it.** The UID trail lights Study ▸ Series ▸ SOP Instance for our instance, and the
  Lightbox shows its slice.
- **Debrief.** You can place and describe any instance. The Bridge sends it, and asks what of
  it travels.
- **Real world.** A `for` loop over a folder with `go-dicom show "$f::0020,000D"`.

### Hints

1. **Nudge:** "Start with the study of every file, as in Two Visits."
2. **The idea:** "Study, series and instance each have a UID; our instance is the file whose
   SOP Instance UID matches ct-explicit-le.dcm's."
3. **The spot:** "0020,000D, then 0020,000E for the folders; 0008,0018 to find ours."

### Chips

| Command         | Explain                        |
| --------------- | ------------------------------ |
| `go-dicom show` | add `::<tag>` for one element  |
| `mkdir -p`      | make a folder, and its parents |
| `mv`            | move a file into a folder      |

### Codex

No new cards. **You can now…**:

- sort DICOM files into studies and series by their UIDs;
- find one instance by its SOP Instance UID and say what kind of object it is;
- describe an image from its pixel elements and turn its values into CT values.

### Field Guide

None new.

### Debrief links

PS3.3 §7; PS3.3 §C.12.1; PS3.3 §C.7.6.3.

### Golden runs

- `start` (fails); `study-only` (fails); `all-three` (passes).
