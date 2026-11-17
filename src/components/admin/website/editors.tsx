'use client'

import { useState } from 'react'
import type { SiteContent } from '@/data/content'
import { Area, ListEditor, Picture, Text } from './fields'

// One editor per kind of website text

export function HeroEditor({
  value,
  onChange,
}: {
  value: SiteContent['hero']
  onChange: (v: SiteContent['hero']) => void
}) {
  return (
    <>
      <p className="mb-4 text-umber">The large slides at the top of the homepage. They change every few seconds.</p>
      <ListEditor
        items={value}
        onChange={onChange}
        blank={{
          image: '',
          alt: '',
          position: 'center center',
          kicker: '',
          title: ['', ''],
          text: '',
          primary: { label: 'Shop all candles', href: '/shop' },
          secondary: { label: '', href: '' },
        }}
        addLabel="Add a slide"
        title={(s, i) => s.title.filter(Boolean).join(' ') || `Slide ${i + 1}`}
        render={(s, set) => (
          <>
            <Picture label="Photo" value={s.image} onChange={image => set({ ...s, image })} />
            <Text
              label="Describe the photo (for people who cannot see it)"
              value={s.alt}
              onChange={alt => set({ ...s, alt })}
            />
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Text label="Small line above the heading" value={s.kicker} onChange={kicker => set({ ...s, kicker })} />
              <div />
              <Text
                label="Heading, first line"
                value={s.title[0] ?? ''}
                onChange={v => set({ ...s, title: [v, s.title[1] ?? ''] })}
              />
              <Text
                label="Heading, second line"
                value={s.title[1] ?? ''}
                onChange={v => set({ ...s, title: [s.title[0] ?? '', v] })}
              />
            </div>
            <Area label="Text under the heading" value={s.text} onChange={text => set({ ...s, text })} />
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Text
                label="Main button"
                value={s.primary.label}
                onChange={label => set({ ...s, primary: { ...s.primary, label } })}
              />
              <Text
                label="Main button goes to"
                value={s.primary.href}
                onChange={href => set({ ...s, primary: { ...s.primary, href } })}
                placeholder="/shop"
              />
              <Text
                label="Second button (optional)"
                value={s.secondary.label}
                onChange={label => set({ ...s, secondary: { ...s.secondary, label } })}
              />
              <Text
                label="Second button goes to"
                value={s.secondary.href}
                onChange={href => set({ ...s, secondary: { ...s.secondary, href } })}
                placeholder="/collections/gift-sets"
              />
            </div>
          </>
        )}
      />
    </>
  )
}

export function AboutEditor({
  value,
  onChange,
}: {
  value: SiteContent['about']
  onChange: (v: SiteContent['about']) => void
}) {
  const set = (patch: Partial<SiteContent['about']>) => onChange({ ...value, ...patch })
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <Text
        label="Heading, first line"
        value={value.title[0] ?? ''}
        onChange={v => set({ title: [v, value.title[1] ?? ''] })}
      />
      <Text
        label="Heading, second line"
        value={value.title[1] ?? ''}
        onChange={v => set({ title: [value.title[0] ?? '', v] })}
      />
      <div className="sm:col-span-2">
        <Area label="Introduction" value={value.intro} onChange={intro => set({ intro })} />
      </div>
      <div className="sm:col-span-2">
        <Text label="Story heading" value={value.storyHeading} onChange={storyHeading => set({ storyHeading })} />
        <Area
          label="Your story (leave an empty line between paragraphs)"
          rows={10}
          value={value.story.join('\n\n')}
          onChange={v =>
            set({
              story: v
                .split(/\n\s*\n/)
                .map(p => p.trim())
                .filter(Boolean),
            })
          }
        />
      </div>
      <div className="sm:col-span-2">
        <Text
          label="How it is made, heading"
          value={value.processHeading}
          onChange={processHeading => set({ processHeading })}
        />
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {value.process.map((step, i) => (
            <div key={i} className="rounded-xl border border-hairline p-3">
              <Text
                label={`Step ${i + 1}`}
                value={step.title}
                onChange={title => set({ process: value.process.map((s, j) => (j === i ? { ...s, title } : s)) })}
              />
              <Area
                label="Explanation"
                value={step.text}
                onChange={text => set({ process: value.process.map((s, j) => (j === i ? { ...s, text } : s)) })}
              />
            </div>
          ))}
        </div>
      </div>
      <div className="sm:col-span-2">
        <Text label="Closing line" value={value.closing} onChange={closing => set({ closing })} />
      </div>
    </div>
  )
}

const policyNames: Record<string, string> = {
  shipping: 'Delivery',
  returns: 'Returns and refunds',
  privacy: 'Privacy',
  terms: 'Terms',
}

export function PolicyEditor({
  value,
  onChange,
}: {
  value: SiteContent['policies']
  onChange: (v: SiteContent['policies']) => void
}) {
  const keys = Object.keys(value)
  const [key, setKey] = useState(keys[0])
  const policy = value[key]
  if (!policy) return null
  const set = (patch: Partial<typeof policy>) => onChange({ ...value, [key]: { ...policy, ...patch } })

  return (
    <>
      <label className="field-label mb-0 block max-w-sm">
        Policy
        <select value={key} onChange={e => setKey(e.target.value)} className="field mt-1.5">
          {keys.map(k => (
            <option key={k} value={k}>
              {policyNames[k] ?? value[k].title}
            </option>
          ))}
        </select>
      </label>
      <div className="mt-4">
        <Text label="Title" value={policy.title} onChange={title => set({ title })} />
        <Area label="Introduction" value={policy.intro} onChange={intro => set({ intro })} />
      </div>
      <h3 className="mt-6 font-sans text-sm font-semibold">Sections</h3>
      <div className="mt-2">
        <ListEditor
          items={policy.sections}
          onChange={sections => set({ sections })}
          blank={{ heading: '', body: [''] }}
          addLabel="Add a section"
          title={(s, i) => s.heading || `Section ${i + 1}`}
          render={(s, setSection) => (
            <>
              <Text label="Heading" value={s.heading} onChange={heading => setSection({ ...s, heading })} />
              <Area
                label="Text (leave an empty line between paragraphs)"
                rows={6}
                value={s.body.join('\n\n')}
                onChange={v =>
                  setSection({
                    ...s,
                    body: v
                      .split(/\n\s*\n/)
                      .map(p => p.trim())
                      .filter(Boolean),
                  })
                }
              />
            </>
          )}
        />
      </div>
    </>
  )
}
