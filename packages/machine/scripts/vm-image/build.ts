// Builds the Linux image the game's VM boots: Alpine x86 from pinned packages, the synthetic
// fixtures, and go-dicom's release binary when the lock pins one.
// Usage: pnpm vm:image [--update] [--mirror-out <dir>] [--out <dir>]
//   --update             re-pins Alpine's versions and checksums in vm-image.lock.json (never go-dicom's)
//   --mirror-out <dir>   also writes every pinned download there, flat, for the mirror release
//   --out <dir>          writes the image there instead of apps/web/public/vm
// Downloads fall back to the mirror (DF_VM_MIRROR, default DEFAULT_MIRROR) when upstream lacks them.
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve as resolvePath } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gunzipSync } from 'node:zlib'
import { LAB_FIXTURES_DIR } from '#types/definitions/network'
import { VM_BASHRC, VM_CMDLINE, VM_GO_DICOM, VM_HOSTNAME, VM_SHELL, type VmManifest } from '#types/definitions/vm'
import { indexFromApkIndex, installedNames, type PackageIndex, parseIndex, resolve, sha256 } from '#vm-image/alpine'
import { type ArchiveEntry, readTarGz, writeCpioGz } from '#vm-image/archive'
import { GO_DICOM_ASSET, type GoDicomPin, goDicomFileName, goDicomPinProblems, isLinux386Elf } from '#vm-image/go-dicom'
import { BASHRC, CONTROL, guestFile, INIT, INITTAB, RC, SHELL } from '#vm-image/guest-files'
import { fetchPinnedFile, mirrorBase, writeMirror } from '#vm-image/mirror'
import { mergeTree, writeV86Fs } from '#vm-image/v86-fs'

const ALPINE = 'https://dl-cdn.alpinelinux.org/alpine/v3.24'
const MINIROOTFS = 'alpine-minirootfs-3.24.3-x86.tar.gz'
const KERNEL_PACKAGE = 'linux-virt'
// iproute2 has `ip netns` and veth, which BusyBox's ip lacks; iproute2-tc has netem, the fault that
// loses a link's packets while it stays up; tcpdump shows the PDUs on a link. bash is the console's
// shell; busybox-static is the initramfs's.
const PACKAGES = ['bash', 'iproute2', 'iproute2-tc', 'tcpdump', 'busybox-static']
// The kernel package wants mkinitfs; this build makes the initramfs itself.
const NOT_INSTALLED = ['initramfs-generator']
// modules.dep order: each one after what it needs.
const INITRAMFS_MODULES = ['fs/netfs/netfs', 'net/9p/9pnet', 'net/9p/9pnet_virtio', 'fs/9p/9p']
const V86_COMMIT = '94faf3d6b19ecabc53a4010aaa24252fa6a162e2'
const BIOS = ['seabios.bin', 'vgabios.bin']

interface Lock {
  minirootfs: string
  bios: Record<string, string>
  packages: Record<string, { version: string; sha256: string }>
  /** Pinned by hand from a release's SHA256SUMS; null until a release has a linux-386 build. */
  goDicom: GoDicomPin | null
}

const here = dirname(fileURLToPath(import.meta.url))
const repo = join(here, '../../../..')
const fixtures = join(repo, 'packages/fixtures/out')
const outAt = process.argv.indexOf('--out')
if (outAt !== -1 && !process.argv[outAt + 1]) {
  throw new Error('--out needs a directory')
}
const out = outAt === -1 ? join(repo, 'apps/web/public/vm') : resolvePath(process.argv[outAt + 1] ?? '')
const cache = join(repo, 'node_modules/.cache/dicomfall-vm')
const lockPath = join(here, 'vm-image.lock.json')
const update = process.argv.includes('--update')
const lock: Lock = {
  minirootfs: '',
  bios: {},
  packages: {},
  goDicom: null,
  ...(existsSync(lockPath) ? JSON.parse(readFileSync(lockPath, 'utf8')) : {}),
}
let lockChanged = update
const mirror = mirrorBase()
const mirrorOutAt = process.argv.indexOf('--mirror-out')
const mirrorOut = mirrorOutAt === -1 ? null : process.argv[mirrorOutAt + 1]
if (mirrorOutAt !== -1 && !mirrorOut) {
  throw new Error('--mirror-out needs a directory')
}
/** Every pinned file this build used, by name: what --mirror-out writes. */
const downloads = new Map<string, Uint8Array>()

