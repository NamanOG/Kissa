export type ShareType = 'album' | 'collection' | 'stats'
export type AspectRatio = '4:5' | '1:1'

export interface AlbumShareData {
  album: string
  artist: string
  artworkUrl?: string
  playCount: number
  firstListened: number
  lastListened: number
  tracksEncountered: string[]
}

export interface StatsShareData {
  totalAlbums: number
  uniqueArtists: number
  totalPlays: number
  mostPlayedAlbum?: AlbumShareData
  mostRecentAlbum?: AlbumShareData
  firstListenDate: number
}

export interface SharePayload {
  type: ShareType
  data: any // AlbumShareData | AlbumShareData[] | StatsShareData
  aspectRatio: AspectRatio
}

export interface ShareExportOptions {
  payload: SharePayload
  action: 'copy' | 'save'
}
