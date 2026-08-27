import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Navigation from './components/Navigation'
import PostDetail from './components/PostDetail'
import HomePage from './components/HomePage'
import ProfilePage from './components/ProfilePage'
import Guestbook from './components/Guestbook'
import CodeRepositoryPage from './components/CodeRepositoryPage'
import CollectionPage from './components/CollectionPage'
import { initAnimations } from './animations'
import { useBlogStore } from './store/useStore'
import { fetchPostMetrics, fetchSiteData, recordPostView } from './utils/api'

const BROWSING_STATE_KEY = 'RaBlogBrowsingState'
const BROWSING_STATE_MAX_AGE_MS = 12 * 60 * 60 * 1000

function getRoute() {
  const hash = window.location.hash.replace(/^#\/?/, '')
  if (hash.startsWith('post/')) {
    return { name: 'post', slug: decodeURIComponent(hash.slice(5)) }
  }
  if (hash === 'profile' || hash === 'about') {
    return { name: 'profile' }
  }
  if (hash === 'guestbook') {
    return { name: 'guestbook' }
  }
  if (hash === 'code') {
    return { name: 'code', id: '' }
  }
  if (hash.startsWith('code/')) {
    return { name: 'code', id: decodeURIComponent(hash.slice(5)) }
  }
  if (hash === 'tools') {
    return { name: 'tools', slug: '' }
  }
  if (hash.startsWith('tools/')) {
    return { name: 'tools', slug: decodeURIComponent(hash.slice(6)) }
  }
  if (hash === 'devlogs') {
    return { name: 'devlogs', slug: '' }
  }
  if (hash.startsWith('devlogs/')) {
    return { name: 'devlogs', slug: decodeURIComponent(hash.slice(8)) }
  }
  return { name: 'home' }
}

function readBrowsingState() {
  try {
    const state = JSON.parse(window.localStorage?.getItem(BROWSING_STATE_KEY) || 'null')
    if (!state || Date.now() - Number(state.savedAt || 0) > BROWSING_STATE_MAX_AGE_MS) return null
    if (state.path !== window.location.pathname || state.search !== window.location.search) return null
    return state
  } catch {
    return null
  }
}

function saveBrowsingState(route) {
  try {
    window.localStorage?.setItem(
      BROWSING_STATE_KEY,
      JSON.stringify({
        path: window.location.pathname,
        search: window.location.search,
        hash: window.location.hash,
        routeName: route?.name || '',
        routeSlug: route?.slug || '',
        routeId: route?.id || '',
        scrollX: window.scrollX || 0,
        scrollY: window.scrollY || 0,
        savedAt: Date.now(),
      }),
    )
  } catch {
    // Ignore private-mode storage failures; the page should still work normally.
  }
}

function sameBrowsingRoute(state) {
  return (
    state &&
    state.path === window.location.pathname &&
    state.search === window.location.search &&
    state.hash === window.location.hash
  )
}

function restoreBrowsingScroll(state) {
  if (!sameBrowsingRoute(state)) return
  const targetY = Math.max(0, Number(state.scrollY || 0))
  const targetX = Math.max(0, Number(state.scrollX || 0))
  let attempts = 0

  const restore = () => {
    if (!sameBrowsingRoute(state)) return
    const maxY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight)
    window.scrollTo(targetX, Math.min(targetY, maxY))
    attempts += 1
    if (attempts < 16 && maxY < targetY) {
      window.setTimeout(() => window.requestAnimationFrame(restore), 80)
    }
  }

  window.requestAnimationFrame(restore)
}