/** A download must match the lock; with --update the lock takes the new checksum. */
function pinned(what: string, data: Uint8Array, expected: string | undefined, record: (hash: string) => void) {
  const actual = sha256(data)
  if (expected === actual) {
    return
  }
  if (!update) {
    throw new Error(`${what}: checksum ${actual} does not match the lock (${expected ?? 'none'}); run with --update`)
  }
  record(actual)
}

/** Every file under the fixtures' output, as it is on disk now: never a committed copy. */
function fixtureFiles(): ArchiveEntry[] {
  if (!existsSync(fixtures)) {
    throw new Error(`${fixtures} is missing: the image carries every fixture under ${LAB_FIXTURES_DIR}/`)
  }
  const walk = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
      entry.isDirectory() ? walk(join(dir, entry.name)) : entry.isFile() ? [join(dir, entry.name)] : []
    )
  return walk(fixtures).map((path) =>
    guestFile(`${LAB_FIXTURES_DIR.slice(1)}/${relative(fixtures, path).split('\\').join('/')}`, readFileSync(path))
  )
}

const fetchPinned = async (url: string, name: string) => {
  const data = await fetchPinnedFile(url, name, cache, mirror)
  downloads.set(name, data)
  return data
}

/** go-dicom's release binary, checked against the lock and its own header; null while none is pinned. */
async function goDicomBinary(): Promise<{ version: string; entry: ArchiveEntry } | null> {
  const pin = lock.goDicom
  if (pin === null) {
    console.warn(
      [
        '',
        `WARNING: go-dicom is not pinned in ${relative(repo, lockPath)}, so this image has no go-dicom.`,
        `No go-dicom release has a ${GO_DICOM_ASSET} build yet (the first will be v1.9.0). Once it is`,
        'published, pin it as packages/machine/README.md says. Never pin another architecture.',
        '',
      ].join('\n')
    )
    return null
  }
  const problems = goDicomPinProblems(pin)
  if (problems.length > 0) {
    throw new Error(problems.join('\n'))
  }
  const data = await fetchPinned(pin.url, goDicomFileName(pin.version))
  // Never re-pinned by --update: the checksum is the release's own, copied from its SHA256SUMS.
  if (sha256(data) !== pin.sha256) {
    throw new Error(`${pin.url}: checksum ${sha256(data)} does not match the lock (${pin.sha256})`)
  }
  if (!isLinux386Elf(data)) {
    throw new Error(`${pin.url}: not a 32-bit x86 Linux binary`)
  }
  return { version: pin.version, entry: guestFile(VM_GO_DICOM.slice(1), data, 0o755) }
}

