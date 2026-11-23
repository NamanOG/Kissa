import { Exhibit, type ExhibitItem } from './Exhibit'
import { LISTENING_ROOMS } from '../data/rooms'

const ROOMS: ExhibitItem[] = [
  ...LISTENING_ROOMS.map((room) => ({ id: room.id, name: room.name, text: room.description, media: room.image, swatch: room.accentColor })),
  { id: 'match-album', name: 'Match Album', text: 'No fixed room. The light is drawn from the colours of the cover on the platter.', media: 'media/rooms/room-match-album', swatch: '#d946a8' }
]

export function RoomsChapter({ active }: { active: boolean }) {
  return (
    <Exhibit
      id="rooms"
      active={active}
      title={['Pick a room', '*to listen in.*']}
      lead="Free in Kissa: each room re-lights the deck to suit the hour, the weather or the record."
      items={ROOMS}
      kind="lacquer"
    />
  )
}
