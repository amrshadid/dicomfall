package main

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"os"
	"path/filepath"
	"reflect"
	"strconv"
	"strings"
	"testing"

	"github.com/amrshadid/go-dicom/dataset"
	"github.com/amrshadid/go-dicom/filebase"
	"github.com/amrshadid/go-dicom/filereader"
	"github.com/amrshadid/go-dicom/uid"
)

const outDir = "out"

func TestGenerateIsDeterministic(t *testing.T) {
	first, err := generate()
	if err != nil {
		t.Fatal(err)
	}
	second, err := generate()
	if err != nil {
		t.Fatal(err)
	}
	if len(first) != len(second) {
		t.Fatalf("file count changed between runs: %d then %d", len(first), len(second))
	}
	for i := range first {
		if !bytes.Equal(first[i].data, second[i].data) {
			t.Errorf("%s differs between two runs", first[i].entry.Path)
		}
	}
}

// The committed files must be what the generator makes today, or the game is
// teaching from bytes nobody can reproduce.
func TestCommittedOutputIsCurrent(t *testing.T) {
	files, err := generate()
	if err != nil {
		t.Fatal(err)
	}
	for _, f := range files {
		onDisk, err := os.ReadFile(filepath.Join(outDir, filepath.FromSlash(f.entry.Path)))
		if err != nil {
			t.Fatal(err)
		}
		if !bytes.Equal(onDisk, f.data) {
			t.Errorf("out/%s is stale: run `go run . -out out`", f.entry.Path)
		}
	}
	want, err := marshalManifest(manifestOf(files))
	if err != nil {
		t.Fatal(err)
	}
	got, err := os.ReadFile(filepath.Join(outDir, "manifest.json"))
	if err != nil {
		t.Fatal(err)
	}
	if !bytes.Equal(got, want) {
		t.Error("out/manifest.json is stale: run `go run . -out out`")
	}
}

func readManifest(t *testing.T) Manifest {
	t.Helper()
	b, err := os.ReadFile(filepath.Join(outDir, "manifest.json"))
	if err != nil {
		t.Fatal(err)
	}
	var m Manifest
	if err := json.Unmarshal(b, &m); err != nil {
		t.Fatal(err)
	}
	return m
}

func readFixture(t *testing.T, path string) ([]byte, *filereader.DICOMFile, *dataset.Dataset) {
	t.Helper()
	data, err := os.ReadFile(filepath.Join(outDir, filepath.FromSlash(path)))
	if err != nil {
		t.Fatal(err)
	}
	f, err := filereader.ReadDICOMFile(filebase.NewFileReader(bytes.NewReader(data)))
	if err != nil {
		t.Fatalf("%s: %v", path, err)
	}
	return data, f, f.GetDataset()
}

func TestOutputsMatchManifest(t *testing.T) {
	m := readManifest(t)
	if len(m.Files) != 2+len(sortingSet) {
		t.Fatalf("manifest lists %d files, want %d", len(m.Files), 2+len(sortingSet))
	}
	for _, e := range m.Files {
		t.Run(e.Path, func(t *testing.T) {
			data, f, ds := readFixture(t, e.Path)

			if len(data) != e.Size {
				t.Errorf("size %d, manifest says %d", len(data), e.Size)
			}
			sum := sha256.Sum256(data)
			if got := hex.EncodeToString(sum[:]); got != e.SHA256 {
				t.Errorf("sha256 %s, manifest says %s", got, e.SHA256)
			}

			if !f.HasPreamble || !bytes.Equal(data[:128], make([]byte, 128)) || string(data[128:132]) != "DICM" {
				t.Error("not a Part 10 file with a zero preamble and DICM prefix")
			}
			fm := f.FileMetaInfo
			checks := []struct{ name, got, want string }{
				{"MediaStorageSOPClassUID", fm.MediaStorageSOPClassUID, e.SOPClassUID},
				{"MediaStorageSOPInstanceUID", fm.MediaStorageSOPInstanceUID, e.SOPInstanceUID},
				{"TransferSyntaxUID", fm.TransferSyntaxUID, e.TransferSyntaxUID},
				{"SOPClassUID", ds.GetStringByKeyword("SOPClassUID"), e.SOPClassUID},
				{"SOPInstanceUID", ds.GetStringByKeyword("SOPInstanceUID"), e.SOPInstanceUID},
				{"StudyInstanceUID", ds.GetStringByKeyword("StudyInstanceUID"), e.StudyInstanceUID},
				{"SeriesInstanceUID", ds.GetStringByKeyword("SeriesInstanceUID"), e.SeriesInstanceUID},
			}
			for _, c := range checks {
				if c.got != c.want {
					t.Errorf("%s = %q, manifest says %q", c.name, c.got, c.want)
				}
			}
			if e.SOPClassUID != "1.2.840.10008.5.1.4.1.1.2" {
				t.Errorf("SOP Class %s is not CT Image Storage", e.SOPClassUID)
			}
			for _, u := range []string{e.SOPInstanceUID, e.StudyInstanceUID, e.SeriesInstanceUID} {
				if !strings.HasPrefix(u, "2.25.") || !uid.New(u).IsValid() || len(u) > 64 {
					t.Errorf("UID %q is not a valid 2.25 UID", u)
				}
			}
			wantExplicit := e.TransferSyntaxUID == explicitVRLittleEndian
			if f.ExplicitVR != wantExplicit || !f.IsLittleEndian {
				t.Errorf("read as explicit=%v little=%v for %s", f.ExplicitVR, f.IsLittleEndian, e.TransferSyntaxUID)
			}
		})
	}
}

