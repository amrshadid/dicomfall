import { describe, expect, it } from 'vitest'
import { TWO_AES, TWO_AES_LINK } from '#test/lab'
import type { NetworkDefinition } from '#types/definitions/network'
import { parseEventLine } from '#utils/events/event-parser.util'
import {
  eventPortPipe,
  inAe,
  interfaceName,
  labFileLine,
  linkLossLine,
  networkProblems,
  networkSetupLines,
} from '#utils/network/network-script.util'

/** A modality, an archive and a viewer, the archive in the middle: three AEs, one subnet, two cables. */
const CHAIN: NetworkDefinition = {
  aes: [
    { name: 'modality', title: 'CT_SCANNER', address: '10.0.1.1/24' },
    { name: 'archive', title: 'ARCHIVE', address: '10.0.1.2/24' },
    { name: 'viewer', title: 'VIEWER', address: '10.0.1.3/24' },
  ],
  links: [
    ['modality', 'archive'],
    ['archive', 'viewer'],
  ],
}

describe('a network’s setup lines', () => {
  it('finds nothing wrong with a valid network', () => {
    expect(networkProblems(TWO_AES)).toEqual([])
    expect(networkProblems(CHAIN)).toEqual([])
    expect(networkProblems({ aes: [{ name: 'workstation', title: 'WORKSTATION' }], links: [] })).toEqual([])
  })

  it('builds namespaces, then cables, then the lab’s files', () => {
    expect(networkSetupLines(TWO_AES)).toEqual([
      'ip netns add workstation && ip -n workstation link set lo up',
      'ip netns add archive && ip -n archive link set lo up',
      [
        'ip link add eth0 netns workstation type veth peer name eth0 netns archive',
        'ip -n workstation addr add 10.0.0.1/24 dev eth0 noprefixroute',
        'ip -n archive addr add 10.0.0.2/24 dev eth0 noprefixroute',
        'ip -n workstation link set eth0 up',
        'ip -n archive link set eth0 up',
        'ip -n workstation route add 10.0.0.2 dev eth0 src 10.0.0.1',
        'ip -n archive route add 10.0.0.1 dev eth0 src 10.0.0.2',
      ].join(' && '),
      'mkdir -p /lab && cp -a /lab/fixtures/ct-explicit-le.dcm /lab/ct-explicit-le.dcm',
    ])
  })

  it('numbers each AE’s interfaces in the order of its links, so the AE in the middle has two', () => {
    expect(interfaceName(CHAIN, 'modality', 'archive')).toBe('eth0')
    expect(interfaceName(CHAIN, 'archive', 'modality')).toBe('eth0')
    expect(interfaceName(CHAIN, 'archive', 'viewer')).toBe('eth1')
    expect(interfaceName(CHAIN, 'viewer', 'archive')).toBe('eth0')
    expect(interfaceName(CHAIN, 'modality', 'viewer')).toBeNull()
    expect(networkSetupLines(CHAIN)[4]).toContain(
      'ip link add eth1 netns archive type veth peer name eth0 netns viewer'
    )
  })

  it('copies a folder of fixtures, making the folders above it', () => {
    expect(labFileLine({ fixture: 'series/', to: '/lab/studies/series/' })).toBe(
      'mkdir -p /lab/studies && cp -a /lab/fixtures/series /lab/studies/series'
    )
  })

  it('runs a program in an AE with the AE’s own hostname', () => {
    expect(inAe('archive', 'go-dicom --version')).toBe(
      "ip netns exec archive unshare -u sh -c 'hostname archive && exec go-dicom --version'"
    )
  })
})

