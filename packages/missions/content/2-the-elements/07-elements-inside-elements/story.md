# Elements Inside Elements

**Question:** How does one element hold whole sets of other elements?

## Scene

> **VR:** Most of my kind say how a value is written. One does not. `SQ`, which you met in The Long Form and counted in The Same Object Twice, holds no value of its own: it holds elements. Whole sets of them, each element with its own tag, VR and length, all inside one element of the Data Set. A reader that cannot open it skips the whole thing by its length. Today you open it.

## See it

> **VR:** Print every element of the explicit file: `go-dicom show /lab/ct-explicit-le.dcm`.

---

```recorded go-dicom show /lab/ct-explicit-le.dcm
(recorded on the Machine)
```

> **VR:** A few lines are indented, under Procedure Code Sequence, `0008,1032`, whose VR is `SQ`. Now ask for the file without them: `go-dicom show --top /lab/ct-explicit-le.dcm`.

---

```recorded go-dicom show --top /lab/ct-explicit-le.dcm
(recorded on the Machine)
```

> **VR:** The indented lines are gone and the `SQ` line stays: `--top` prints only the elements that sit in no sequence. The indented ones belong to the sequence, and the tree in the File inspector folds them under it. Open the fold, and select the `SQ` row in the tree.

---

> **VR:** In the hex, at offset 754: the tag, then `53 51`, `SQ`, then `00 00` and a four-byte length, 76: the long form. Then `fe ff 00 e0`: the tag `FFFE,E000`, an _item_. An item is one set of elements inside a _sequence_. Its four-byte length, `44 00 00 00`, is 68, and it has no VR at all, PS3.5 §7.5.

## Build it

> **VR:** Mark the whole sequence element, from its tag to the last byte of its value.

---

> **VR:** Now mark its first item, from `fe ff 00 e0` to its last byte.

---

> **VR:** That is the item: its tag and length, eight bytes, then its value, which here runs to where the sequence ends. This sequence holds one item, and the item holds three elements: Code Value, Coding Scheme Designator and Code Meaning, which together name a procedure. Give the value of Code Value, `0008,0100`, inside the item.

---

> **VR:** Inside an item, every element reads as any other: tag, VR, length, value, in tag order. Only where it lives has changed. The item's length, 68, counts every byte of its three elements, and the sequence's length, 76, is the item's 8 bytes of tag and length, plus those 68.

## Watch it

> **VR:** Here every length is written down. A writer may also give a sequence or an item the length `ff ff ff ff`. How does a reader find its end then?
>
> - it reads about 4 GB
> - [x] it reads on until a delimitation item
> - it reads to the end of the file

---

> **VR:** `FFFFFFFF` is _undefined length_, PS3.5 §7.1.1. An item of undefined length ends with an Item Delimitation Item, tag `FFFE,E00D`; a sequence of undefined length ends with a Sequence Delimitation Item, `FFFE,E0DD`. Each is a tag and a length of zero. go-dicom writes every length defined, so neither file here holds one: you will meet them in files from other writers.

## Debrief

> **VR:** A sequence is an element of elements: items, each a small set of elements, nested as deep as needed. Tag, VR and length still rule inside, and the sequence's length steps over all of it. The capstone, Read Any Element, reads any element of a file by hand.

## Real world

Find the sequences in your own file: print it whole, then without the elements nested in them.

```
go-dicom show ct.dcm
go-dicom show --top ct.dcm
```

A line that is in the first listing and not the second sits inside a sequence.
