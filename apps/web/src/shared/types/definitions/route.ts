/** The Settings screen's sections, in the order they print: each has its own `#/settings/<section>`. */
export const SETTINGS_SECTIONS = ['display', 'gameplay', 'keyboard', 'saves', 'privacy', 'about'] as const

export type SettingsSectionId = (typeof SETTINGS_SECTIONS)[number]

export type Route =
  | { readonly name: 'title' }
  | { readonly name: 'map' }
  | { readonly name: 'mission'; readonly missionId: string }
  | { readonly name: 'settings'; readonly section: SettingsSectionId | null }
  | { readonly name: 'not-found' }
