# What the File Says

**Question:** What does a DICOM file hold, and how do you read it?

## Scene

> **The Preamble:** Evening, engineer. I am the Preamble: the first 128 bytes of tonight's file, and there is nothing in me. The rest of the file is full. It holds one CT slice that has to reach the archive tonight, and nobody sends a file they cannot read. The patient is fictional, made up for this lab. So we read the file, starting the gentle way.

## See it

> **The Preamble:** You are root at the console, the prompt that reads `workstation:~#`. See what is on the disk: type `ls -l /lab`.

---

```recorded ls -l /lab
total 10
-rw-r--r--    1 root     root          9648 Jan  1  1970 ct-explicit-le.dcm
drwxr-xr-x    3 root     root             0 Jan  1  1970 fixtures
```

> **The Preamble:** One file, `ct-explicit-le.dcm`, 9648 bytes long. A byte is the smallest piece a file is counted in; the next mission looks at them one by one. Now ask go-dicom, the tool you work with, for a summary: `go-dicom info /lab/ct-explicit-le.dcm`.

---

```recorded go-dicom info /lab/ct-explicit-le.dcm
=== DICOM File Information ===
File:         /lab/ct-explicit-le.dcm
Size:         9648 bytes
Modified:     1970-01-01 00:00:00

Key DICOM Elements:
─────────────────────────────────────
Patient Name:    FALLS^DICOM
Patient ID:      DF-0001
Study Date:      20260105
Modality:        CT
Study Desc:      Synthetic phantom
Series Desc:     Axial phantom

Image Dimensions:
─────────────────────────────────────
Rows:            64
Columns:         64
```

> **The Preamble:** A patient's name, an ID, a date, a modality, and 64 rows by 64 columns: the picture is 64 pixels high and 64 wide. The Lightbox on the right draws it.

> **The Preamble:** Apart from the file's name, size and date, which come from the disk, `info` read those lines from the file itself. A photo file carries its pixels and little else; this file also says whose picture it is, when it was taken and how it was made, so an archive can file it and a viewer can show it correctly.

> **The Preamble:** That is what DICOM is for. Digital Imaging and Communications in Medicine is the standard for medical images and the information that goes with them, in files and on networks, so that a scanner, an archive and a viewer from different makers all read the same thing.

## Build it

> **The Preamble:** `info` picked a few lines. Now print all of them: `go-dicom show /lab/ct-explicit-le.dcm`.

---

```recorded go-dicom show /lab/ct-explicit-le.dcm
=== DICOM File: /lab/ct-explicit-le.dcm ===
Tag          VR  Length  Value
─────────────────────────────────────────────
0002,0001    OB  2       <2 bytes>
0002,0002    UI  26      1.2.840.10008.5.1.4.1.1.2
0002,0003    UI  44      2.25.251886266211036739612775034372164643306
0002,0010    UI  20      1.2.840.10008.1.2.1
0002,0012    UI  26      1.2.826.0.1.3680043.10.511
0002,0013    SH  14      GO-DICOM-1.8.0
0008,0005    CS  10      ISO_IR 100
0008,0008    CS  22      ORIGINAL\PRIMARY\AXIAL
0008,0012    DA  8       20260105
0008,0013    TM  6       093512
0008,0016    UI  26      1.2.840.10008.5.1.4.1.1.2
0008,0018    UI  44      2.25.251886266211036739612775034372164643306
0008,0020    DA  8       20260105
0008,0021    DA  8       20260105
0008,0022    DA  8       20260105
0008,0023    DA  8       20260105
0008,0030    TM  6       093000
0008,0031    TM  6       093512
0008,0032    TM  6       093512
0008,0033    TM  6       093512
0008,0050    SH  8       DFA0001
0008,0060    CS  2       CT
0008,0070    LO  28      DICOMFall Synthetic Imaging
0008,0080    LO  22      DICOMFall Teaching Lab
0008,0090    PN  0
0008,1010    SH  8       DF-CT-01
0008,1030    LO  18      Synthetic phantom
0008,1032    SQ  0
0008,0100    SH  14        DF-CT-PHANTOM
0008,0102    SH  8         99DFALL
0008,0104    LO  22        CT phantom, synthetic
0008,103E    LO  14      Axial phantom
0008,1090    LO  6       Fall-1
0010,0010    PN  12      FALLS^DICOM
0010,0020    LO  8       DF-0001
0010,0030    DA  8       19700101
0010,0040    CS  2       O
0018,0050    DS  2       5
0018,0060    DS  4       120
0018,1000    LO  10      DF-0000001
0018,1100    DS  4       320
0018,1151    IS  4       200
0018,1210    SH  8       STANDARD
0018,5100    CS  4       HFS
0020,000D    UI  44      2.25.244689099060892268776675746833514200113
0020,000E    UI  44      2.25.262811267488977860285166554097588707013
0020,0010    SH  2       1
0020,0011    IS  2       1
0020,0012    IS  2       1
0020,0013    IS  2       1
0020,0032    DS  12      -160\-160\0
0020,0037    DS  12      1\0\0\0\1\0
0020,0052    UI  44      2.25.96400224657394843332902432048480078343
0020,1040    LO  0
0020,1041    DS  2       0
0028,0002    US  2       1
0028,0004    CS  12      MONOCHROME2
0028,0010    US  2       64
0028,0011    US  2       64
0028,0030    DS  4       5\5
0028,0100    US  2       16
0028,0101    US  2       12
0028,0102    US  2       11
0028,0103    US  2       0
0028,1050    DS  2       40
0028,1051    DS  4       400
0028,1052    DS  6       -1024
0028,1053    DS  2       1
0028,1054    LO  2       HU
7FE0,0010    OW  8192    <100 bytes>... (8192 bytes)
```

> **The Preamble:** One line per _element_: one numbered entry of the file, with a value. `Tag` is the element's number, `VR` two letters for the kind of value, `Length` how many bytes the value takes, and `Value` the value itself. A sequence's line shows 0; stage 2 says why. Stage 2 opens the tag and the VR; for now, a number and a value.

> **The Preamble:** The line tagged `0008,0060` is Modality: the kind of equipment that made the picture. Give its value beside the objective.

---

> **The Preamble:** `CT`, computed tomography: X-rays taken from all around the body, turned into slices. Now the line tagged `0010,0010`, Patient's Name. Give it the same way.

---

> **The Preamble:** `FALLS^DICOM`. The `^` separates the family name from the given name.

## Watch it

> **The Preamble:** Every line was short, yet the file is 9648 bytes. Where is the picture in this list?
>
> - nowhere: the Lightbox draws it from somewhere else
> - [x] in one element near the end, with a very long value
> - spread over every element

---

> **The Preamble:** Look at the last line of `show`: tag `7FE0,0010`, Pixel Data, with a length of 8192; go-dicom shows only the size of a binary value. That is 64 times 64 pixels, two bytes each: the same bytes the Lightbox drew. The picture is one element among the others. The rest describe it: whose it is, when, from which equipment, how big. Stage 3 reads how they describe it.

## Debrief

> **The Preamble:** A DICOM file holds one object, and the object is a list of elements: a number and a value each, the picture among them. go-dicom read them for you, and printed what it understood. In Under the Words, you read them without its help.

## Real world

With go-dicom installed, on any DICOM file of your own:

```
go-dicom info ct.dcm
go-dicom show ct.dcm
go-dicom show ct.dcm --top
```

`--top` leaves out the elements nested inside other elements, which stage 2 opens.