describe('a network’s problems', () => {
  it('refuses names, titles, addresses and paths that are wrong or unsafe in a shell line', () => {
    const problems = networkProblems({
      aes: [
        { name: 'Work Station', title: 'WORKSTATION', address: '10.0.0.1/24' },
        { name: 'archive', title: 'A\\B', address: '10.0.0.300/24' },
        { name: 'archive', title: 'MUCH_TOO_LONG_TITLE', address: '10.0.0.1' },
        { name: 'viewer', title: '   ' },
      ],
      links: [
        ['archive', 'archive'],
        ['archive', 'viewer'],
        ['viewer', 'archive'],
        ['archive', 'nowhere'],
      ],
      files: [
        { fixture: '../secret', to: '/lab/x' },
        { fixture: 'ct.dcm', to: '/etc/passwd' },
        { fixture: 'ct.dcm', to: '/lab/../etc' },
        { fixture: 'ct.dcm', to: '/lab/' },
        { fixture: 'ct.dcm', to: '/lab/$(reboot)' },
      ],
    })
    expect(problems).toEqual([
      'aes[0].name: expected a kebab-case name of at most 16 characters, got "Work Station"',
      'aes[1].title: expected 1 to 16 characters with no backslash, got "A\\B"',
      'aes[1].address: expected an address like 10.0.0.1/24, got "10.0.0.300/24"',
      'aes[2].name: "archive" is used twice',
      'aes[2].title: expected 1 to 16 characters with no backslash, got "MUCH_TOO_LONG_TITLE"',
      'aes[2].address: expected an address like 10.0.0.1/24, got "10.0.0.1"',
      'aes[3].title: expected 1 to 16 characters with no backslash, got "   "',
      'links[0]: both ends are on "archive"',
      'links[1][1]: "viewer" has a link but no address',
      'links[2][0]: "viewer" has a link but no address',
      'links[2]: "viewer" and "archive" already have a link',
      'links[3][1]: no AE named "nowhere"',
      'files[0].fixture: expected a path under /lab/fixtures/, got "../secret"',
      'files[1].to: expected a path under /lab/, got "/etc/passwd"',
      'files[2].to: expected a path under /lab/, got "/lab/../etc"',
      'files[3].to: expected a path under /lab/, got "/lab/"',
      'files[4].to: expected a path under /lab/, got "/lab/$(reboot)"',
    ])
  })

  it('refuses one address on two AEs', () => {
    expect(
      networkProblems({
        aes: [
          { name: 'one', title: 'ONE', address: '10.0.0.1/24' },
          { name: 'two', title: 'TWO', address: '10.0.0.1/16' },
        ],
        links: [],
      })
    ).toEqual(['aes[1].address: 10.0.0.1 is used twice'])
  })
})

describe('a link’s loss', () => {
  it('loses packets on both ends, stamped on the event port once the first end loses', () => {
    expect(linkLossLine(TWO_AES, TWO_AES_LINK, 30)).toBe(
      [
        'tc -n workstation qdisc replace dev eth0 root netem loss 30%',
        'echo "fault on workstation archive 30 $EPOCHREALTIME" > /dev/ttyS1',
        'tc -n archive qdisc replace dev eth0 root netem loss 30%',
      ].join(' && ')
    )
    expect(linkLossLine(TWO_AES, TWO_AES_LINK, 0)).toBe(
      [
        'tc -n workstation qdisc del dev eth0 root',
        'echo "fault off workstation archive $EPOCHREALTIME" > /dev/ttyS1',
        'tc -n archive qdisc del dev eth0 root',
      ].join(' && ')
    )
  })

  it('writes the line the event parser reads back', () => {
    const echoed = /echo "fault (.*) \$EPOCHREALTIME"/.exec(linkLossLine(TWO_AES, TWO_AES_LINK, 100) ?? '')?.[1]
    expect(parseEventLine(`fault ${echoed} 1794504832.462712`)?.event).toEqual({
      type: 'fault_injected',
      link: ['workstation', 'archive'],
      lossPercent: 100,
    })
  })

  it('refuses a link the network does not have, and a loss out of range', () => {
    expect(linkLossLine(TWO_AES, ['workstation', 'viewer'], 30)).toBeNull()
    for (const loss of [-1, 101, 2.5, Number.NaN]) {
      expect(linkLossLine(TWO_AES, TWO_AES_LINK, loss)).toBeNull()
    }
  })
})

describe('the event port', () => {
  it('sends each line of a program whole, behind its source', () => {
    expect(eventPortPipe('dicom archive')).toBe(`awk '{ print "dicom archive " $0; fflush() }' > /dev/ttyS1`)
  })
})
