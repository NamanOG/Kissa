import styles from './Faq.module.css'
import { RevealHeading } from './ui/Reveal'
import faq from '../data/faq.json'

/**
 * Questions people actually search for. The same list is published as
 * FAQPage structured data in index.html (see vite.config.ts).
 */
export function Faq() {
  return (
    <section id="faq" className={styles.section} aria-labelledby="faq-heading">
      <div className={`container ${styles.layout}`}>
        <header className={styles.header}>
          <span className="label">Questions</span>
          <RevealHeading id="faq-heading" className="section-title" lines={['Before you', '*drop the needle.*']} />
        </header>

        <div className={styles.list}>
          {faq.map((item) => (
            <details key={item.q} className={styles.item} name="kissa-faq">
              <summary className={styles.question}>
                <h3>{item.q}</h3>
                <span className={styles.mark} aria-hidden="true" />
              </summary>
              <p className={styles.answer}>{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
