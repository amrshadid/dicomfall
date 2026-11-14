export const SW_FILE = 'sw.js'

export const APP_CACHE_PREFIX = 'dicomfall-app-'

// Read by search engines and link previews, never by the game: not worth a player's offline cache.
export const CRAWLER_FILES: readonly string[] = ['og.png', 'robots.txt', 'sitemap.xml']

// Routes live in the hash, so the root's navigation is this one page.
export const APP_SHELL = 'index.html'

export const SW_MANIFEST_TOKEN = '__DF_SW_MANIFEST__'

export const NAVIGATION_TIMEOUT_MS = 4000
