import { careSteps, faqs, heroSlides, policies, safetyNotes, store } from './store'
import { testimonials } from './products'

// Website text the owner edits in Dashboard > Website. These are the
// starting values; with Supabase connected they load from site_content.

export const about = {
  title: ['Made slowly, in a small', 'room in Quetta.'],
  intro:
    'One maker, a few helping hands and a shelf of fragrance oils. We pour candles that smell like the places we come from.',
  storyHeading: 'How it began',
  story: [
    'It started with a gift. A friend was moving abroad and wanted something that smelled like home. Nothing in the shops came close, so the first Desi Gulab candle was poured in a steel pot on a kitchen stove.',
    'She asked for six more. Then her cousins did. The stove became a workbench, the workbench became a studio, and the list of fragrances grew: chai on a cold morning, motia after dark, the first rain on dry earth.',
    'We are still small on purpose. Small batches mean we can test every pour, trim every wick and write your gift note by hand.',
  ],
  processHeading: 'How a candle is made',
  process: [
    { title: 'Melt', text: 'Soy wax is melted slowly to 80°C in batches of forty candles.' },
    { title: 'Blend', text: 'Fragrance oil is stirred in by hand for two full minutes so it binds with the wax.' },
    { title: 'Pour', text: 'Each jar is wicked, centred and poured, then left untouched overnight.' },
    { title: 'Cure', text: 'Candles rest for two weeks before they are sold. That is what makes the scent carry.' },
  ],
  closing: 'Somewhere on the shelf is the one that smells like home.',
}

export const social = {
  instagram: store.instagram,
  facebook: store.facebook,
  tiktok: '',
}

export const seo = {
  title: 'Candle Lit Studio | Hand-poured candles, delivered across Pakistan',
  description:
    'Hand-poured soy candles from Quetta, in scents that feel like home: desi gulab, chai and cardamom, motia and oud. Delivered across Pakistan.',
}

export type HeroSlide = (typeof heroSlides)[number]
export type Faq = (typeof faqs)[number]
export type Policy = (typeof policies)[string]
export type CareStep = (typeof careSteps)[number]
export type Testimonial = (typeof testimonials)[number]

/** Everything in site_content, keyed the same way */
export type SiteContent = {
  hero: HeroSlide[]
  faqs: Faq[]
  policies: Record<string, Policy>
  care: { steps: CareStep[]; safety: string[] }
  about: typeof about
  testimonials: Testimonial[]
  social: typeof social
  seo: typeof seo
}

/** The current values (demo data, or the live ones once hydrated) */
export const currentContent = (): SiteContent => ({
  hero: heroSlides,
  faqs,
  policies,
  care: { steps: careSteps, safety: safetyNotes },
  about,
  testimonials,
  social,
  seo,
})

const replaceList = <T>(target: T[], next: T[] | undefined) => {
  if (Array.isArray(next)) target.splice(0, target.length, ...next)
}

/** Copies saved content into the modules every page reads */
export function applyContent(content: Partial<SiteContent>) {
  replaceList(heroSlides, content.hero as typeof heroSlides)
  replaceList(faqs, content.faqs)
  replaceList(testimonials, content.testimonials)
  if (content.care) {
    replaceList(careSteps, content.care.steps)
    replaceList(safetyNotes, content.care.safety)
  }
  if (content.policies) {
    for (const key of Object.keys(policies)) if (!(key in content.policies)) delete policies[key]
    Object.assign(policies, content.policies)
  }
  if (content.about) Object.assign(about, content.about)
  if (content.social) {
    Object.assign(social, content.social)
    Object.assign(store, { instagram: content.social.instagram, facebook: content.social.facebook })
  }
  if (content.seo) Object.assign(seo, content.seo)
}
