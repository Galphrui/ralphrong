import Hero from './Hero'
import PostList from './PostList'
import { PageScaffold } from './PageChrome'
import { useBlogStore } from '../store/useStore'
import { formatDateDot } from '../utils/listing'

export default function HomePage() {
  const { posts, totalPosts, allTags, sortMode, setSortMode } = useBlogStore()
  const stats = [
    { label: '文章总数', value: totalPosts },
    { label: '标签数量', value: allTags.length },
    { label: '最近更新', value: formatDateDot(posts[0]?.date) },
  ]

  return (
    <PageScaffold
      stats={stats}
      focusText="Framework、系统调试、智能穿戴、构建发布、问题闭环。"
      sortMode={sortMode}
      onSortModeChange={setSortMode}
    >
      <Hero />
      <PostList />
    </PageScaffold>
  )
}
