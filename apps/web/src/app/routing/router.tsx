import { useProgress } from '@dicomfall/game/hooks'
import { appContent } from '@dicomfall/missions/utils'
import { CheatSheetContainer } from '@features/shortcuts'
import { useWideEnough } from '@features/small-screen/hooks/viewport'
import { useHashRoute, useRouteFocus } from '@shared/hooks/navigation'
import { screenTitleOf } from '@shared/navigation'
import { Suspense, useEffect } from 'react'
import { ContentErrorPage, SmallScreenPage } from '@/pages'
import { routeElement } from './routerConfig'

export function AppRouter() {
  const route = useHashRoute()
  const wide = useWideEnough()
  const { isOpening } = useProgress()
  const content = appContent()

  const title = screenTitleOf(route, content.ok ? content.value : null, wide)
  useEffect(() => {
    document.title = title
  }, [title])

  useRouteFocus(route, wide)

  // Content that fails its checks could teach something wrong: nothing else renders.
  if (!content.ok) {
    return <ContentErrorPage />
  }
  // Below the play width the route is kept, not rendered: widening the window brings it back.
  if (!wide) {
    return <SmallScreenPage />
  }
  // Nothing that shows progress renders before the save is loaded.
  if (isOpening) {
    return null
  }
  return (
    <>
      <Suspense fallback={null}>{routeElement(route)}</Suspense>
      <CheatSheetContainer />
    </>
  )
}
