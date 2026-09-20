import { SiteNav } from './components/SiteNav'
import { Hero } from './components/Hero'
import { ProductShowcase } from './components/ProductShowcase'
import { VideoShowcase } from './components/VideoShowcase'
import { ListeningEnvironments } from './components/ListeningEnvironments'
import { AboutCreator } from './components/AboutCreator'
import { DownloadCta } from './components/DownloadCta'
import { SiteFooter } from './components/SiteFooter'

export default function App() {
  return (
    <>
      <SiteNav />

      <main id="main-content">
        <Hero />
        <ProductShowcase />
        <VideoShowcase />
        <ListeningEnvironments />
        <AboutCreator />
        <DownloadCta />
      </main>

      <SiteFooter />
    </>
  )
}
