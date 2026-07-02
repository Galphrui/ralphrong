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

function normalizeList(items = []) {
  return items.map(stripListMarker).filter(Boolean)
}

function Section({ title, eyebrow, children, compact = false, className = '' }) {
  if (!children) return null
  return (
    <section className={`resume-section ${compact ? 'resume-section-compact' : ''} ${className}`}>
      <div className="resume-section-title">
        <span>{eyebrow}</span>
        <h2>{title}</h2>
      </div>
      {children}
    </section>
  )
}

function ContactGrid({ contacts }) {
  const items = (contacts || []).map(splitContact).filter((item) => item.value)
  if (!items.length) return null

  return (
    <div className="resume-contact-grid">
      {items.map((item) => (
        <div key={`${item.label}-${item.value}`} className="resume-contact-item">
          <span>{item.label}</span>
          <strong>{item.value}</strong>
        </div>
      ))}
    </div>
  )
}

function BulletList({ items, compact = false }) {
  const safeItems = normalizeList(items)
  if (!safeItems.length) return null

  return (
    <ul className={`resume-bullets ${compact ? 'resume-bullets-compact' : ''}`}>
      {safeItems.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  )
}

function SkillGroups({ groups }) {
  const safeGroups = (groups || []).filter((group) => group.name || group.items?.length)
  if (!safeGroups.length) return null

  return (
    <Section title="核心技能" eyebrow="Skills" compact>
      <div className="resume-skill-groups">
        {safeGroups.map((group) => (
          <div key={group.name || group.items?.join(',')} className="resume-skill-group">
            <h3>{group.name}</h3>
            <div>
              {(group.items || []).map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Section>
  )
}

function ExperienceItem({ item }) {
  const title = splitTitle(item.title)
  return (
    <article className="resume-item">
      <header>
        <div>
          <h3>{title.name}</h3>
          {title.meta ? <p>{title.meta}</p> : null}
          {item.meta ? <p>{cleanText(item.meta)}</p> : null}
        </div>
        {item.period ? <time>{cleanText(item.period)}</time> : null}
      </header>
      <BulletList items={item.details} />
    </article>
  )
}

function ExperienceSection({ title, eyebrow, items }) {
  const safeItems = (items || []).filter((item) => item.title || item.details?.length)
  if (!safeItems.length) return null

  return (
    <Section title={title} eyebrow={eyebrow}>
      <div className="resume-item-list">
        {safeItems.map((item) => (
          <ExperienceItem key={`${item.title}-${item.period || item.meta || ''}`} item={item} />
        ))}
      </div>
    </Section>
  )
}

function GenericSectionContent({ content }) {
  const blocks = String(content || '')
    .split(/\n\s*\n/)
    .map((block) => block.split('\n').map((line) => line.trim()).filter(Boolean))
    .filter((block) => block.length)

  if (!blocks.length) return null

  return (
    <div className="resume-item-list">
      {blocks.map((lines, index) => {
        const [first, ...rest] = lines
        if (/^[-*•]\s*/.test(first)) {
          return <BulletList key={`${first}-${index}`} items={lines} />
        }
        if (!rest.length) {
          return (
            <p key={`${first}-${index}`} className="resume-plain-line">
              {stripListMarker(first)}
            </p>
          )
        }
        return (
          <article key={`${first}-${index}`} className="resume-item">
            <header>
              <div>
                <h3>{stripListMarker(first)}</h3>
              </div>
            </header>
            <BulletList items={rest} />
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
    <div className="resume-page">
      <button type="button" onClick={() => window.print()} className="resume-print-button resume-print-hide">
        导出 PDF
      </button>

      <article className="resume-sheet">
        <a href="#posts" className="resume-back-link resume-print-hide">
          返回 Ra 文章首页
        </a>

        <header className="resume-hero">
          <div className="resume-hero-main">
            <p className="resume-kicker">Android System Engineer</p>
            <h1>{profile.name}</h1>
            <p className="resume-headline">{profile.headline}</p>
            {hasText(profile.summary) ? <p className="resume-summary">{cleanText(profile.summary)}</p> : null}
            <ContactGrid contacts={profile.contacts} />
          </div>
          <div className="resume-photo">
            {profile.photoUrl ? (
              <img src={profile.photoUrl} alt={`${profile.name} 个人照片`} />
            ) : (
              <div>
                <span>RA</span>
                <small>个人照片</small>
              </div>
            )}
          </div>
        </header>

        <div className="resume-layout">
          <aside className="resume-sidebar">
            <Section title="求职意向" eyebrow="Intent" compact>
              {hasText(profile.intent) ? <p className="resume-intent">{cleanText(profile.intent)}</p> : null}
            </Section>

            <SkillGroups groups={profile.skills} />

            <Section title="核心优势" eyebrow="Strengths" compact>
              <BulletList items={profile.advantages} compact />
            </Section>

            <ExperienceSection title="教育经历" eyebrow="Education" items={profile.education} />

            <Section title="个人评价" eyebrow="Review" compact>
              <BulletList items={profile.selfReview} compact />
            </Section>
          </aside>

          <main className="resume-main">
            <ExperienceSection title="工作经历" eyebrow="Experience" items={profile.workExperience} />
            <ExperienceSection title="项目经历" eyebrow="Projects" items={profile.projects} />
            {extraSections.map((section, index) => (
              <Section key={`${section.title}-${index}`} title={section.title || '补充信息'} eyebrow={`Extra ${index + 1}`}>
                <GenericSectionContent content={section.content} />
              </Section>
            ))}
          </main>
        </div>
      </article>
    </div>
  )
}
