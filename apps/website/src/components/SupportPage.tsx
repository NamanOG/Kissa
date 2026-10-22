import { useEffect, useRef, useState } from 'react'
import { hasInternational, hasValidUpi, support as defaultSupport, upiLink, type SupportConfig } from '../data/support'
import { brandMark } from '../lib/brandMark'

function CopyUpiId({ id }: { id: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'error'>('idle')
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => {
    if (resetTimer.current) clearTimeout(resetTimer.current)
  }, [])

  const copy = async (): Promise<void> => {
    if (resetTimer.current) clearTimeout(resetTimer.current)
    try {
      await navigator.clipboard.writeText(id)
      setState('copied')
    } catch {
      setState('error')
    }
    resetTimer.current = setTimeout(() => setState('idle'), 4000)
  }

  return (
    <div className="support-page-copyGroup">
      <button type="button" className="support-page-copyButton" onClick={copy} aria-describedby="upi-copy-feedback">
        {state === 'copied' ? 'Copied' : 'Copy UPI ID'}
      </button>
      <span id="upi-copy-feedback" className="support-page-copyFeedback" role="status">
        {state === 'copied' ? 'UPI ID copied to clipboard.' : state === 'error' ? 'Could not copy. Select the ID above.' : ''}
      </span>
    </div>
  )
}

export function SupportPage({ base = '/', config = defaultSupport, preview = false }: { base?: string; config?: SupportConfig; preview?: boolean }) {
  const upi = upiLink(config)
  const showUpi = hasValidUpi(config)
  const showInternational = hasInternational(config)

  return (
    <div className="support-page-page">
      <header className="support-page-header">
        <a href="#main-content" className="skip-link">Skip to content</a>
        <a href={base} className="support-page-brand" aria-label="Kissa home">
          <img {...brandMark(base, 30)} width="30" height="30" alt="" />
          Kissa
        </a>
        <a href={base} className="support-page-secondaryButton support-page-backButton">Back to Kissa</a>
      </header>

      <main id="main-content" tabIndex={-1}>
        {preview && <p className="support-page-preview" role="note">Local preview. These are placeholder payment details.</p>}

        <section className="support-page-intro" aria-labelledby="support-title">
          <p className="support-page-eyebrow">Support Kissa</p>
          <h1 id="support-title">Keep Kissa <span>spinning.</span></h1>
          <div className="support-page-personalNote">
            <p className="support-page-introText">
              Thank you for making Kissa part of your day. Every listen and bit of support means a lot to me.
            </p>
            <p className="support-page-signature">
              <span>Naman</span>
              <span>Creator of Kissa</span>
            </p>
          </div>
          <p className="support-page-promise">Always free. No ads, no locked features.</p>
        </section>

        <div className={`support-page-methods ${showUpi && showInternational ? '' : 'support-page-singleMethod'}`}>
          {showUpi && (
            <section className="support-page-method" aria-labelledby="support-upi">
              <div className="support-page-methodHeading">
                <p className="support-page-eyebrow">In India</p>
                <h2 id="support-upi">With UPI</h2>
                <p>Scan with any UPI app. Choose your own amount.</p>
              </div>
              <div className="support-page-upiBody">
                {config.upiQrImage && (
                  <figure className="support-page-qrFrame">
                    <img src={`${base}${config.upiQrImage}`} width="176" height="176" alt={`UPI QR code for ${config.upiId}`} />
                  </figure>
                )}
                <div className="support-page-upiDetails">
                  <p className="support-page-detailLabel">UPI ID</p>
                  <code className="support-page-upiId">{config.upiId}</code>
                  <p className="support-page-payee">Payee: {config.upiName}</p>
                  <CopyUpiId id={config.upiId!} />
                  {upi && <a className="support-page-secondaryButton" href={upi}>Open a UPI app</a>}
                </div>
              </div>
            </section>
          )}

          {showInternational && (
            <section className="support-page-method support-page-international" aria-labelledby="support-intl">
              <div className="support-page-methodHeading">
                <p className="support-page-eyebrow">Outside India</p>
                <h2 id="support-intl">A coffee goes a long way.</h2>
                <p>A little support for the next fix, the next detail, and the time that goes into both.</p>
              </div>
              <a
                className="support-page-primaryButton"
                href={config.international!.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Support Kissa on ${config.international!.label} (opens in a new tab)`}
              >
                <span aria-hidden="true">💿</span>
                Support Kissa
              </a>
              <p className="support-page-providerNote">You&apos;ll continue on {config.international!.label}.</p>
              <p className="support-page-thankYou">Whatever the amount, thank you.</p>
            </section>
          )}
        </div>

        <aside className="support-page-otherWays" aria-label="Other ways to support Kissa">
          <p>Just listening is enough. A kind word helps, too.</p>
          <a className="support-page-secondaryButton" href="https://apps.microsoft.com/detail/9p3n4x4wm80j" target="_blank" rel="noopener noreferrer" aria-label="Leave a Microsoft Store review (opens in a new tab)">
            Leave a review
          </a>
        </aside>
      </main>

      <footer className="support-page-footer">
        <p>Made independently, by <a href="https://www.glyphcode.studio/">GlyphCode</a>.</p>
        <nav aria-label="Support page links">
          <a className="support-page-secondaryButton" href={`${base}#faq`}>Questions?</a>
          <a className="support-page-secondaryButton" href="https://github.com/NamanOG/Kissa/blob/main/PRIVACY.md">Privacy</a>
        </nav>
      </footer>
    </div>
  )
}
