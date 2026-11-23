import { MotionConfig } from 'motion/react'
import { Analytics } from '@vercel/analytics/react'
import { ReserveSection } from '@reserve'
import { SiteNav } from './components/SiteNav'
import { Story } from './components/Story'
import { Noren } from './components/Noren'
import { useSmoothScroll } from './lib/useSmoothScroll'
import { Sleeve } from './components/Sleeve'
import { Faq } from './components/Faq'
import { DownloadCta } from './components/DownloadCta'
import { SiteFooter } from './components/SiteFooter'
import { FeaturePage } from './components/FeaturePage'
import { featurePages } from './data/featurePages'
import { SupportPage } from './components/SupportPage'
import { NotFoundPage } from './components/NotFoundPage'
import { support, supportIsConfigured, SUPPORT_PREVIEW_CONFIG } from './data/support'
import { SCENE_TONES as T } from './data/scenes'

const PAPER = '#f3e6cc'
const NIGHT = '#171a3d'

function Home() {
  useSmoothScroll()
  return (
    <MotionConfig reducedMotion="user">
      <div id="top" />
      <SiteNav />

      <main id="main-content">
        <Story />
        {ReserveSection ? (
          <>
            <Noren from={T.study.floor} to={NIGHT} />
            <ReserveSection />
            <Noren from={NIGHT} to={PAPER} />
          </>
        ) : (
          <Noren from={T.study.floor} to={PAPER} />
        )}
        <Sleeve />
        <Noren from="#a8321a" to={T.faq.top} />
        <Faq />
        <Noren from={T.faq.floor} to={T.cta.top} />
        <DownloadCta />
      </main>

      <SiteFooter />
      <Analytics />
    </MotionConfig>
  )
}

export default function App() {
  const base = import.meta.env.BASE_URL
  const path = typeof window === 'undefined' ? '' : window.location.pathname.replace(base, '').replace(/\/$/, '')
  const page = featurePages.find((item) => item.slug === path)
  // /support/ exists only once real payment details are set (or in a local preview build).
  const supportPreview = import.meta.env.VITE_SUPPORT_PREVIEW === '1' && !supportIsConfigured()
  if (path === 'support' && (supportIsConfigured() || supportPreview)) {
    if (typeof document !== 'undefined') document.title = 'Support Kissa | Kissa'
    return <SupportPage base={base} config={supportPreview ? SUPPORT_PREVIEW_CONFIG : support} preview={supportPreview} />
  }
  if (page) {
    // The built page carries its own title; keep it when the app takes over in the browser.
    if (typeof document !== 'undefined') document.title = page.title
    return <><FeaturePage page={page} base={base} /><Analytics /></>
  }
  // Anything else that is not the home page. Production serves dist/404.html for these;
  // this covers the dev server and any host that falls back to index.html.
  if (path !== '' && path !== 'index.html') {
    if (typeof document !== 'undefined') document.title = 'Page not found | Kissa'
    return <><NotFoundPage base={base} showSupport={supportIsConfigured()} /><Analytics /></>
  }
  return <Home />
}
