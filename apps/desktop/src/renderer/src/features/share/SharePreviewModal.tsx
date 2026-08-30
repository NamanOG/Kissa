import React, { useState } from 'react'
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

  // Ensure payload uses current aspect ratio
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
        // Automatically close on success
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
  
  // Calculate scale for a max height of 60vh
  const scale = typeof window !== 'undefined' ? Math.min((window.innerHeight * 0.6) / targetHeight, 0.4) : 0.35

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 16 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="relative flex flex-col w-full max-w-3xl max-h-[90vh] bg-[#111] rounded-lg shadow-2xl overflow-hidden border border-white/10"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/10">
            <h2 className="font-serif text-2xl tracking-tight text-white/90">Preview Export</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Preview Area */}
          <div className="flex-1 overflow-y-auto p-8 flex flex-col items-center justify-center bg-black/40 min-h-[50vh]">
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

          {/* Footer Controls */}
          <div className="p-6 border-t border-white/10 bg-[#161616] flex items-center justify-between">
            {/* Aspect Ratio Toggle */}
            <div className="flex bg-black/50 p-1 rounded-md border border-white/5">
              <button
                onClick={() => setAspectRatio('4:5')}
                className={cn(
                  "px-4 py-1.5 text-xs font-mono tracking-widest rounded-sm transition-colors",
                  aspectRatio === '4:5' ? "bg-white/10 text-white" : "text-white/40 hover:text-white/70"
                )}
              >
                4:5
              </button>
              <button
                onClick={() => setAspectRatio('1:1')}
                className={cn(
                  "px-4 py-1.5 text-xs font-mono tracking-widest rounded-sm transition-colors",
                  aspectRatio === '1:1' ? "bg-white/10 text-white" : "text-white/40 hover:text-white/70"
                )}
              >
                1:1
              </button>
            </div>

            {/* Actions */}
            <div className="flex gap-4">
              <Button
                variant="secondary"
                disabled={!!exporting}
                onClick={() => handleExport('copy')}
                className="font-mono text-xs uppercase tracking-widest"
              >
                {exporting === 'copy' ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                Copy Image
              </Button>
              <Button
                disabled={!!exporting}
                onClick={() => handleExport('save')}
                className="font-mono text-xs uppercase tracking-widest bg-white text-black hover:bg-white/90"
              >
                {exporting === 'save' ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Download className="w-4 h-4 mr-2" />}
                Save PNG
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
