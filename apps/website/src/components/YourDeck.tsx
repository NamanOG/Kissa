import { Exhibit, type ExhibitItem } from './Exhibit'

const PANELS: ExhibitItem[] = [
  {
    id: 'moving-light',
    name: 'Moving light',
    text: 'The colours of the album drift slowly behind the room. Let them move with the beat, turn the room light down, or set a sleep timer.',
    media: 'media/deck/moving-light',
    video: true
  },
  {
    id: 'editions',
    name: 'Your turntable',
    text: 'Walnut, Porcelain or Studio Silver, then a record: classic black, a colour, marble, tortoiseshell, splatter, or pressed in the colours of the album.',
    media: 'media/deck/editions',
    video: true
  }
]

export function DeckChapter({ active }: { active: boolean }) {
  return <Exhibit id="your-deck" active={active} title={['A deck that', '*takes after the record.*']} items={PANELS} kind="walnut" />
}
