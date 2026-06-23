import { useState } from 'react'
import Navigation from './components/Navigation'
import Hero from './components/Hero'
import PostList from './components/PostList'

export default function App() {
  return (
    <div className="min-h-screen bg-gradient-hero">
      <Navigation />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <Hero />
        <PostList />
      </main>
    </div>
  )
}
