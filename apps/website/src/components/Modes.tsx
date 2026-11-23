import { Exhibit, type ExhibitItem } from './Exhibit'

const MODES: ExhibitItem[] = [
  { id: 'normal', name: 'Normal Window', text: 'A vinyl deck beside your work. Switch to the mini player for just the record, with controls on hover.', media: 'media/modes/normal', video: true },
  { id: 'fullscreen', name: 'Fullscreen Room', text: 'Desktop clutter fades away. The album cover takes the whole screen, lit softly in its own colours. Press P for Party mode.', media: 'media/modes/fullscreen', video: true },
  { id: 'lyrics', name: 'Fullscreen Lyrics', text: 'Time-synced lyrics beside the record. Click any line to travel straight to that moment.', media: 'media/modes/fullscreen-lyrics', video: true },
  { id: 'screensaver', name: 'Screensaver', text: 'When your PC rests, Kissa steps forward as a living album screensaver, still spinning.', media: 'media/modes/screensaver', video: true },
  { id: 'screensaver-lyrics', name: 'Screensaver Lyrics', text: 'The screensaver, with lyrics flowing in time while the room rests.', media: 'media/modes/screensaver-lyrics', video: true },
  { id: 'crate', name: 'Record Crate', text: 'Your records on a wall you flip through, the front one sliding out of its sleeve. Drag, scroll or use the arrow keys.', media: 'media/modes/crate', video: true },
  { id: 'shelf', name: 'Record Shelf', text: 'Everything you have played, as a grid of sleeves. Open any record for its details, plays and a card to share.', media: 'media/modes/shelf', video: true }
]

export function ModesChapter({ active }: { active: boolean }) {
  return <Exhibit id="modes" active={active} title={['Seven ways to sit', '*with a record.*']} items={MODES} kind="gilt" />
}
