import { Component, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
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
import { readBrowsingState, saveBrowsingState } from './utils/browsingState'

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

function currentLocation() {
  return {
    pathname: window.location.pathname,
    search: window.location.search,
    hash: window.location.hash,
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
  let stopped = false

  const stop = () => {
    stopped = true
    window.removeEventListener('wheel', stop)
    window.removeEventListener('touchstart', stop)
    window.removeEventListener('pointerdown', stop)
    window.removeEventListener('keydown', stop)
  }

  window.addEventListener('wheel', stop, { passive: true })
  window.addEventListener('touchstart', stop, { passive: true })
  window.addEventListener('pointerdown', stop, { passive: true })
  window.addEventListener('keydown', stop)

  const restore = () => {
    if (stopped || !sameBrowsingRoute(state)) return stop()
    const maxY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight)
    window.scrollTo(targetX, Math.min(targetY, maxY))
    attempts += 1
    if (maxY >= targetY || attempts >= 100) return stop()
    window.setTimeout(() => window.requestAnimationFrame(restore), 100)
  }

  restore()
  return stop
}

class RouteErrorBoundary extends Component {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error) {
    console.error('Route render failed:', error)
  }

  render() {
    if (!this.state.hasError) return this.props.children
    return (
      <section className="border border-red-200 bg-white p-8 shadow-soft">
        <p className="text-sm font-black uppercase text-red-600">Ra Page Error</p>
        <h1 className="mt-3 text-2xl font-black text-slate-950">页面加载失败</h1>
        <p className="mt-3 leading-7 text-slate-600">页面遇到临时错误，请刷新或返回首页。</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <button type="button" onClick={() => window.location.reload()} className="border border-primary-700 bg-primary-700 px-4 py-2 text-sm font-black text-white">刷新</button>
          <a href="#" className="border border-slate-300 bg-white px-4 py-2 text-sm font-black text-slate-900">返回首页</a>
        </div>
      </section>
    )
  }
}

export default function App() {
  const {
    posts,
    tools,
    devLogs,
    moduleSettings,
    hydrateSiteData,
    setPostMetrics,
    setIsLoading,
    setError,
  } = useBlogStore()

  const [route, setRoute] = useState(getRoute)
  const routeShellRef = useRef(null)
  const pendingRestoreRef = useRef(null)
  const activeLocationRef = useRef(currentLocation())

  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual'
    }

    pendingRestoreRef.current = readBrowsingState(activeLocationRef.current)

    let ticking = false
    const saveCurrentState = () => {
      saveBrowsingState(activeLocationRef.current, window.scrollX, window.scrollY)
    }
    let pendingScroll = null
    const onScroll = () => {
      pendingScroll = {
        location: activeLocationRef.current,
        scrollX: window.scrollX,
        scrollY: window.scrollY,
      }
      if (ticking) return
      ticking = true
      window.requestAnimationFrame(() => {
        ticking = false
        if (!pendingScroll) return
        saveBrowsingState(pendingScroll.location, pendingScroll.scrollX, pendingScroll.scrollY)
        pendingScroll = null
      })
    }
    const onPageHide = () => saveCurrentState()
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') saveCurrentState()
    }
    const onHashChange = () => {
      activeLocationRef.current = currentLocation()
      pendingRestoreRef.current =
        readBrowsingState(activeLocationRef.current) || {
          path: activeLocationRef.current.pathname,
          search: activeLocationRef.current.search,
          hash: activeLocationRef.current.hash,
          scrollX: 0,
          scrollY: 0,
        }
      setRoute(getRoute())
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('pagehide', onPageHide)
    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('hashchange', onHashChange)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('pagehide', onPageHide)
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

  useLayoutEffect(() => {
    if (!pendingRestoreRef.current) return
    if (route.name === 'post' && !posts.length) return
    const state = pendingRestoreRef.current
    pendingRestoreRef.current = null
    return restoreBrowsingScroll(state)
  }, [route.name, route.slug, route.id, posts.length, tools.length, devLogs.length])

  return (
    <div className="ra-app min-h-screen bg-gradient-hero text-slate-900" data-ui-style={moduleSettings?.uiStyle || 'classic'}>
      <Navigation />
      <main ref={routeShellRef} data-route-shell className="ra-main mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
        <RouteErrorBoundary key={`${route.name}-${route.slug || route.id || ''}`}>
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
        </RouteErrorBoundary>
      </main>
    </div>
  )
}
