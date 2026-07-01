import { create } from 'zustand'
import { normalizeModuleSettings } from '../utils/moduleConfig'

export const useBlogStore = create((set) => ({
  // Posts state
  posts: [],
  totalPosts: 0,
  currentPage: 1,
  postsPerPage: 20,
  profile: null,
  repositories: [],
  moduleSettings: normalizeModuleSettings(),
  postMetrics: {},

  // Search and filter
  searchQuery: '',
  selectedTag: '全部',
  sortMode: 'date-desc',
  allTags: [],

  // UI state
  isLoading: false,
  error: null,

  // Actions
  setPosts: (posts) => set({ posts }),
  setTotalPosts: (total) => set({ totalPosts: total }),
  setProfile: (profile) => set({ profile }),
  setRepositories: (repositories) => set({ repositories }),
  setModuleSettings: (moduleSettings) => set({ moduleSettings: normalizeModuleSettings(moduleSettings, moduleSettings?.modules) }),
  setPostMetrics: (postMetrics) => set({ postMetrics }),
  setCurrentPage: (page) => set({ currentPage: page }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSelectedTag: (tag) => set({ selectedTag: tag }),
  setSortMode: (sortMode) => set({ sortMode }),
  setAllTags: (tags) => set({ allTags: tags }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  // Helper methods
  resetFilters: () => set({ searchQuery: '', selectedTag: '全部', sortMode: 'date-desc', currentPage: 1 }),
}))
