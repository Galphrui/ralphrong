const STORAGE_KEY = 'RaBlogBrowsingState'
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000
const MAX_POSITIONS = 50

const locationKey = ({ pathname = '', search = '', hash = '' }) => `${pathname}${search}${hash}`

const locationSnapshot = ({ pathname = '', search = '', hash = '' }) => ({
  path: pathname,
  search,
  hash,
})

export function readBrowsingState(location = window.location, storage = window.localStorage, now = Date.now()) {
  try {
    const saved = JSON.parse(storage.getItem(STORAGE_KEY) || 'null')
    const current = locationSnapshot(location)
    const state = saved?.positions?.[locationKey(location)] || saved

    if (!state || now - Number(state.savedAt || 0) > MAX_AGE_MS) return null
    if (state.path !== current.path || state.search !== current.search || state.hash !== current.hash) return null

    return {
      ...current,
      scrollX: Math.max(0, Number(state.scrollX || 0)),
      scrollY: Math.max(0, Number(state.scrollY || 0)),
      savedAt: Number(state.savedAt || now),
    }
  } catch {
    return null
  }
}

export function saveBrowsingState(
  location = window.location,
  scrollX = window.scrollX,
  scrollY = window.scrollY,
  storage = window.localStorage,
  now = Date.now(),
) {
  try {
    const current = locationSnapshot(location)
    const saved = JSON.parse(storage.getItem(STORAGE_KEY) || 'null')
    const positions = saved?.positions && typeof saved.positions === 'object' ? saved.positions : {}
    positions[locationKey(location)] = {
      ...current,
      scrollX: Math.max(0, Number(scrollX || 0)),
      scrollY: Math.max(0, Number(scrollY || 0)),
      savedAt: now,
    }

    const recentPositions = Object.fromEntries(
      Object.entries(positions)
        .filter(([, state]) => now - Number(state?.savedAt || 0) <= MAX_AGE_MS)
        .sort(([, left], [, right]) => Number(left.savedAt || 0) - Number(right.savedAt || 0))
        .slice(-MAX_POSITIONS),
    )

    storage.setItem(STORAGE_KEY, JSON.stringify({ positions: recentPositions }))
  } catch {
    // Storage can be unavailable in private mode; reading must remain usable.
  }
}
