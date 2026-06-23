import { motion } from 'framer-motion'
import { useBlogStore } from '../store/useStore'

function Section({ title, eyebrow, children }) {
  return (
    <section className="border border-slate-200 bg-white p-6 shadow-sm">
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

function Tags({ items }) {
  return (
    <div className="flex flex-wrap gap-2">
      {(items || []).map((item) => (
        <span key={item} className="bg-primary-50 px-3 py-1 text-xs font-bold text-primary-700">
          {item}
        </span>
      ))}
    </div>
  )
}

function ExperienceList({ items }) {
  return (
    <div className="grid gap-4">
      {(items || []).map((item) => (
        <article key={item.title} className="border border-slate-100 bg-slate-50 p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-lg font-black text-slate-950">{item.title}</h3>
            {item.period && <span className="text-sm font-bold text-slate-500">{item.period}</span>}
          </div>
          {item.meta && <p className="mt-1 text-sm font-bold text-primary-700">{item.meta}</p>}
          <BulletList items={item.details} />
        </article>
      ))}
    </div>
  )
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

  return (
    <motion.div
      className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <div className="grid gap-6">
        <section className="relative overflow-hidden border border-slate-200 bg-hero-panel p-8 shadow-soft">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-brand" />
          <a href="#" className="text-sm font-bold text-primary-700 hover:text-primary-500">返回 Ra 首页</a>
          <p className="mt-8 text-sm font-black uppercase text-primary-700">Ra Resume</p>
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
        </section>

        <Section eyebrow="Intent" title="求职意向">
          <p className="text-base font-bold leading-8 text-slate-700">{profile.intent}</p>
        </Section>

        <Section eyebrow="Strengths" title="个人优势">
          <BulletList items={profile.advantages} />
        </Section>

        <Section eyebrow="Experience" title="工作经历">
          <ExperienceList items={profile.workExperience} />
        </Section>

        <Section eyebrow="Projects" title="项目经历">
          <ExperienceList items={profile.projects} />
        </Section>

        <Section eyebrow="Education" title="教育经历">
          <ExperienceList items={profile.education} />
        </Section>

        <Section eyebrow="Self Review" title="个人评价">
          <BulletList items={profile.selfReview} />
        </Section>
      </div>

      <aside className="grid gap-6 lg:sticky lg:top-24 lg:self-start">
        <Section eyebrow="Skills" title="核心技能">
          <div className="grid gap-4">
            {(profile.skills || []).map((group) => (
              <div key={group.name}>
                <h3 className="mb-2 text-sm font-black text-slate-950">{group.name}</h3>
                <Tags items={group.items} />
              </div>
            ))}
          </div>
        </Section>
        <Section eyebrow="Ra Direction" title="方向">
          <p className="text-sm leading-7 text-slate-600">
            Android 系统、Framework、智能穿戴、嵌入式 Android 与系统问题闭环。
          </p>
        </Section>
      </aside>
    </motion.div>
  )
}
