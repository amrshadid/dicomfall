# One Name, Many Values

**Question:** How does one element hold several values?

## Scene

> **VR:** One element, one tag, one name. Not always one value. In The Long Form, Pixel Data held thousands of words as one value. Some text elements hold several separate values instead, under one tag and one length, and the bytes have to keep them apart with no length for each. This is a short mission, after a long one. Read each byte closely, the separators most of all.

## See it

> **VR:** Ask go-dicom for Image Type, `0008,0008`: type `go-dicom show /lab/ct-explicit-le.dcm::0008,0008`.

---

```recorded go-dicom show /lab/ct-explicit-le.dcm::0008,0008
(recorded on the Machine)
```

> **VR:** One element, and words with `\` between them. Select it in the File inspector, at offset 346, and read it in the hex. Tag, then `CS`, then a two-byte length, 22: one run of 22 bytes, with one length. Inside it, the backslash is the byte `5c`, twice. The backslashes split those 22 bytes into three values: `ORIGINAL`, `PRIMARY`, `AXIAL`. 8 letters, 7 and 5, and two separators: 22, even, so no padding.

> **VR:** How many values an element holds is its _Value Multiplicity_, VM, PS3.5 §6.4. The dictionary says how many each tag may hold: one, two, or a range. That is the line marked VM that `tag-doc` printed in Four Bytes of Name. A code string never holds a backslash of its own: PS3.5 allows it only capital letters, digits, the space and the underscore. So the byte is free to separate, and a reader splits the value at every `5c` without asking what the words mean.

## Build it

> **VR:** Look Image Type up: `go-dicom tag-doc 0008,0008`.

---

```recorded go-dicom tag-doc 0008,0008
(recorded on the Machine)
```

> **VR:** Its VM is `2-n`: two values at least, and as many more as needed. This file holds three. The order is part of the meaning: the first value says whether the pixels are original or derived from other pixels. Give every value of Image Type, in order, with `\` between them, as the file writes them.

---

> **VR:** Now look up Pixel Spacing, `0028,0030`, the same way.

---

```recorded go-dicom tag-doc 0028,0030
(recorded on the Machine)
```

> **VR:** VM `2`: exactly two values, never more. The first is the distance between pixel centres from one row to the next, the second from one column to the next, both in millimetres. Its VR is `DS`, a decimal number written as text, so the backslash works the same way here. Find it in the file, and give both values.

---

## Watch it

> **VR:** Pixel Spacing's value is three characters, `5\5`, and its length is 4. Is the backslash counted in the length?
>
> - [x] yes: the length counts every byte of the value
> - no: only the digits count

---

> **VR:** Yes. Three characters, `35 5c 35`, then a space to make the length even: 4. The length counts every byte of the value, separators and padding alike. That is text. A binary element with several values, such as two `US` numbers, has no separator at all: each value takes its fixed size, one after another, and the length is their sum. Two `US` values take 4 bytes.

## Debrief

> **VR:** VM says how many values an element holds; in text, `\` keeps them apart inside one length, and the length counts it. No Letters takes something away from the bytes instead: me, the two letters you have read in every element so far.

## Real world

Print a multi-valued element of your own file, and ask the dictionary how many values it may hold:

```
go-dicom show ct.dcm::0008,0008
go-dicom tag-doc 0028,0030
go-dicom tag-doc -keyword ImageType
```

A file can hold more values than the dictionary allows, and a careful reader checks.
