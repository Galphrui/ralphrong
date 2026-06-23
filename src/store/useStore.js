import { create } from 'zustand'

export const useBlogStore = create((set) => ({
  // Posts state
  posts: [],
  totalPosts: 0,
  currentPage: 1,
  postsPerPage: 20,
  profile: null,

  // Search and filter
  searchQuery: '',
  selectedTag: '全部',
  allTags: [],

  // UI state
  isLoading: false,
  error: null,

  // Actions
  setPosts: (posts) => set({ posts }),
  setTotalPosts: (total) => set({ totalPosts: total }),
  setProfile: (profile) => set({ profile }),
  setCurrentPage: (page) => set({ currentPage: page }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSelectedTag: (tag) => set({ selectedTag: tag }),
  setAllTags: (tags) => set({ allTags: tags }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  // Helper methods
  resetFilters: () => set({ searchQuery: '', selectedTag: '全部', currentPage: 1 }),
}))
