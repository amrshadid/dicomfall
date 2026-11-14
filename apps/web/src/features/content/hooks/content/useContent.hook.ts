import type { LoadedContent } from '@dicomfall/missions/types'
import { appContent } from '@dicomfall/missions/utils'

/** Screens always get valid content: the router shows the errors instead of any screen. */
export function useContent(): LoadedContent {
  const content = appContent()
  if (!content.ok) {
    throw new Error('useContent() ran with invalid mission content; the router should have shown the errors')
  }
  return content.value
}
