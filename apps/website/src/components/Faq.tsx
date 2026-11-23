import styles from './Faq.module.css'
import { Card, Room } from './Room'
import { RevealHeading } from './ui/Reveal'
import { Cat, Teacup } from './ui/Cat'
import faq from '../data/faq.json'

/** The same questions are published as FAQPage structured data (see vite.config.ts). */
export function Faq() {
  return (
    <Room id="faq" scene="faq" labelledBy="faq-heading" fit>
      <Card className={styles.intro}>
        <RevealHeading id="faq-heading" className={styles.title} lines={['Before you', '*drop the needle.*']} />
        <Teacup />
      </Card>

      <Card className={styles.menu}>
        <Cat className={styles.cat} />
        <div className={styles.columns}>
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
      </Card>
    </Room>
  )
}
