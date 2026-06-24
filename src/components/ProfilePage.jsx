import { motion } from 'framer-motion'
import { useBlogStore } from '../store/useStore'

function stripListMarker(value) {
  return String(value || '').replace(/^[-*•]\s*/, '').trim()
}

function cleanText(value) {
  return String(value || '').replaceAll('【', '').replaceAll('】', '').trim()
}

function hasText(value) {
  return cleanText(value).length > 0
}

function splitTitle(value) {
  const [name, ...rest] = cleanText(value).split('｜')
  return {
    name: name || cleanText(value),
    meta: rest.filter(Boolean).join('｜'),
  }
}

function splitContact(value) {
  const text = cleanText(value)
  const separatorIndex = Math.max(text.indexOf('：'), text.indexOf(':'))
  if (separatorIndex <= 0) return { label: '联系', value: text }
  return {
    label: text.slice(0, separatorIndex).trim(),
    value: text.slice(separatorIndex + 1).trim(),
  }
}

function ResumeBlock({ title, eyebrow, children, className = '' }) {
  return (
    <section className={`resume-section border border-slate-200 bg-white p-5 shadow-sm ${className}`}>
      <div className="mb-4 flex items-end justify-between gap-4 border-b border-slate-100 pb-3">
        <div>
          <p className="text-xs font-black uppercase text-primary-700">{eyebrow}</p>
          <h2 className="mt-1 text-xl font-black text-slate-950">{title}</h2>
        </div>
      </div>
      {children}
    </section>
  )
}

function ContactGrid({ contacts }) {
  const items = (contacts || []).map(splitContact).filter((item) => item.value)
  if (!items.length) return null

  return (
    <div className="mt-6 grid gap-2 text-sm sm:grid-cols-2">
      {items.map((item) => (
        <div key={`${item.label}-${item.value}`} className="border border-slate-200 bg-white/90 px-3 py-2">
          <span className="mr-2 font-black text-primary-700">{item.label}</span>
          <span className="font-bold text-slate-700">{item.value}</span>
        </div>
      ))}
    </div>
  )
}

function BulletList({ items, compact = false }) {
  const safeItems = (items || []).map(stripListMarker).filter(Boolean)
  if (!safeItems.length) return null

  return (
    <ul className={`grid ${compact ? 'gap-2' : 'gap-3'} text-sm leading-7 text-slate-700`}>
      {safeItems.map((item) => (
        <li key={item} className="relative pl-4">
          <span className="absolute left-0 top-[0.72em] h-1.5 w-1.5 bg-primary-500" />
          {item}
        </li>
      ))}
    </ul>
  )
}

