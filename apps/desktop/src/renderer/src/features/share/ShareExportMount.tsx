import React, { useEffect, useState } from 'react'
import { SharePayload } from '../../../../types/share'
import { ShareCardRenderer } from './ShareCardRenderer'

export function ShareExportMount() {
  const [payload, setPayload] = useState<SharePayload | null>(null)

  useEffect(() => {
    let mounted = true
    const fetchPayload = async () => {
      try {
        const data = await window.electron?.getSharePayload()
        if (mounted && data) {
          setPayload(data)
        }
      } catch (err) {
        console.error('[ShareExportMount] Failed to get payload', err)
      }
    }
    fetchPayload()
    return () => { mounted = false }
  }, [])

  if (!payload) return null

  // The ShareCardRenderer is responsible for firing kissa:share-ready 
  // once all images and fonts are loaded and adaptive colors are extracted.
  return (
    <div className="w-full h-full bg-black flex items-center justify-center overflow-hidden">
      <ShareCardRenderer payload={payload} isExport />
    </div>
  )
}
