import { desktopCapturer, session, type WebFrameMain } from 'electron'

/**
 * Sound for the meters and the light: what the PC is playing, from Windows' loopback capture.
 *
 * The renderer asks with getDisplayMedia; this answers without a picker, and only for Kissa's
 * own main window. Chromium needs a video source alongside the loopback audio, so the first
 * screen is offered and the renderer stops that video track at once. The sound is measured in
 * the renderer and never recorded, stored or sent anywhere.
 */
export function isTrustedFrame(frame: Pick<WebFrameMain, 'processId' | 'routingId'> | null | undefined, main: Pick<WebFrameMain, 'processId' | 'routingId'> | null | undefined): boolean {
  if (!frame || !main) return false
  return frame.processId === main.processId && frame.routingId === main.routingId
}

export function installLoopbackHandler(getMainFrame: () => WebFrameMain | null | undefined): void {
  if (process.platform !== 'win32') return
  session.defaultSession.setDisplayMediaRequestHandler(
    (request, callback) => {
      if (!request.audioRequested || !isTrustedFrame(request.frame, getMainFrame())) {
        callback({})
        return
      }
      desktopCapturer
        .getSources({ types: ['screen'], thumbnailSize: { width: 0, height: 0 } })
        .then((sources) => {
          if (!sources[0]) callback({})
          else callback({ video: sources[0], audio: 'loopback' })
        })
        .catch(() => callback({}))
    },
    { useSystemPicker: false }
  )
}
