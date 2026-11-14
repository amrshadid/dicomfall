export const SW_FILE = 'sw.js'

export const APP_CACHE_PREFIX = 'dicomfall-app-'

export const RUNTIME_CACHE = 'dicomfall-offline-v1'

// Copied from the machine package: a worker importing app modules would need an `import` it can't run.
export const VM_FILE_CACHE = 'dicomfall-vm-files-v1'

export const VM_DIR = 'vm/'
export const VM_MANIFEST = 'vm/manifest.json'

/** The image's file list, beside its `flat/` folder. */
export const VM_FILE_LIST = 'fs.json'

/**
 * Image folders the Machine never reads after boot: v86 boots the kernel from its own copy, and
 * the modules the lab needs (veth, sch_netem) are loaded at boot, into the saved Machine. A lab
 * that loads a module of its own needs that module's files kept here before it plays offline.
 */
export const IMAGE_FILES_NEVER_OPENED = ['/boot/', '/lib/modules/']

/** Image files fetched at once while the cache is filled in the background. */
export const VM_WARM_CONCURRENCY = 2

/** What the app posts to the service worker once a lab is up: cache the rest of the image. */
export const SW_WARM_MESSAGE = 'dicomfall:warm-vm-image'

// Read by search engines and link previews, never by the game: not worth a player's offline cache.
export const CRAWLER_FILES: readonly string[] = ['og.png', 'robots.txt', 'sitemap.xml']

// Routes live in the hash, so the root's navigation is this one page.
export const APP_SHELL = 'index.html'

export const SW_MANIFEST_TOKEN = '__DF_SW_MANIFEST__'

export const NAVIGATION_TIMEOUT_MS = 4000