export default function App() {
  const {
    posts,
    tools,
    devLogs,
    hydrateSiteData,
    setPostMetrics,
    setIsLoading,
    setError,
  } = useBlogStore()

  const [route, setRoute] = useState(getRoute)
  const routeShellRef = useRef(null)
  const lastSiteRefreshRef = useRef(0)
  const pendingRestoreRef = useRef(null)

  const refreshSiteData = useCallback(
    async ({ force = false } = {}) => {
      const scrollBeforeRefresh = {
        ...readBrowsingState(),
        path: window.location.pathname,
        search: window.location.search,
        hash: window.location.hash,
        scrollX: window.scrollX || 0,
        scrollY: window.scrollY || 0,
        savedAt: Date.now(),
      }
      setIsLoading(true)
      setError(null)
      try {
        const data = await fetchSiteData({ force })
        hydrateSiteData(data)
        lastSiteRefreshRef.current = Date.now()
        pendingRestoreRef.current = scrollBeforeRefresh
        window.setTimeout(() => restoreBrowsingScroll(scrollBeforeRefresh), 0)
        fetchPostMetrics()
          .then(setPostMetrics)
          .catch(() => {})
      } catch (error) {
        console.error('Failed to load posts:', error)
        setError(error)
      } finally {
        setIsLoading(false)
      }
    },
    [hydrateSiteData, setError, setIsLoading, setPostMetrics],
  )

  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual'
    }

    const saved = readBrowsingState()
    if (saved?.hash && !window.location.hash) {
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${saved.hash}`)
      pendingRestoreRef.current = saved
      setRoute(getRoute())
    } else if (saved && sameBrowsingRoute(saved)) {
      pendingRestoreRef.current = saved
    }

    let ticking = false
    const saveCurrentState = () => saveBrowsingState(getRoute())
    const onScroll = () => {
      if (ticking) return
      ticking = true
      window.requestAnimationFrame(() => {
        ticking = false
        saveCurrentState()
      })
    }
    const onPageHide = () => saveCurrentState()
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') saveCurrentState()
    }
    const onHashChange = () => {
      setRoute(getRoute())
      window.requestAnimationFrame(saveCurrentState)
    }

    saveCurrentState()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('pagehide', onPageHide)
    window.addEventListener('beforeunload', onPageHide)
    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('hashchange', onHashChange)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('pagehide', onPageHide)
      window.removeEventListener('beforeunload', onPageHide)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('hashchange', onHashChange)
    }
  }, [])

  useEffect(() => {
    let active = true

    const loadPosts = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const data = await fetchSiteData()
        if (!active) return
        hydrateSiteData(data)
        lastSiteRefreshRef.current = Date.now()
        fetchPostMetrics()
          .then((metrics) => {
            if (active) setPostMetrics(metrics)
          })
          .catch(() => {})
      } catch (error) {
        if (!active) return
        console.error('Failed to load posts:', error)
        setError(error)
      } finally {
        if (active) setIsLoading(false)
      }
    }

    loadPosts()
    return () => {
      active = false
    }
  }, [hydrateSiteData, setError, setIsLoading, setPostMetrics])

  useEffect(() => {
    const refreshIfStale = () => {
      if (document.visibilityState === 'hidden') return
      if (Date.now() - lastSiteRefreshRef.current < 15000) return
      refreshSiteData({ force: true }).catch(() => {})
    }

    window.addEventListener('focus', refreshIfStale)
    document.addEventListener('visibilitychange', refreshIfStale)
    return () => {
      window.removeEventListener('focus', refreshIfStale)
      document.removeEventListener('visibilitychange', refreshIfStale)
    }
  }, [refreshSiteData])

  const selectedPost = useMemo(
    () => posts.find((post) => post.slug === route.slug),
    [posts, route.slug],
  )

  useEffect(() => {
    if (route.name !== 'post' || !route.slug) return
    recordPostView(route.slug).then(setPostMetrics).catch(() => {})
  }, [route.name, route.slug, setPostMetrics])

  useEffect(() => {
    const cleanup = initAnimations({
      routeKey: `${route.name}-${route.slug || route.id || ''}`,
      root: routeShellRef.current || document,
    })
    return cleanup
  }, [route.name, route.slug, route.id, posts.length, tools.length, devLogs.length])

  useEffect(() => {
    if (!pendingRestoreRef.current) return
    const state = pendingRestoreRef.current
    pendingRestoreRef.current = null
    restoreBrowsingScroll(state)
  }, [route.name, route.slug, route.id, posts.length, tools.length, devLogs.length])

  return (
    <div className="min-h-screen bg-gradient-hero text-slate-900">
      <Navigation />
      <main ref={routeShellRef} data-route-shell className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
        {route.name === 'profile' ? (
          <ProfilePage />
        ) : route.name === 'guestbook' ? (
          <div className="mx-auto max-w-2xl">
            <Guestbook />
          </div>
        ) : route.name === 'code' ? (
          <CodeRepositoryPage selectedId={route.id} />
        ) : route.name === 'tools' ? (
          <CollectionPage
            items={tools}
            selectedSlug={route.slug}
            baseHash="tools"
            title="工具库"
            eyebrow="Ra Tools"
            description="集中存放可下载工具、脚本包、安装包、说明文档和其他附件资源。附件以独立文件保存到 GitHub 仓库，数据里只保留下载地址。"
            emptyText="暂无工具条目"
            detailBackLabel="返回工具库"
            attachmentTitle="工具附件"
          />
        ) : route.name === 'devlogs' ? (
          <CollectionPage
            items={devLogs}
            selectedSlug={route.slug}
            baseHash="devlogs"
            title="开发日志"
            eyebrow="Ra Dev Logs"
            description="记录每次开发、部署、推送、运行、上线的全过程。这里以 Markdown 文档形式沉淀项目演进记录，也支持手动补充。"
            emptyText="暂无开发日志"
            detailBackLabel="返回开发日志"
            attachmentTitle="日志附件"
          />
        ) : route.name === 'post' ? (
          <PostDetail post={selectedPost} />
        ) : (
          <HomePage />
        )}
      </main>
    </div>
  )
}
