import Navigation from './components/Navigation'
import Hero from './components/Hero'
import PostList from './components/PostList'

export default function App() {
  return (
    <div className="min-h-screen bg-gradient-hero text-slate-900">
      <Navigation />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Hero />
        <PostList />
      </main>
    </div>
  )
}
