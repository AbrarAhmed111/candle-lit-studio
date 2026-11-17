'use client'

import { useState } from 'react'
import { ExternalLink } from 'lucide-react'
import clsx from 'clsx'
import { useAdmin } from '@/components/admin/AdminData'
import { card, done, PageHeader, SaveBar, useLeaveWarning } from '@/components/admin/ui'
import type { SiteContent } from '@/data/content'
import { AboutEditor, HeroEditor, PolicyEditor } from '@/components/admin/website/editors'
import { Area, ListEditor, Text } from '@/components/admin/website/fields'

const tabs = [
  { key: 'hero', label: 'Homepage slides', page: '/' },
  { key: 'about', label: 'Our story', page: '/about' },
  { key: 'faqs', label: 'Questions and answers', page: '/faq' },
  { key: 'policies', label: 'Policies', page: '/policies/shipping' },
  { key: 'care', label: 'Candle care', page: '/candle-care' },
  { key: 'testimonials', label: 'Customer quotes', page: '/' },
  { key: 'social', label: 'Social links and Google', page: '/' },
] as const

type TabKey = (typeof tabs)[number]['key']

export default function AdminWebsitePage() {
  const { content, setShop } = useAdmin()
  const [tab, setTab] = useState<TabKey>('hero')
  // A working copy: nothing reaches the website until Save
  const [draft, setDraft] = useState<SiteContent>(content)
  const [base, setBase] = useState(content)
  if (base !== content) {
    // Fresh data arrived from the database
    setBase(content)
    setDraft(content)
  }
  const dirty = JSON.stringify(draft) !== JSON.stringify(content)
  useLeaveWarning(dirty)

  const update = <K extends keyof SiteContent>(key: K, value: SiteContent[K]) => setDraft(d => ({ ...d, [key]: value }))

  const save = (e?: React.FormEvent) => {
    e?.preventDefault()
    setShop('content', () => draft)
    done('Website text saved')
  }

  const current = tabs.find(t => t.key === tab)!

  return (
    <form onSubmit={save}>
      <PageHeader
        title="Website"
        text="Change the words and pictures on your store. Changes show on the website a few seconds after you save."
      >
        <a href={current.page} target="_blank" rel="noreferrer" className="btn-outline min-h-11 px-5 text-sm">
          <ExternalLink size={16} /> View this page
        </a>
      </PageHeader>

      <div
        className="no-scroll relative -mx-4 mt-8 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0"
        role="tablist"
      >
        {tabs.map(t => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={clsx(
              'min-h-11 shrink-0 rounded-full border px-4 text-sm transition-colors',
              tab === t.key
                ? 'border-espresso bg-espresso text-ivory'
                : 'border-hairline bg-linen hover:border-espresso',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className={`${card} mt-6 p-5 sm:p-6`}>
        {tab === 'hero' && <HeroEditor value={draft.hero} onChange={v => update('hero', v)} />}
        {tab === 'about' && <AboutEditor value={draft.about} onChange={v => update('about', v)} />}
        {tab === 'faqs' && (
          <ListEditor
            items={draft.faqs}
            onChange={v => update('faqs', v)}
            blank={{ q: '', a: '' }}
            addLabel="Add a question"
            title={(f, i) => f.q || `Question ${i + 1}`}
            render={(f, set) => (
              <>
                <Text label="Question" value={f.q} onChange={q => set({ ...f, q })} />
                <Area label="Answer" value={f.a} onChange={a => set({ ...f, a })} />
              </>
            )}
          />
        )}
        {tab === 'policies' && <PolicyEditor value={draft.policies} onChange={v => update('policies', v)} />}
        {tab === 'care' && (
          <>
            <h2 className="text-2xl">Care steps</h2>
            <ListEditor
              items={draft.care.steps}
              onChange={steps => update('care', { ...draft.care, steps })}
              blank={{ title: '', body: '' }}
              addLabel="Add a step"
              title={(s, i) => s.title || `Step ${i + 1}`}
              render={(s, set) => (
                <>
                  <Text label="Step" value={s.title} onChange={title => set({ ...s, title })} />
                  <Area label="Explanation" value={s.body} onChange={body => set({ ...s, body })} />
                </>
              )}
            />
            <h2 className="mt-10 text-2xl">Safety notes</h2>
            <Area
              label="One note per line"
              rows={6}
              value={draft.care.safety.join('\n')}
              onChange={v =>
                update('care', {
                  ...draft.care,
                  safety: v
                    .split('\n')
                    .map(x => x.trim())
                    .filter(Boolean),
                })
              }
            />
          </>
        )}
        {tab === 'testimonials' && (
          <ListEditor
            items={draft.testimonials}
            onChange={v => update('testimonials', v)}
            blank={{ quote: '', author: '', city: '' }}
            addLabel="Add a quote"
            title={(t, i) => t.author || `Quote ${i + 1}`}
            render={(t, set) => (
              <>
                <Area label="What they said" value={t.quote} onChange={quote => set({ ...t, quote })} />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Text label="Name" value={t.author} onChange={author => set({ ...t, author })} />
                  <Text label="City" value={t.city} onChange={city => set({ ...t, city })} />
                </div>
              </>
            )}
          />
        )}
        {tab === 'social' && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Text
              label="Instagram link"
              value={draft.social.instagram}
              onChange={instagram => update('social', { ...draft.social, instagram })}
              placeholder="https://instagram.com/…"
            />
            <Text
              label="Facebook link"
              value={draft.social.facebook}
              onChange={facebook => update('social', { ...draft.social, facebook })}
              placeholder="https://facebook.com/…"
            />
            <Text
              label="TikTok link (optional)"
              value={draft.social.tiktok}
              onChange={tiktok => update('social', { ...draft.social, tiktok })}
              placeholder="https://tiktok.com/@…"
            />
            <div className="sm:col-span-2">
              <h2 className="mt-4 text-2xl">How Google shows your store</h2>
              <p className="mt-1 text-sm text-umber">
                The title and short description under your link in Google results and in WhatsApp link previews.
              </p>
            </div>
            <div className="sm:col-span-2">
              <Text
                label="Title"
                value={draft.seo.title}
                onChange={title => update('seo', { ...draft.seo, title })}
                hint={`${draft.seo.title.length} of about 60 letters`}
              />
            </div>
            <div className="sm:col-span-2">
              <Area
                label="Description"
                value={draft.seo.description}
                onChange={description => update('seo', { ...draft.seo, description })}
                hint={`${draft.seo.description.length} of about 160 letters`}
              />
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <button type="submit" disabled={!dirty} className="btn-primary">
          {dirty ? 'Save website text' : 'All changes saved'}
        </button>
        {dirty && (
          <button type="button" onClick={() => setDraft(content)} className="btn-outline">
            Discard changes
          </button>
        )}
      </div>
      <SaveBar show={dirty} label="Save website text" onDiscard={() => setDraft(content)} />
    </form>
  )
}
