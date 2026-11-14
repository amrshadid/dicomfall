import { appContent } from '@dicomfall/missions/utils'
import { ContentErrorPresentation } from '@features/content/components/errors'

export function ContentErrorContainer() {
  const content = appContent()
  return <ContentErrorPresentation errors={content.ok ? [] : content.errors} />
}
