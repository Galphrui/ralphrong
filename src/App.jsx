import { useEffect, useMemo, useState } from 'react'
import Navigation from './components/Navigation'
import Hero from './components/Hero'
import PostList from './components/PostList'
import PostDetail from './components/PostDetail'
import { useBlogStore } from './store/useStore'
import { fetchPosts } from './utils/api'

function getRoute() {
  const hash = window.location.hash.replace(/^#\/?/, '')
  if (hash.startsWith('post/')) {
    return { name: 'post', slug: decodeURIComponent(hash.slice(5)) }
  }
  return { name: 'home' }
}

export default function App() {
  const {
    posts,
    setPosts,
    setTotalPosts,
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
        const data = await fetchPosts(1, 100)
        setPosts(data.posts)
        setTotalPosts(data.total)
        const allTags = [...new Set(data.posts.flatMap((p) => p.tags || []))].sort()
        setAllTags(allTags)
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

  return (
    <div className="min-h-screen bg-gradient-hero text-slate-900">
      <Navigation />
      <main className="mx-auto max-w-6xl px-4 py-8">
        {route.name === 'post' ? (
          <PostDetail post={selectedPost} />
        ) : (
          <>
            <Hero />
            <PostList />
          </>
        )}
      </main>
    </div>
  )
}
