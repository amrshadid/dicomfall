package main

import (
	"fmt"
	"strconv"

	"github.com/amrshadid/go-dicom/dataelem"
	"github.com/amrshadid/go-dicom/dataset"
	"github.com/amrshadid/go-dicom/network"
	"github.com/amrshadid/go-dicom/sequence"
	"github.com/amrshadid/go-dicom/tag"
	"github.com/amrshadid/go-dicom/uid"
)

var (
	explicitVRLittleEndian = uid.ExplicitVRLittleEndian().String()
	implicitVRLittleEndian = uid.ImplicitVRLittleEndian().String()
)

// ctImageStorage comes from go-dicom's network package because, in v1.8.0,
// uid.CTImageStorage() returns 1.2.840.10008.5.1.4.1.1.2.1, which is Enhanced
// CT Image Storage (PS3.4 B.5), not CT Image Storage.
const ctImageStorage = network.CTImageStorageSOP

// study, series and slice describe one CT image. Everything a viewer would
// group by lives in study and series, so files built from the same values
// sort together and nothing else is needed to tell them apart.
type study struct {
	key          string
	date, time   string
	accession    string
	studyID      string
	description  string
	procedureKey string
}

type series struct {
	key               string
	study             *study
	number            int
	description       string
	time              string
	frameOfReference  string
	windowCenter      int
	windowWidth       int
	convolutionKernel string
}

type slice struct {
	key            string
	series         *series
	instanceNumber int
}

// zPosition puts instances of a series 5 mm apart in the order their Instance
// Numbers give, as a real stack is.
func (s slice) zPosition() int {
	return -5 * (s.instanceNumber - 1)
}

func (s slice) sopInstanceUID() string {
	return fixtureUID(s.key + "/sop-instance")
}

func (s *series) uid() string { return fixtureUID(s.key + "/series") }

func (s *study) uid() string { return fixtureUID(s.key + "/study") }

type element struct {
	keyword string
	vr      dataelem.VR
	value   any
}

// build assembles the instance as a go-dicom data set. The VR is stated for
// each element rather than taken from the dictionary because several (Pixel
// Data among them) are ambiguous there and a file must commit to one.
func (s slice) build() (*dataset.Dataset, error) {
	se := s.series
	st := se.study
	date := st.date
	z := strconv.Itoa(s.zPosition())

	elements := []element{
		{"SpecificCharacterSet", dataelem.CS, "ISO_IR 100"},
		{"ImageType", dataelem.CS, []string{"ORIGINAL", "PRIMARY", "AXIAL"}},
		{"InstanceCreationDate", dataelem.DA, date},
		{"InstanceCreationTime", dataelem.TM, se.time},
		{"SOPClassUID", dataelem.UI, ctImageStorage},
		{"SOPInstanceUID", dataelem.UI, s.sopInstanceUID()},
		{"StudyDate", dataelem.DA, date},
		{"SeriesDate", dataelem.DA, date},
		{"AcquisitionDate", dataelem.DA, date},
		{"ContentDate", dataelem.DA, date},
		{"StudyTime", dataelem.TM, st.time},
		{"SeriesTime", dataelem.TM, se.time},
		{"AcquisitionTime", dataelem.TM, se.time},
		{"ContentTime", dataelem.TM, se.time},
		{"AccessionNumber", dataelem.SH, st.accession},
		{"Modality", dataelem.CS, "CT"},
		{"Manufacturer", dataelem.LO, "DICOMFall Synthetic Imaging"},
		{"InstitutionName", dataelem.LO, "DICOMFall Teaching Lab"},
		// Type 2: present and empty, so the file shows a zero-length value.
		{"ReferringPhysicianName", dataelem.PN, ""},
		{"StationName", dataelem.SH, "DF-CT-01"},
		{"StudyDescription", dataelem.LO, st.description},
		{"SeriesDescription", dataelem.LO, se.description},
		{"ManufacturerModelName", dataelem.LO, "Fall-1"},
		{"PatientName", dataelem.PN, "FALL^DICOM"},
		{"PatientID", dataelem.LO, "DF-0001"},
		{"PatientBirthDate", dataelem.DA, "19700101"},
		{"PatientSex", dataelem.CS, "O"},
		{"SliceThickness", dataelem.DS, "5"},
		{"KVP", dataelem.DS, "120"},
		{"DeviceSerialNumber", dataelem.LO, "DF-0000001"},
		{"ReconstructionDiameter", dataelem.DS, "320"},
		{"XRayTubeCurrent", dataelem.IS, "200"},
		{"ConvolutionKernel", dataelem.SH, se.convolutionKernel},
		{"PatientPosition", dataelem.CS, "HFS"},
		{"StudyInstanceUID", dataelem.UI, st.uid()},
		{"SeriesInstanceUID", dataelem.UI, se.uid()},
		{"StudyID", dataelem.SH, st.studyID},
		{"SeriesNumber", dataelem.IS, strconv.Itoa(se.number)},
		{"AcquisitionNumber", dataelem.IS, "1"},
		{"InstanceNumber", dataelem.IS, strconv.Itoa(s.instanceNumber)},
		{"ImagePositionPatient", dataelem.DS, []string{"-160", "-160", z}},
		{"ImageOrientationPatient", dataelem.DS, []string{"1", "0", "0", "0", "1", "0"}},
		{"FrameOfReferenceUID", dataelem.UI, fixtureUID(se.frameOfReference + "/frame-of-reference")},
		{"PositionReferenceIndicator", dataelem.LO, ""},
		{"SliceLocation", dataelem.DS, z},
		{"SamplesPerPixel", dataelem.US, uint16(1)},
		{"PhotometricInterpretation", dataelem.CS, "MONOCHROME2"},
		{"Rows", dataelem.US, uint16(imageSize)},
		{"Columns", dataelem.US, uint16(imageSize)},
		{"PixelSpacing", dataelem.DS, []string{"5", "5"}},
		{"BitsAllocated", dataelem.US, uint16(16)},
		{"BitsStored", dataelem.US, uint16(12)},
		{"HighBit", dataelem.US, uint16(11)},
		{"PixelRepresentation", dataelem.US, uint16(0)},
		{"WindowCenter", dataelem.DS, strconv.Itoa(se.windowCenter)},
		{"WindowWidth", dataelem.DS, strconv.Itoa(se.windowWidth)},
		{"RescaleIntercept", dataelem.DS, "-1024"},
		{"RescaleSlope", dataelem.DS, "1"},
		{"RescaleType", dataelem.LO, "HU"},
		{"PixelData", dataelem.OW, phantom(s.instanceNumber)},
	}

	ds := dataset.NewDataset()
	if err := addAll(ds, elements); err != nil {
		return nil, err
	}

	// A code from a private coding scheme ("99" prefix, PS3.16 8.2) so the
	// fixture never claims to be a real procedure in a real terminology.
	code := dataset.NewDataset()
	if err := addAll(code, []element{
		{"CodeValue", dataelem.SH, st.procedureKey},
		{"CodingSchemeDesignator", dataelem.SH, "99DFALL"},
		{"CodeMeaning", dataelem.LO, "CT phantom, synthetic"},
	}); err != nil {
		return nil, err
	}
	if err := ds.AddSequence(keywordTag("ProcedureCodeSequence"), sequence.NewFromItems(code)); err != nil {
		return nil, err
	}
	return ds, nil
}

