import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import '@shared/styles/theme.css'
import { configureApp } from '@app/config'
import { registerServiceWorker } from '@app/offline'
import { configureCore } from '@dicomfall/core'
import { configureGame } from '@dicomfall/game'
import { configureTheme } from '@dicomfall/theme'
import { pageStorage, storageAdapter } from '@shared/utils/storage'
import { App } from './App'

// Every package is configured before the first render, so nothing reads a config that isn't set yet.
configureCore({ logEvents: import.meta.env.DEV ? {} : false })
configureTheme()
configureApp({ clarityId: import.meta.env.VITE_CLARITY_ID })
// No content yet: the game opens the save and lists no missions until the missions package exists.
configureGame({ storage: storageAdapter(pageStorage().text) })

const root = document.getElementById('root')
if (!root) {
  throw new Error('index.html is missing the #root element')
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
)

// Only a build has the worker; after the page has loaded, so it never competes with the first paint.
if (import.meta.env.PROD) {
  window.addEventListener('load', () => void registerServiceWorker(import.meta.env.BASE_URL))
}
