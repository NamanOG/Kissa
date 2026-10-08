import { MotionConfig } from 'motion/react'
import { SiteNav } from './components/SiteNav'
import { Stage } from './components/Stage'
import { Waveline } from './components/Waveline'
import { PluckString } from './components/ui/PluckString'
import { Modes } from './components/Modes'
import { Rooms } from './components/Rooms'
import { Sleeve } from './components/Sleeve'
import { Faq } from './components/Faq'
import { DownloadCta } from './components/DownloadCta'
import { SiteFooter } from './components/SiteFooter'

export default function App() {
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
        <Sleeve />
        <Faq />
        <PluckString />
        <DownloadCta />
      </main>

      <PluckString />
      <SiteFooter />
    </MotionConfig>
  )
}
