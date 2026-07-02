import { useMemo } from 'react'
import { useBlogStore } from '../store/useStore'
import { CODE_DISPLAY_STYLES } from '../utils/codeLibrary'
import { clampMaxModules, normalizeDisplayStyle, writeModulePreferences } from '../utils/moduleConfig'

export default function ModuleSettingsPage() {
  const { moduleSettings, setModuleSettings } = useBlogStore()
  const modules = useMemo(
    () => [...moduleSettings.modules].sort((a, b) => a.order - b.order),
    [moduleSettings.modules],
  )

  const persist = (
    nextModules,
    nextMax = moduleSettings.maxTopModules,
    globalDisplayStyle = moduleSettings.globalDisplayStyle,
    moduleDisplayStyles = moduleSettings.moduleDisplayStyles,
  ) => {
    const normalized = writeModulePreferences({
      maxTopModules: nextMax,
      globalDisplayStyle,
      moduleDisplayStyles,
      modules: nextModules.map((module, index) => ({ ...module, order: (index + 1) * 10 })),
    })
    setModuleSettings(normalized)
  }

  const toggleModule = (id) => {
    persist(modules.map((module) => (module.id === id ? { ...module, enabled: !module.enabled } : module)))
  }

  const moveModule = (id, direction) => {
    const index = modules.findIndex((module) => module.id === id)
    const target = index + direction
    if (index < 0 || target < 0 || target >= modules.length) return
    const next = [...modules]
    const [item] = next.splice(index, 1)
    next.splice(target, 0, item)
    persist(next)
  }

  const changeGlobalStyle = (style) => {
    persist(modules, moduleSettings.maxTopModules, normalizeDisplayStyle(style), moduleSettings.moduleDisplayStyles)
  }

  const changeModuleStyle = (id, style) => {
    persist(modules, moduleSettings.maxTopModules, moduleSettings.globalDisplayStyle, {
      ...moduleSettings.moduleDisplayStyles,
      [id]: normalizeDisplayStyle(style),
    })
  }

  return (
    <section className="mx-auto max-w-4xl py-4">
      <div className="mb-5 border border-slate-200 bg-white p-5 shadow-sm">
        <p className="mb-2 text-xs font-black uppercase text-primary-700">Ra Modules</p>
        <h1 className="text-2xl font-black text-slate-950">模块显示设置</h1>
        <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_180px_180px] lg:items-end">
          <p className="text-sm font-medium leading-6 text-slate-600">
            控制顶部功能入口默认显示哪些模块、显示顺序、同时露出的模块数量，以及所有模块默认采用的内容排版。超过数量的模块会收进“更多”，避免以后功能变多时挤压导航。
          </p>
          <label className="text-xs font-black uppercase text-slate-500">
            顶部最多显示
            <input
              type="number"
              min="3"
              max="8"
              value={moduleSettings.maxTopModules}
              onChange={(event) => persist(modules, clampMaxModules(event.target.value))}
              className="mt-2 h-11 w-full border border-slate-200 bg-white px-3 text-sm font-black text-slate-800 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            />
          </label>
          <label className="text-xs font-black uppercase text-slate-500">
            全局排版风格
            <select
              value={moduleSettings.globalDisplayStyle || 'list'}
              onChange={(event) => changeGlobalStyle(event.target.value)}
              className="mt-2 h-11 w-full border border-slate-200 bg-white px-3 text-sm font-black text-slate-800 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            >
              {CODE_DISPLAY_STYLES.map((style) => (
                <option key={style.id} value={style.id}>
                  {style.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="grid gap-3">
        {modules.map((module, index) => (
          <article key={module.id} className="flex flex-col gap-3 border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-black text-slate-950">{module.label}</h2>
                <span className="border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-black uppercase text-slate-500">
                  {module.id}
                </span>
                {module.external && (
                  <span className="border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-black text-amber-700">
                    外部入口
                  </span>
                )}
              </div>
              <p className="mt-1 truncate text-xs font-bold text-slate-500">{module.href}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={moduleSettings.moduleDisplayStyles?.[module.id] || moduleSettings.globalDisplayStyle || 'list'}
                onChange={(event) => changeModuleStyle(module.id, event.target.value)}
                className="h-10 border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                title="单模块排版风格"
              >
                {CODE_DISPLAY_STYLES.map((style) => (
                  <option key={style.id} value={style.id}>
                    {style.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => toggleModule(module.id)}
                className={`h-10 border px-3 text-xs font-black ${
                  module.enabled
                    ? 'border-primary-700 bg-primary-700 text-white'
                    : 'border-slate-200 bg-slate-50 text-slate-500'
                }`}
              >
                {module.enabled ? '显示' : '隐藏'}
              </button>
              <button
                type="button"
                disabled={index === 0}
                onClick={() => moveModule(module.id, -1)}
                className="h-10 border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 disabled:text-slate-300"
              >
                上移
              </button>
              <button
                type="button"
                disabled={index === modules.length - 1}
                onClick={() => moveModule(module.id, 1)}
                className="h-10 border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 disabled:text-slate-300"
              >
                下移
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
