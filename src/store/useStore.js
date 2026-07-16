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
  tools: [],
  devLogs: [],
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
  setTools: (tools) => set({ tools }),
  setDevLogs: (devLogs) => set({ devLogs }),
  setModuleSettings: (moduleSettings) => set({ moduleSettings: normalizeModuleSettings(moduleSettings, moduleSettings?.modules) }),
  setPostMetrics: (postMetrics) => set({ postMetrics }),
  hydrateSiteData: (data) =>
    set({
      posts: data.posts || [],
      totalPosts: data.total || data.posts?.length || 0,
      profile: data.profile || null,
      repositories: data.repositories || [],
      tools: data.tools || [],
      devLogs: data.devLogs || [],
      moduleSettings: normalizeModuleSettings(data.moduleSettings),
      allTags: [...new Set((data.posts || []).flatMap((post) => post.tags || []))].sort(),
    }),
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