function SkillGroups({ groups }) {
  const safeGroups = (groups || []).filter((group) => group.name || group.items?.length)
  if (!safeGroups.length) return null

  return (
    <ResumeBlock title="核心技能" eyebrow="Skills">
      <div className="grid gap-4">
        {safeGroups.map((group) => (
          <div key={group.name || group.items?.join(',')}>
            <h3 className="mb-2 text-sm font-black text-slate-950">{group.name}</h3>
            <div className="flex flex-wrap gap-2">
              {(group.items || []).map((item) => (
                <span key={item} className="bg-primary-50 px-2.5 py-1 text-xs font-bold text-primary-700">
                  {item}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </ResumeBlock>
  )
}

function ExperienceItem({ item }) {
  const title = splitTitle(item.title)
  return (
    <article className="border-l-2 border-primary-300 pl-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-lg font-black leading-7 text-slate-950">{title.name}</h3>
        {item.period ? <span className="text-xs font-black text-primary-700">{cleanText(item.period)}</span> : null}
      </div>
      {title.meta ? <p className="mt-1 text-sm font-bold text-slate-700">{title.meta}</p> : null}
      {item.meta ? <p className="mt-1 text-sm font-medium text-slate-500">{cleanText(item.meta)}</p> : null}
      <div className="mt-3">
        <BulletList items={item.details} />
      </div>
    </article>
  )
}

function ExperienceBlock({ title, eyebrow, items }) {
  const safeItems = (items || []).filter((item) => item.title || item.details?.length)
  if (!safeItems.length) return null

  return (
    <ResumeBlock title={title} eyebrow={eyebrow}>
      <div className="grid gap-5">
        {safeItems.map((item) => (
          <ExperienceItem key={`${item.title}-${item.period || item.meta || ''}`} item={item} />
        ))}
      </div>
    </ResumeBlock>
  )
}

function TextBlock({ title, eyebrow, children }) {
  if (!children) return null
  return (
    <ResumeBlock title={title} eyebrow={eyebrow}>
      {children}
    </ResumeBlock>
  )
}

function GenericSectionContent({ content }) {
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
        if (/^[-*•]\s*/.test(first)) {
          return <BulletList key={`${first}-${index}`} items={lines} />
        }
        if (!rest.length) {
          return (
            <p key={`${first}-${index}`} className="text-sm font-bold leading-7 text-slate-700">
              {stripListMarker(first)}
            </p>
          )
        }
        return (
          <article key={`${first}-${index}`} className="bg-slate-50 p-4">
            <h3 className="text-base font-black text-slate-950">{stripListMarker(first)}</h3>
            <div className="mt-2">
              <BulletList items={rest} />
            </div>
          </article>
        )
      })}
    </div>
  )
}

function getExtraSections(profile) {
  const standardWords = ['求职', '优势', '技能', '工作', '项目', '教育', '评价']
  if (!Array.isArray(profile.sections)) return []
  return profile.sections
    .filter((section) => section.title || section.content)
    .filter((section) => !standardWords.some((word) => section.title?.includes(word)))
}

export default function ProfilePage() {
  const { profile } = useBlogStore()

  if (!profile) {
    return (
      <section className="border border-slate-200 bg-white p-8 shadow-soft">
        <a href="#posts" className="text-sm font-bold text-primary-700">返回文章首页</a>
        <h1 className="mt-6 text-3xl font-black text-slate-950">Ra 个人简历正在加载</h1>
      </section>
    )
  }

  const extraSections = getExtraSections(profile)

  return (
    <motion.div
      className="resume-page mx-auto grid max-w-[1080px] gap-5"
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

      <section className="resume-sheet relative overflow-hidden border border-slate-200 bg-white p-6 shadow-soft sm:p-8">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-brand" />
        <a href="#posts" className="resume-print-hide text-sm font-bold text-primary-700 hover:text-primary-500">
          返回 Ra 文章首页
        </a>

        <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_190px]">
          <div>
            <p className="text-xs font-black uppercase text-primary-700">Ra Resume</p>
            <h1 className="mt-2 text-4xl font-black leading-tight text-slate-950">{profile.name}</h1>
            <p className="mt-2 text-lg font-black text-slate-700">{profile.headline}</p>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">{profile.summary}</p>
            <ContactGrid contacts={profile.contacts} />
          </div>

          <div className="aspect-[3/4] w-full max-w-[190px] justify-self-center border border-primary-100 bg-primary-50 p-2">
            {profile.photoUrl ? (
              <img src={profile.photoUrl} alt={`${profile.name} 个人照片`} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center bg-white text-primary-700">
                <span className="text-3xl font-black">RA</span>
                <span className="mt-2 text-xs font-bold">个人照片</span>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid gap-5">
          <TextBlock title="求职意向" eyebrow="Intent">
            {hasText(profile.intent) ? (
              <p className="text-base font-black leading-8 text-slate-800">{cleanText(profile.intent)}</p>
            ) : null}
          </TextBlock>
          <ExperienceBlock title="工作经历" eyebrow="Experience" items={profile.workExperience} />
          <ExperienceBlock title="项目经历" eyebrow="Projects" items={profile.projects} />
        </div>

        <aside className="grid gap-5">
          <SkillGroups groups={profile.skills} />
          <TextBlock title="个人优势" eyebrow="Strengths">
            <BulletList items={profile.advantages} compact />
          </TextBlock>
          <ExperienceBlock title="教育经历" eyebrow="Education" items={profile.education} />
          <TextBlock title="个人评价" eyebrow="Review">
            <BulletList items={profile.selfReview} compact />
          </TextBlock>
        </aside>
      </div>

      {extraSections.length ? (
        <div className="grid gap-5">
          {extraSections.map((section, index) => (
            <ResumeBlock key={`${section.title}-${index}`} title={section.title || '补充信息'} eyebrow={`Extra ${index + 1}`}>
              <GenericSectionContent content={section.content} />
            </ResumeBlock>
          ))}
        </div>
      ) : null}
    </motion.div>
  )
}
