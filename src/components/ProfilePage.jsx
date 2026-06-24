import { motion } from 'framer-motion'
import { useBlogStore } from '../store/useStore'

function Section({ title, eyebrow, children }) {
  return (
    <section className="resume-section border border-slate-200 bg-white p-6 shadow-sm">
      <p className="mb-2 text-xs font-black uppercase text-primary-700">{eyebrow}</p>
      <h2 className="mb-4 text-2xl font-black text-slate-950">{title}</h2>
      {children}
    </section>
  )
}

function BulletList({ items }) {
  return (
    <ul className="grid gap-3 text-sm leading-7 text-slate-700">
      {(items || []).map((item) => (
        <li key={item} className="border-l-2 border-primary-300 pl-4">
          {item}
        </li>
      ))}
    </ul>
  )
}

function stripListMarker(value) {
  return String(value || '').replace(/^[-*•]\s*/, '').trim()
}

function SectionContent({ content }) {
  const blocks = String(content || '')
    .split(/\n\s*\n/)
    .map((block) => block.split('\n').map((line) => line.trim()).filter(Boolean))
    .filter((block) => block.length)

  if (!blocks.length) {
    return <p className="text-sm leading-7 text-slate-600">暂无内容</p>
  }

  return (
    <div className="grid gap-4">
      {blocks.map((lines, index) => {
        const [first, ...rest] = lines
        const listItems = rest.map(stripListMarker).filter(Boolean)
        const firstIsList = /^[-*•]\s*/.test(first)

        if (!listItems.length && !firstIsList) {
          return (
            <p key={`${first}-${index}`} className="text-base font-bold leading-8 text-slate-700">
              {stripListMarker(first)}
            </p>
          )
        }

        if (firstIsList) {
          return <BulletList key={`${first}-${index}`} items={lines.map(stripListMarker)} />
        }

        return (
          <article key={`${first}-${index}`} className="border border-slate-100 bg-slate-50 p-4">
            <h3 className="text-lg font-black text-slate-950">{stripListMarker(first)}</h3>
            <BulletList items={listItems} />
          </article>
        )
      })}
    </div>
  )
}

function legacySectionContent(items) {
  return (items || []).join('\n')
}

function legacySkillsContent(groups) {
  return (groups || [])
    .map((group) => [group.name, ...(group.items || []).map((item) => `- ${item}`)].filter(Boolean).join('\n'))
    .join('\n\n')
}

function legacyExperienceContent(items) {
  return (items || [])
    .map((item) =>
      [
        item.title,
        item.period ? `时间：${item.period}` : '',
        item.meta ? `说明：${item.meta}` : '',
        ...(item.details || []).map((detail) => `- ${detail}`),
      ]
        .filter(Boolean)
        .join('\n'),
    )
    .join('\n\n')
}

function getResumeSections(profile) {
  if (Array.isArray(profile.sections) && profile.sections.length) {
    return profile.sections.filter((section) => section.title || section.content)
  }

  return [
    { title: '求职意向', content: profile.intent || '' },
    { title: '个人优势', content: legacySectionContent(profile.advantages) },
    { title: '核心技能', content: legacySkillsContent(profile.skills) },
    { title: '工作经历', content: legacyExperienceContent(profile.workExperience) },
    { title: '项目经历', content: legacyExperienceContent(profile.projects) },
    { title: '教育经历', content: legacyExperienceContent(profile.education) },
    { title: '个人评价', content: legacySectionContent(profile.selfReview) },
  ].filter((section) => section.title || section.content)
}

export default function ProfilePage() {
  const { profile } = useBlogStore()

  if (!profile) {
    return (
      <section className="border border-slate-200 bg-white p-8 shadow-soft">
        <a href="#" className="text-sm font-bold text-primary-700">返回首页</a>
        <h1 className="mt-6 text-3xl font-black text-slate-950">Ra 个人简历正在加载</h1>
      </section>
    )
  }

  const sections = getResumeSections(profile)

  return (
    <motion.div
      className="resume-page mx-auto grid max-w-[1180px] gap-6"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <button
        type="button"
        onClick={() => window.print()}
        className="resume-print-hide fixed bottom-6 right-6 z-40 border border-primary-100 bg-primary-700 px-5 py-3 text-sm font-black text-white shadow-brand hover:bg-primary-600"
      >
        导出 PDF
      </button>
      <div className="grid gap-6">
        <section className="resume-sheet relative overflow-hidden border border-slate-200 bg-hero-panel p-8 shadow-soft">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-brand" />
          <div className="resume-print-hide">
            <a href="#" className="text-sm font-bold text-primary-700 hover:text-primary-500">返回 Ra 首页</a>
          </div>
          <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_240px]">
            <div>
              <p className="text-sm font-black uppercase text-primary-700">Ra Resume</p>
              <h1 className="mt-3 text-4xl font-black leading-tight text-slate-950">{profile.name}</h1>
              <p className="mt-3 text-xl font-bold text-slate-700">{profile.headline}</p>
              <p className="mt-5 max-w-3xl text-base leading-8 text-slate-600">{profile.summary}</p>
              <div className="mt-6 flex flex-wrap gap-3 text-sm font-bold text-slate-600">
                {(profile.contacts || []).map((contact) => (
                  <span key={contact} className="border border-slate-200 bg-white/80 px-3 py-2">
                    {contact}
                  </span>
                ))}
              </div>
            </div>
            <div className="aspect-[3/4] w-full max-w-[240px] justify-self-center border-2 border-dashed border-primary-200 bg-white/70 p-2">
              {profile.photoUrl ? (
                <img src={profile.photoUrl} alt={`${profile.name} 个人照片`} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center bg-primary-50 text-primary-700">
                  <span className="text-3xl font-black">RA</span>
                  <span className="mt-2 text-sm font-bold">个人照片</span>
                </div>
              )}
            </div>
          </div>
        </section>

        {sections.map((section, index) => (
          <Section key={`${section.title}-${index}`} eyebrow={`Section ${index + 1}`} title={section.title}>
            <SectionContent content={section.content} />
          </Section>
        ))}
      </div>
    </motion.div>
  )
}
