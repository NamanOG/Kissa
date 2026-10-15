import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Copy, Download, Loader2 } from 'lucide-react'
import { SharePayload, AspectRatio } from '../../../../types/share'
import { ShareCardRenderer } from './ShareCardRenderer'
import { Button } from '../../components/ui/Button'
import { cn } from '../../utils/cn'

interface SharePreviewModalProps {
  payload: SharePayload | null
  onClose: () => void
}

export function SharePreviewModal({ payload, onClose }: SharePreviewModalProps) {
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('4:5')
  const [exporting, setExporting] = useState<'copy' | 'save' | null>(null)

  if (!payload) return null

  const activePayload: SharePayload = { ...payload, aspectRatio }

  const handleExport = async (action: 'copy' | 'save') => {
    if (!window.electron) return
    try {
      setExporting(action)
      const success = await window.electron.exportShare({
        payload: activePayload,
        action
      })
      if (success) {
        onClose()
      }
    } catch (e) {
      console.error('[Share] Export failed', e)
    } finally {
      setExporting(null)
    }
  }

  // The actual preview is 1080px wide. We scale it down to fit in the modal.
  const isSquare = aspectRatio === '1:1'
  const targetWidth = 1080
  const targetHeight = isSquare ? 1080 : 1350
  
  const scale = typeof window !== 'undefined' ? Math.min((window.innerHeight * 0.6) / targetHeight, 0.4) : 0.35

  return (
    // Rendered at the top of the page: inside the shelf it sat underneath the dock.
    createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[90] flex items-center justify-center bg-black/75 p-4"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 16 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="relative flex flex-col w-full max-w-3xl max-h-[90vh] bg-[var(--deck-bg)] rounded-[28px] shadow-[0_30px_80px_rgba(0,0,0,0.65)] overflow-hidden border border-ink/[0.08]"
        >
          <div className="flex items-center justify-between px-8 pt-7 pb-5">
            <h2 className="font-kissa-editorial text-[26px] font-normal text-ink">Share a card</h2>
            <button
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full text-dim hover:bg-ink/[0.08] hover:text-ink transition-colors cursor-pointer" aria-label="Close"
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
                margin: `-${targetHeight * (1 - scale) / 2}px -${targetWidth * (1 - scale) / 2}px`
              }}
            >
              <ShareCardRenderer payload={activePayload} isExport={false} />
            </div>
          </div>

          <div className="px-8 py-5 flex items-center justify-between gap-4">
            <div className="flex rounded-full border border-ink/10 bg-black/30 p-1">
              <button
                onClick={() => setAspectRatio('4:5')}
                className={cn(
                  "px-4 py-1.5 text-[12px] font-semibold rounded-full transition-colors cursor-pointer",
                  aspectRatio === '4:5' ? "bg-ink/[0.12] text-ink" : "text-dim hover:text-ink"
                )}
              >
                Portrait
              </button>
              <button
                onClick={() => setAspectRatio('1:1')}
                className={cn(
                  "px-4 py-1.5 text-[12px] font-semibold rounded-full transition-colors cursor-pointer",
                  aspectRatio === '1:1' ? "bg-ink/[0.12] text-ink" : "text-dim hover:text-ink"
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
                {exporting === 'copy' ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                Copy image
              </Button>
              <Button
                disabled={!!exporting}
                onClick={() => handleExport('save')}
                className="rounded-full font-sans normal-case tracking-normal text-[12.5px] font-bold bg-tone text-[var(--surface)] hover:bg-tone/90"
              >
                {exporting === 'save' ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Download className="w-4 h-4 mr-2" />}
                Save image
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
    )
  )
}