func keywordTag(keyword string) tag.Tag {
	t := tag.GlobalDictionary().GetByKeyword(keyword)
	if t == 0 {
		panic(fmt.Sprintf("keyword %q is not in go-dicom's dictionary", keyword))
	}
	return t
}

func addAll(ds *dataset.Dataset, elements []element) error {
	for _, e := range elements {
		if err := ds.AddByKeyword(e.keyword, e.vr, e.value); err != nil {
			return fmt.Errorf("%s: %w", e.keyword, err)
		}
	}
	return nil
}

var (
	firstStudy = &study{
		key: "ct", date: "20260105", time: "093000", accession: "DFA0001",
		studyID: "1", description: "Synthetic phantom", procedureKey: "DF-CT-PHANTOM",
	}
	firstSeries = &series{
		key: "ct", study: firstStudy, number: 1, description: "Axial phantom",
		time: "093512", frameOfReference: "ct", windowCenter: 40, windowWidth: 400,
		convolutionKernel: "STANDARD",
	}

	// The CT instance the game follows from disk to the archive.
	theInstance = slice{key: "ct", series: firstSeries, instanceNumber: 1}
)

var (
	followUp = &study{
		key: "series/study-a", date: "20260210", time: "101500", accession: "DFA0002",
		studyID: "2", description: "Synthetic phantom, follow-up", procedureKey: "DF-CT-PHANTOM",
	}
	followUpSoft = &series{
		key: "series/series-a1", study: followUp, number: 1, description: "Axial phantom",
		time: "102040", frameOfReference: "series/study-a", windowCenter: 40, windowWidth: 400,
		convolutionKernel: "STANDARD",
	}
	// Same acquisition, so same frame of reference, reconstructed again.
	followUpBone = &series{
		key: "series/series-a2", study: followUp, number: 2, description: "Axial phantom, bone",
		time: "102040", frameOfReference: "series/study-a", windowCenter: 500, windowWidth: 2000,
		convolutionKernel: "BONE",
	}
	recheck = &study{
		key: "series/study-b", date: "20260312", time: "141000", accession: "DFA0003",
		studyID: "3", description: "Synthetic phantom, recheck", procedureKey: "DF-CT-PHANTOM",
	}
	recheckSoft = &series{
		key: "series/series-b1", study: recheck, number: 1, description: "Axial phantom",
		time: "141322", frameOfReference: "series/study-b", windowCenter: 40, windowWidth: 400,
		convolutionKernel: "STANDARD",
	}
)

// sortingSet is the UID exercise. File names are neutral and interleave the
// groups, so only the UIDs inside say which study and series a file is in.
var sortingSet = []struct {
	name  string
	slice slice
}{
	{"series/f01.dcm", slice{"series/f01", recheckSoft, 12}},
	{"series/f02.dcm", slice{"series/f02", followUpSoft, 7}},
	{"series/f03.dcm", slice{"series/f03", followUpBone, 3}},
	{"series/f04.dcm", slice{"series/f04", recheckSoft, 5}},
	{"series/f05.dcm", slice{"series/f05", followUpSoft, 2}},
	{"series/f06.dcm", slice{"series/f06", followUpBone, 9}},
}
