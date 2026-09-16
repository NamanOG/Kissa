export type UpdateState =
  | 'idle'
  | 'checking'
  | 'up-to-date'
  | 'available'
  | 'downloading'
  | 'downloaded'
  | 'installing'
  | 'error'
  | 'cancelled'

export interface UpdateProgress {
  percent: number
  transferredBytes: number
  totalBytes: number
  bytesPerSecond: number
}

export interface UpdateInfo {
  version: string
  releaseName: string
  releaseDate?: string
  releaseNotes?: string
  assetName: string
  assetSize: number
  downloadUrl: string
  isPortable: boolean
}

export interface UpdateStatusPayload {
  state: UpdateState
  currentVersion: string
  updateInfo: UpdateInfo | null
  progress: UpdateProgress | null
  downloadedFilePath: string | null
  error: string | null
  isScreensaverActive: boolean
  isPortable: boolean
}

export interface UpdateInstallResult {
  success: boolean
  action?: 'restarting' | 'revealed'
  error?: string
}