async function main() {
  const index: PackageIndex = { packages: new Map(), provides: new Map() }
  for (const section of ['main', 'community']) {
    // The index changes as Alpine updates, so it is fetched fresh, never cached.
    const response = await fetch(`${ALPINE}/${section}/x86/APKINDEX.tar.gz`)
    parseIndex(indexFromApkIndex(new Uint8Array(await response.arrayBuffer())), section, index)
  }

  const rootfsArchive = await fetchPinned(`${ALPINE}/releases/x86/${MINIROOTFS}`, MINIROOTFS)
  pinned(MINIROOTFS, rootfsArchive, lock.minirootfs, (hash) => {
    lock.minirootfs = hash
  })
  const rootfs = readTarGz(rootfsArchive)

  const kernelPackage = index.packages.get(KERNEL_PACKAGE)
  if (!kernelPackage) {
    throw new Error(`Alpine has no ${KERNEL_PACKAGE}`)
  }
  // Without the kernel's own dependencies (mkinitfs, kmod): they build initramfs images on a real install; ours is made here.
  const skipped = new Set([...installedNames(rootfs), ...NOT_INSTALLED])
  const wanted = [...resolve(PACKAGES, index, skipped), kernelPackage]
  const packages: ArchiveEntry[][] = []
  for (const found of wanted) {
    const locked = lock.packages[found.name]
    // The lock's version wins: once Alpine has replaced it, the mirror still has it.
    const version = locked && !update ? locked.version : found.version
    if (version !== found.version) {
      console.log(`${found.name}: Alpine now has ${found.version}; building the pinned ${version}`)
    }
    const file = `${found.name}-${version}.apk`
    const data = await fetchPinned(`${ALPINE}/${found.repo}/x86/${file}`, file)
    if (!locked) {
      // A package new to the build is pinned as it is first fetched; the others keep their pins.
      lock.packages[found.name] = { version, sha256: sha256(data) }
      lockChanged = true
      console.log(`pinned new package ${file}`)
    } else {
      pinned(file, data, locked.version === version ? locked.sha256 : undefined, (hash) => {
        lock.packages[found.name] = { version, sha256: hash }
      })
    }
    packages.push(readTarGz(data))
  }
  console.log(`${wanted.length} packages: ${wanted.map((found) => found.name).join(' ')}`)

  const kernelRelease = packages
    .flat()
    .find((entry) => /^lib\/modules\/[^/]+\/modules\.dep$/.test(entry.path))
    ?.path.split('/')[2]
  if (!kernelRelease) {
    throw new Error(`${KERNEL_PACKAGE} has no lib/modules/<release>/modules.dep`)
  }

  const goDicom = await goDicomBinary()
  const labFiles = fixtureFiles()
  const tree = mergeTree([
    rootfs,
    ...packages,
    [
      guestFile('etc/inittab', INITTAB),
      guestFile('etc/df-rc', RC, 0o755),
      guestFile('usr/sbin/df-control', CONTROL, 0o755),
      guestFile(VM_SHELL.slice(1), SHELL, 0o755),
      guestFile(VM_BASHRC.slice(1), BASHRC),
      guestFile('etc/hostname', `${VM_HOSTNAME}\n`),
      ...labFiles,
      ...(goDicom ? [goDicom.entry] : []),
    ],
  ])

  const fileOf = (path: string) => {
    const entry = tree.get(path)
    if (!entry) {
      throw new Error(`the image has no ${path}`)
    }
    return entry.data
  }
  const kernel = fileOf('boot/vmlinuz-virt')
  const initramfs = writeCpioGz([
    ...['bin', 'dev', 'lib', 'proc', 'sys', 'newroot'].map((path) => ({ path, mode: 0o40755, data: new Uint8Array() })),
    { path: 'bin/busybox', mode: 0o100755, data: fileOf('bin/busybox.static') },
    { path: 'init', mode: 0o100755, data: new TextEncoder().encode(INIT) },
    ...INITRAMFS_MODULES.map((module) => ({
      path: `lib/${module.split('/').pop()}.ko`,
      mode: 0o100644,
      data: gunzipSync(fileOf(`lib/modules/${kernelRelease}/kernel/${module}.ko.gz`)),
    })),
  ])

  // Built aside, then moved to vm/<version>/: only manifest.json keeps a fixed name.
  rmSync(out, { recursive: true, force: true })
  const image = join(out, 'next')
  mkdirSync(join(image, 'bios'), { recursive: true })
  const { files, bytes } = writeV86Fs(tree, image)
  writeFileSync(join(image, 'vmlinuz'), kernel)
  writeFileSync(join(image, 'initramfs.cpio.gz'), initramfs)

  for (const name of BIOS) {
    const data = await fetchPinned(`https://raw.githubusercontent.com/copy/v86/${V86_COMMIT}/bios/${name}`, name)
    pinned(name, data, lock.bios[name], (hash) => {
      lock.bios[name] = hash
    })
    writeFileSync(join(image, 'bios', name), data)
  }

  // A saved boot belongs to one image and one command line: either changing boots fresh.
  const version = sha256(
    Buffer.concat([readFileSync(join(image, 'fs.json')), kernel, initramfs, Buffer.from(VM_CMDLINE)])
  ).slice(0, 12)
  renameSync(image, join(out, version))
  const manifest: VmManifest = { version, kernelRelease, goDicomVersion: goDicom?.version ?? null }
  writeFileSync(join(out, 'manifest.json'), JSON.stringify(manifest, null, 2))
  if (lockChanged) {
    writeFileSync(lockPath, `${JSON.stringify(lock, null, 2)}\n`)
  }
  if (mirrorOut) {
    writeMirror(mirrorOut, downloads)
    console.log(`mirror: ${downloads.size} files and SHA256SUMS in ${mirrorOut}`)
  }
  console.log(
    `image ${version}: kernel ${kernelRelease}, go-dicom ${goDicom?.version ?? 'not installed'}, ${labFiles.length} fixtures in ${LAB_FIXTURES_DIR}, ${files} files (${(bytes / 1e6).toFixed(0)} MB raw) in ${out}`
  )
}

await main()
