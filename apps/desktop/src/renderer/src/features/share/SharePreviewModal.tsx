import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { X, Copy, Download, Loader2 } from 'lucide-react'
import { SharePayload, AspectRatio } from '../../../../types/share'
import { ShareCardRenderer } from './ShareCardRenderer'
import { Button } from '../../components/ui/Button'
import { cn } from '../../utils/cn'
import { usePlayerStore } from '../../stores/playerStore'
import { useT } from '@renderer/i18n'

interface SharePreviewModalProps {
  payload: SharePayload | null
  onClose: () => void
}

export function SharePreviewModal({ payload, onClose }: SharePreviewModalProps) {
  const t = useT()
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('4:5')
  const [exporting, setExporting] = useState<'copy' | 'save' | null>(null)
  const [error, setError] = useState('')
  const dialogRef = useRef<HTMLDialogElement>(null)
  const reducedMotion = useReducedMotion()
  const listenerName = usePlayerStore((s) => s.listenerName)

  useEffect(() => {
    if (!payload) return
    const opener = document.activeElement as HTMLElement | null
    dialogRef.current?.showModal()
    return () => opener?.focus()
  }, [payload])

  if (!payload) return null

  const activePayload: SharePayload = { ...payload, aspectRatio, listenerName }

  const handleExport = async (action: 'copy' | 'save') => {
    if (!window.electron) return
    try {
      setExporting(action)
      setError('')
      const success = await window.electron.exportShare({
        payload: activePayload,
        action
      })
      if (success) {
        onClose()
      } else {
        setError(
          action === 'copy'
            ? t('card.copyFail')
            : t('card.saveFail')
        )
      }
    } catch (e) {
      console.error('[Share] Export failed', e)
      setError(t('card.exportFail'))
    } finally {
      setExporting(null)
    }
  }

  // The actual preview is 1080px wide. We scale it down to fit in the modal.
  const isSquare = aspectRatio === '1:1'
  const targetWidth = 1080
  const targetHeight = isSquare ? 1080 : 1350

  const scale =
    typeof window !== 'undefined'
      ? Math.min(
          (window.innerHeight * 0.6) / targetHeight,
          (window.innerWidth - 100) / targetWidth,
          0.4
        )
      : 0.35

  return (
    // Rendered at the top of the page: inside the shelf it sat underneath the dock.
    createPortal(
      <AnimatePresence>
        <dialog
          ref={dialogRef}
          aria-label={t('card.title')}
          onCancel={(e) => {
            e.preventDefault()
            if (!exporting) onClose()
          }}
          className="m-auto w-[calc(100%-32px)] max-w-3xl border-0 bg-transparent p-0 text-ink backdrop:bg-black/75"
        >
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="relative flex flex-col w-full max-w-3xl max-h-[90vh] kissa-sheet rounded-[28px] shadow-[0_30px_80px_rgba(0,0,0,0.65)] overflow-hidden border border-ink/[0.08]"
          >
            <div className="flex items-center justify-between px-8 pt-7 pb-5">
              <h2 className="font-kissa-editorial text-[26px] font-normal text-ink">
                {t('card.title')}
              </h2>
              <button
                onClick={onClose}
                disabled={!!exporting}
                className="flex h-9 w-9 items-center justify-center rounded-full text-dim hover:bg-ink/[0.08] hover:text-ink transition-colors cursor-pointer"
                aria-label={t('common.close')}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-8 py-6 flex flex-col items-center justify-center bg-black/25 min-h-[50vh]">
              <div
                className="relative shadow-2xl overflow-hidden rounded-md transition-[transform,margin,width,height] duration-content ease-primary"
                style={{
                  width: targetWidth,
                  height: targetHeight,
                  transform: `scale(${scale})`,
                  transformOrigin: 'center center',
                  margin: `-${(targetHeight * (1 - scale)) / 2}px -${(targetWidth * (1 - scale)) / 2}px`
                }}
              >
                <ShareCardRenderer payload={activePayload} isExport={false} />
              </div>
            </div>

            <div className="px-8 py-5 flex flex-wrap items-center justify-between gap-4">
              <div className="flex rounded-full border border-ink/10 bg-black/30 p-1">
                <button
                  onClick={() => setAspectRatio('4:5')}
                  disabled={!!exporting}
                  aria-pressed={aspectRatio === '4:5'}
                  className={cn(
                    'px-4 py-1.5 text-[12px] font-semibold rounded-full transition-colors cursor-pointer',
                    aspectRatio === '4:5' ? 'bg-ink/[0.12] text-ink' : 'text-dim hover:text-ink'
                  )}
                >
                  Portrait
                </button>
                <button
                  onClick={() => setAspectRatio('1:1')}
                  disabled={!!exporting}
                  aria-pressed={aspectRatio === '1:1'}
                  className={cn(
                    'px-4 py-1.5 text-[12px] font-semibold rounded-full transition-colors cursor-pointer',
                    aspectRatio === '1:1' ? 'bg-ink/[0.12] text-ink' : 'text-dim hover:text-ink'
                  )}
                >
                  Square
                </button>
              </div>

              <div className="flex gap-4">
                <Button
                  variant="secondary"
                  disabled={!!exporting}
                  onClick={() => handleExport('copy')}
                  className="rounded-full font-sans normal-case tracking-normal text-[12.5px] font-semibold"
                >
                  {exporting === 'copy' ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Copy className="w-4 h-4 mr-2" />
                  )}
                  {t('card.copy')}
                </Button>
                <Button
                  disabled={!!exporting}
                  onClick={() => handleExport('save')}
                  className="rounded-full font-sans normal-case tracking-normal text-[12.5px] font-bold bg-tone text-[var(--surface)] hover:bg-tone/90"
                >
                  {exporting === 'save' ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  {t('card.save')}
                </Button>
              </div>
            </div>
            {error && (
              <p role="status" className="px-8 pb-5 text-sm text-ink">
                {error}
              </p>
            )}
          </motion.div>
        </dialog>
      </AnimatePresence>,
      document.body
    )
  )
}
