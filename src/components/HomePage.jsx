import Hero from './Hero'
import PostList from './PostList'
import VisitStats from './VisitStats'
import { useBlogStore } from '../store/useStore'

function AuthorPanel() {
  const { profile } = useBlogStore()

  return (
    <aside className="grid content-start gap-4 xl:sticky xl:top-24">
      <section className="border border-slate-200 bg-white p-4 shadow-sm">
        <p className="mb-3 text-xs font-black uppercase text-primary-700">Ra Profile</p>
        <div className="mb-4 flex h-11 w-11 items-center justify-center bg-gradient-brand text-base font-black text-white">
          RA
        </div>
        <h2 className="text-lg font-black leading-tight text-slate-950">{profile?.name || 'Ralph Rong'}</h2>
        <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
          {profile?.headline || 'Android 系统工程师｜智能穿戴 / 安卓系统'}
        </p>
        <a
          href="#profile"
          className="mt-4 inline-flex border border-primary-100 bg-primary-50 px-3 py-2 text-xs font-bold text-primary-700 hover:border-primary-300"
        >
          查看 Ra 个人页
        </a>
      </section>
      <VisitStats />
    </aside>
  )
}

function SiteStatsPanel() {
  const { posts, totalPosts, allTags } = useBlogStore()
  const latestPostDate = posts[0]?.date?.replaceAll('-', '.') || '-'
  const stats = [
    { label: '文章总数', value: totalPosts },
    { label: '标签数量', value: allTags.length },
    { label: '最近更新', value: latestPostDate },
  ]

  return (
    <aside className="grid content-start gap-4 xl:sticky xl:top-24">
      <section className="border border-slate-200 bg-white p-4 shadow-sm">
        <p className="mb-3 text-xs font-black uppercase text-primary-700">Ra Index</p>
        <div className="grid gap-4">
          {stats.map((stat) => (
            <div key={stat.label} className="border-b border-slate-100 pb-4 last:border-0 last:pb-0">
              <div className="text-xl font-black text-primary-700">{stat.value}</div>
              <div className="text-xs font-medium text-slate-500">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>
      <section className="border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-600 shadow-sm">
        <p className="mb-2 text-xs font-black uppercase text-primary-700">Ra Focus</p>
        <p>Framework、系统调试、智能穿戴、构建发布、问题闭环。</p>
      </section>
    </aside>
  )
}

export default function HomePage() {
  return (
    <div className="grid items-start gap-5 xl:grid-cols-[240px_minmax(0,1fr)_240px] 2xl:grid-cols-[260px_minmax(0,900px)_260px]">
      <AuthorPanel />
      <div className="min-w-0">
        <Hero />
        <PostList />
      </div>
      <SiteStatsPanel />
    </div>
  )
}
