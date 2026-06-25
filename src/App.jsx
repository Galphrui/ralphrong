import { useEffect, useMemo, useState } from 'react'
import Navigation from './components/Navigation'
import PostDetail from './components/PostDetail'
import HomePage from './components/HomePage'
import ProfilePage from './components/ProfilePage'
import Guestbook from './components/Guestbook'
import { useBlogStore } from './store/useStore'
import { fetchPostMetrics, fetchSiteData, recordPostView } from './utils/api'

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
  return { name: 'home' }
}

export default function App() {
  const {
    posts,
    setPosts,
    setTotalPosts,
    setProfile,
    setPostMetrics,
    setAllTags,
    setIsLoading,
    setError,
  } = useBlogStore()

  const [route, setRoute] = useState(getRoute)

  useEffect(() => {
    const onHashChange = () => setRoute(getRoute())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  useEffect(() => {
    const loadPosts = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const data = await fetchSiteData()
        setPosts(data.posts)
        setTotalPosts(data.total)
        setProfile(data.profile)
        const allTags = [...new Set(data.posts.flatMap((p) => p.tags || []))].sort()
        setAllTags(allTags)
        fetchPostMetrics().then(setPostMetrics).catch(() => {})
      } catch (error) {
        console.error('Failed to load posts:', error)
        setError(error)
      } finally {
        setIsLoading(false)
      }
    }

    loadPosts()
  }, [])

  const selectedPost = useMemo(
    () => posts.find((post) => post.slug === route.slug),
    [posts, route.slug],
  )

  useEffect(() => {
    if (route.name !== 'post' || !route.slug) return
    recordPostView(route.slug).then(setPostMetrics).catch(() => {})
  }, [route.name, route.slug, setPostMetrics])

  return (
    <div className="min-h-screen bg-gradient-hero text-slate-900">
      <Navigation />
      <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
        {route.name === 'profile' ? (
          <ProfilePage />
        ) : route.name === 'guestbook' ? (
          <div className="mx-auto max-w-2xl">
            <Guestbook />
          </div>
        ) : route.name === 'post' ? (
          <PostDetail post={selectedPost} />
        ) : (
          <HomePage />
        )}
      </main>
    </div>
  )
}
