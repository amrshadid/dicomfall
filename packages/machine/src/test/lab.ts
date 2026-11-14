import type { NetworkDefinition } from '#types/definitions/network'

/** The bridge's lab: a workstation and an archive on one cable, with the first fixture copied in. */
export const TWO_AES: NetworkDefinition = {
  aes: [
    { name: 'workstation', title: 'WORKSTATION', address: '10.0.0.1/24' },
    { name: 'archive', title: 'ARCHIVE', address: '10.0.0.2/24' },
  ],
  links: [['workstation', 'archive']],
  files: [{ fixture: 'ct-explicit-le.dcm', to: '/lab/ct-explicit-le.dcm' }],
}

/** The link between them. */
export const TWO_AES_LINK = ['workstation', 'archive'] as const
