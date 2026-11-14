// go-dicom comes only from its published GitHub releases, pinned by version and by the SHA-256
// the release's own SHA256SUMS gives. It is never built, patched or taken from anywhere else.

/** v86 emulates a 32-bit PC: the only build that runs on it. */
export const GO_DICOM_ASSET = 'go-dicom-linux-386'

export const GO_DICOM_RELEASES = 'https://github.com/amrshadid/go-dicom/releases/download'

/** The lock's `goDicom` entry. */
export interface GoDicomPin {
  /** The release, without its tag's `v`: `1.9.0`. */
  readonly version: string
  /** Always `go-dicom-linux-386`. */
  readonly asset: string
  /** `https://github.com/amrshadid/go-dicom/releases/download/v<version>/go-dicom-linux-386`. */
  readonly url: string
  /** The asset's line in the release's SHA256SUMS. */
  readonly sha256: string
}

export const goDicomUrl = (version: string): string => `${GO_DICOM_RELEASES}/v${version}/${GO_DICOM_ASSET}`

/** The name a pinned binary is cached and mirrored under: one per release. */
export const goDicomFileName = (version: string): string => `go-dicom-v${version}-linux-386`

/** Every problem with the lock's entry; none means the build may download it. */
export function goDicomPinProblems(pin: unknown): string[] {
  if (typeof pin !== 'object' || pin === null) {
    return ['goDicom: expected { version, asset, url, sha256 } or null']
  }
  const { version, asset, url, sha256 } = pin as Record<string, unknown>
  const problems: string[] = []
  if (typeof version !== 'string' || !/^\d+\.\d+\.\d+$/.test(version)) {
    problems.push(`goDicom.version: expected a release like 1.9.0, got ${JSON.stringify(version)}`)
  }
  if (asset !== GO_DICOM_ASSET) {
    problems.push(`goDicom.asset: expected ${GO_DICOM_ASSET} (v86 is 32-bit x86), got ${JSON.stringify(asset)}`)
  }
  if (typeof version === 'string' && url !== goDicomUrl(version)) {
    problems.push(`goDicom.url: expected ${goDicomUrl(version)}, got ${JSON.stringify(url)}`)
  }
  if (typeof sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(sha256)) {
    problems.push('goDicom.sha256: expected the 64 hex digits of the asset’s line in SHA256SUMS')
  }
  return problems
}

const ELF_MAGIC = [0x7f, 0x45, 0x4c, 0x46]
const ELF_CLASS_32 = 1
const EM_386 = 3

/** A Linux binary for 32-bit x86: the ELF header says so (EI_CLASS 1, e_machine EM_386). */
export function isLinux386Elf(data: Uint8Array): boolean {
  const machine = (data[18] ?? 0) | ((data[19] ?? 0) << 8)
  return ELF_MAGIC.every((byte, at) => data[at] === byte) && data[4] === ELF_CLASS_32 && machine === EM_386
}
