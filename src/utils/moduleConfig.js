export const MODULE_STORAGE_KEY = 'ra-module-preferences'

export const DEFAULT_MODULES = [
  { id: 'posts', label: '文章', href: '#posts', enabled: true, order: 10, pinned: true, surface: 'top' },
  { id: 'code', label: '代码库', href: '#code', enabled: true, order: 20, surface: 'top' },
  { id: 'profile', label: '个人', href: '#profile', enabled: true, order: 30, surface: 'top' },
  { id: 'guestbook', label: '留言', href: '#guestbook', enabled: true, order: 40, surface: 'top' },
  { id: 'modules', label: '设置', href: '#modules', enabled: true, order: 90, surface: 'top' },
  { id: 'admin', label: '管理', href: './admin.html', enabled: true, order: 100, surface: 'top', external: true },
]

export const DEFAULT_MODULE_SETTINGS = {
  maxTopModules: 6,
  globalDisplayStyle: 'list',
  moduleDisplayStyles: {},
}

export const DISPLAY_STYLE_IDS = ['list', 'code-block', 'compact', 'gallery', 'timeline', 'magazine']

export function normalizeModuleSettings(rawSettings = {}, rawModules = DEFAULT_MODULES) {
  const savedModules = Array.isArray(rawSettings.modules) ? rawSettings.modules : []
  const savedById = new Map(savedModules.map((item) => [item.id, item]))
  const modules = rawModules.map((module, index) => {
    const saved = savedById.get(module.id) || {}
    return {
      ...module,
      enabled: typeof saved.enabled === 'boolean' ? saved.enabled : module.enabled !== false,
      order: Number.isFinite(Number(saved.order)) ? Number(saved.order) : module.order ?? (index + 1) * 10,
      surface: saved.surface || module.surface || 'top',
    }
  })

  return {
    maxTopModules: clampMaxModules(rawSettings.maxTopModules),
    globalDisplayStyle: normalizeDisplayStyle(rawSettings.globalDisplayStyle),
    moduleDisplayStyles: normalizeModuleDisplayStyles(rawSettings.moduleDisplayStyles),
    modules: modules.sort((a, b) => a.order - b.order || a.label.localeCompare(b.label)),
  }
}

export function readModulePreferences() {
  try {
    const stored = JSON.parse(window.localStorage.getItem(MODULE_STORAGE_KEY) || '{}')
    return normalizeModuleSettings(stored, DEFAULT_MODULES)
  } catch (error) {
    return normalizeModuleSettings()
  }
}

export function writeModulePreferences(settings) {
  const normalized = normalizeModuleSettings(settings, settings.modules)
  window.localStorage.setItem(MODULE_STORAGE_KEY, JSON.stringify(normalized))
  window.dispatchEvent(new CustomEvent('ra-module-settings-change', { detail: normalized }))
  return normalized
}

export function mergeSiteModuleSettings(siteSettings, localSettings) {
  const siteModules = Array.isArray(siteSettings?.modules) ? siteSettings.modules : DEFAULT_MODULES
  const siteDefaults = {
    ...DEFAULT_MODULE_SETTINGS,
    ...(siteSettings?.settings || {}),
    modules: siteModules,
  }
  if (!localSettings) return normalizeModuleSettings(siteDefaults, siteModules)
  return normalizeModuleSettings(
    {
      ...siteDefaults,
      ...localSettings,
      modules: localSettings.modules || siteDefaults.modules,
    },
    siteModules,
  )
}

export function topModules(settings) {
  const normalized = normalizeModuleSettings(settings, settings?.modules)
  return normalized.modules
    .filter((module) => module.enabled && module.surface === 'top')
    .sort((a, b) => a.order - b.order)
}

export function splitTopModules(settings) {
  const modules = topModules(settings)
  const max = clampMaxModules(settings?.maxTopModules)
  return {
    visible: modules.slice(0, max),
    overflow: modules.slice(max),
  }
}

export function clampMaxModules(value) {
  const next = Number(value)
  if (!Number.isFinite(next)) return DEFAULT_MODULE_SETTINGS.maxTopModules
  return Math.min(Math.max(Math.round(next), 3), 8)
}

export function normalizeDisplayStyle(value) {
  return DISPLAY_STYLE_IDS.includes(value) ? value : DEFAULT_MODULE_SETTINGS.globalDisplayStyle
}

export function normalizeModuleDisplayStyles(value = {}) {
  if (!value || typeof value !== 'object') return {}
  return Object.fromEntries(
    Object.entries(value)
      .map(([key, style]) => [key, normalizeDisplayStyle(style)])
      .filter(([key]) => key),
  )
}

export function displayStyleForModule(settings, moduleId) {
  const globalStyle = normalizeDisplayStyle(settings?.globalDisplayStyle)
  const moduleStyle = settings?.moduleDisplayStyles?.[moduleId]
  return normalizeDisplayStyle(moduleStyle || globalStyle)
}
