import { MotionConfig } from 'motion/react'
import { Analytics } from '@vercel/analytics/react'
import { SiteNav } from './components/SiteNav'
import { Stage } from './components/Stage'
import { Waveline } from './components/Waveline'
import { PluckString } from './components/ui/PluckString'
import { Modes } from './components/Modes'
import { Rooms } from './components/Rooms'
import { StudyRoom } from './components/StudyRoom'
import { Sleeve } from './components/Sleeve'
import { Faq } from './components/Faq'
import { DownloadCta } from './components/DownloadCta'
import { SiteFooter } from './components/SiteFooter'
import { FeaturePage } from './components/FeaturePage'
import { featurePages } from './data/featurePages'

export default function App() {
  const base = import.meta.env.BASE_URL
  const path = window.location.pathname.replace(base, '').replace(/\/$/, '')
  const page = featurePages.find((item) => item.slug === path)
  if (page) {
    // The built page carries its own title; keep it when the app takes over in the browser.
    if (typeof document !== 'undefined') document.title = page.title
    return <><FeaturePage page={page} base={base} /><Analytics /></>
  }
  return (
    <MotionConfig reducedMotion="user">
      <div id="top" />
      <SiteNav />

      <main id="main-content">
        <Stage />
        <Waveline />
        <PluckString />
        <Modes />
        <PluckString />
        <Rooms />
        <PluckString />
        <StudyRoom />
        <Sleeve />
        <Faq />
        <PluckString />
        <DownloadCta />
      </main>

      <PluckString />
      <SiteFooter />
      <Analytics />
    </MotionConfig>
  )
}