func TestPixelsAreThePhantom(t *testing.T) {
	for _, e := range readManifest(t).Files {
		_, _, ds := readFixture(t, e.Path)
		n, err := strconv.Atoi(ds.GetStringByKeyword("InstanceNumber"))
		if err != nil {
			t.Fatalf("%s: InstanceNumber: %v", e.Path, err)
		}
		arr, err := ds.PixelArray()
		if err != nil {
			t.Fatalf("%s: %v", e.Path, err)
		}
		frames := arr.([][][]uint16)
		want := phantom(n)
		var got []uint16
		for _, row := range frames[0] {
			got = append(got, row...)
		}
		if len(frames) != 1 || !reflect.DeepEqual(got, want) {
			t.Errorf("%s: decoded pixels are not phantom(%d)", e.Path, n)
		}
	}
}

// The two encodings must differ only in how they are encoded: same elements,
// same VRs, same values, same pixels.
func TestEncodingsHoldTheSameObject(t *testing.T) {
	var dumps []*FileDump
	for _, p := range []string{"ct-explicit-le.dcm", "ct-implicit-le.dcm"} {
		data, err := os.ReadFile(filepath.Join(outDir, p))
		if err != nil {
			t.Fatal(err)
		}
		d, err := dumpFile(data)
		if err != nil {
			t.Fatal(err)
		}
		dumps = append(dumps, d)
	}
	explicit, implicit := dumps[0], dumps[1]
	if !explicit.ExplicitVR || implicit.ExplicitVR {
		t.Errorf("explicit file read as explicit=%v, implicit file as explicit=%v", explicit.ExplicitVR, implicit.ExplicitVR)
	}
	a, _ := json.Marshal(explicit.Dataset)
	b, _ := json.Marshal(implicit.Dataset)
	if !bytes.Equal(a, b) {
		t.Error("the explicit and implicit files hold different data sets")
	}
	if !reflect.DeepEqual(explicit.Pixels, implicit.Pixels) {
		t.Error("the explicit and implicit files hold different pixels")
	}
}

func TestSortingSetShape(t *testing.T) {
	studies := map[string]bool{}
	series := map[string]string{}
	instances := map[string]bool{}
	numbers := map[int]bool{}
	studyDates := map[string]map[string]bool{}
	seriesNumbers := map[string]map[string]bool{}
	ours := 0
	main, err := os.ReadFile(filepath.Join(outDir, "ct-explicit-le.dcm"))
	if err != nil {
		t.Fatal(err)
	}
	for _, e := range readManifest(t).Files {
		if !strings.HasPrefix(e.Path, "series/") {
			continue
		}
		data, _, ds := readFixture(t, e.Path)
		if e.SOPInstanceUID == theInstance.sopInstanceUID() {
			ours++
			if !bytes.Equal(data, main) {
				t.Errorf("%s holds our instance but is not the same bytes as ct-explicit-le.dcm", e.Path)
			}
		}
		addTo(studyDates, ds.GetStringByKeyword("StudyDate"), e.StudyInstanceUID)
		addTo(seriesNumbers, ds.GetStringByKeyword("SeriesNumber"), e.StudyInstanceUID)
		studies[e.StudyInstanceUID] = true
		if s, ok := series[e.SeriesInstanceUID]; ok && s != e.StudyInstanceUID {
			t.Errorf("series %s appears in two studies", e.SeriesInstanceUID)
		}
		series[e.SeriesInstanceUID] = e.StudyInstanceUID
		if instances[e.SOPInstanceUID] {
			t.Errorf("SOP Instance UID %s is used twice", e.SOPInstanceUID)
		}
		instances[e.SOPInstanceUID] = true
		n, _ := strconv.Atoi(ds.GetStringByKeyword("InstanceNumber"))
		numbers[n] = true
	}
	if len(instances) != 6 || len(studies) != 2 || len(series) != 3 {
		t.Errorf("sorting set has %d files, %d studies, %d series; want 6, 2, 3",
			len(instances), len(studies), len(series))
	}
	if len(numbers) != len(instances) {
		t.Errorf("Instance Numbers repeat: %v", numbers)
	}
	if ours != 1 {
		t.Errorf("our instance is in %d files of the sorting set, want 1", ours)
	}
	if !anyShared(studyDates) {
		t.Error("no Study Date is shared by two studies, so dates could sort the pile")
	}
	if !anyShared(seriesNumbers) {
		t.Error("no Series Number repeats across studies, so numbers could sort the pile")
	}
}

func addTo(m map[string]map[string]bool, key, studyUID string) {
	if m[key] == nil {
		m[key] = map[string]bool{}
	}
	m[key][studyUID] = true
}

func anyShared(m map[string]map[string]bool) bool {
	for _, studies := range m {
		if len(studies) > 1 {
			return true
		}
	}
	return false
}

// Stage 2 shows the padding byte of an odd-length Patient's Name.
func TestPatientNameIsOddAndShared(t *testing.T) {
	for _, e := range readManifest(t).Files {
		_, _, ds := readFixture(t, e.Path)
		name := ds.GetStringByKeyword("PatientName")
		if name != "FALLS^DICOM" || len(name)%2 == 0 {
			t.Errorf("%s: Patient's Name %q, want the one odd-length name", e.Path, name)
		}
	}
}
