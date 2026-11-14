"""Compare go-dicom's reading of every fixture with pydicom's.

For each file in out/manifest.json this checks, against `go run . -dump`:
the transfer syntax and the encoding it implies, the preamble, every element
of the file meta group and the data set (tag, VR and value, nested sequence
items included) in the DICOM JSON Model of PS3.18 Annex F, and the decoded
pixel array's shape and SHA-256.

Both sides render values in that JSON model, which the standard specifies, so
a difference is a disagreement between the two libraries, not between two
ad hoc formats. Exits 1 on any difference.

Run with `python3 -I scripts/crosscheck.py` from packages/fixtures.
"""

import hashlib
import json
import pathlib
import subprocess
import sys

import numpy
import pydicom

PACKAGE = pathlib.Path(__file__).resolve().parent.parent
OUT = PACKAGE / "out"


def pydicom_dump(path):
    ds = pydicom.dcmread(path)
    dump = {
        "transferSyntaxUid": str(ds.file_meta.TransferSyntaxUID),
        "explicitVr": not ds.is_implicit_VR,
        "littleEndian": ds.is_little_endian,
        "hasPreamble": ds.preamble is not None and len(ds.preamble) == 128,
        "meta": ds.file_meta.to_json_dict(),
        # A threshold above any fixture's size keeps Pixel Data inline, as
        # go-dicom's ToDICOMJSON does, rather than asking for a bulk data URI.
        "dataset": ds.to_json_dict(bulk_data_threshold=1 << 30),
    }
    if "PixelData" in ds:
        pixels = ds.pixel_array
        if pixels.dtype != numpy.uint16:
            raise SystemExit(f"{path}: expected uint16 samples, got {pixels.dtype}")
        # go-dicom always reports [frames, rows, columns]; pydicom drops the
        # frame axis for a single frame.
        frames = int(ds.get("NumberOfFrames", 1) or 1)
        shape = list(pixels.shape) if frames > 1 else [1, *pixels.shape]
        samples = pixels.astype("<u2").tobytes()
        dump["pixels"] = {"shape": shape, "sha256": hashlib.sha256(samples).hexdigest()}
    return dump


def compare(go, py, where, differences):
    if isinstance(go, dict) and isinstance(py, dict):
        for key in sorted(set(go) | set(py)):
            if key not in go:
                differences.append(f"{where}/{key}: only pydicom has it: {short(py[key])}")
            elif key not in py:
                differences.append(f"{where}/{key}: only go-dicom has it: {short(go[key])}")
            else:
                compare(go[key], py[key], f"{where}/{key}", differences)
    elif isinstance(go, list) and isinstance(py, list):
        if len(go) != len(py):
            differences.append(f"{where}: go-dicom has {len(go)} values, pydicom {len(py)}")
        for i, (g, p) in enumerate(zip(go, py)):
            compare(g, p, f"{where}[{i}]", differences)
    elif is_number(go) and is_number(py):
        # DS and IS are JSON numbers in the model; 5 and 5.0 are one value.
        if float(go) != float(py):
            differences.append(f"{where}: go-dicom {go!r}, pydicom {py!r}")
    elif type(go) is not type(py) or go != py:
        differences.append(f"{where}: go-dicom {short(go)}, pydicom {short(py)}")


def is_number(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool)


def short(value):
    text = json.dumps(value, default=str)
    return text if len(text) <= 80 else text[:77] + "..."


def count_elements(dataset):
    total = 0
    for element in dataset.values():
        total += 1
        if element.get("vr") == "SQ":
            for item in element.get("Value", []):
                total += count_elements(item)
    return total


def main():
    manifest = json.loads((OUT / "manifest.json").read_text())
    paths = [f"out/{entry['path']}" for entry in manifest["files"]]

    result = subprocess.run(
        ["go", "run", ".", "-dump", *paths], cwd=PACKAGE, capture_output=True, text=True
    )
    if result.returncode != 0:
        sys.stderr.write(result.stderr)
        raise SystemExit("go-dicom dump failed")
    go_dumps = json.loads(result.stdout)

    failed = 0
    for path in paths:
        go = go_dumps[path]
        py = json.loads(json.dumps(pydicom_dump(PACKAGE / path), default=str))
        differences = []
        compare(go, py, path, differences)
        elements = count_elements(py["meta"]) + count_elements(py["dataset"])
        if differences:
            failed += 1
            print(f"FAIL {path}: {len(differences)} difference(s)")
            for line in differences:
                print(f"  {line}")
        else:
            print(f"ok   {path}: {elements} elements, {py['transferSyntaxUid']}, pixels {py['pixels']['shape']}")

    print(
        f"crosscheck: {len(paths) - failed}/{len(paths)} files agree "
        f"(go-dicom vs pydicom {pydicom.__version__})"
    )
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
