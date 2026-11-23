import { Exhibit, type ExhibitItem } from './Exhibit'
import { asset } from '../lib/asset'
import styles from './Chapter.module.css'

const STUDY_ROOMS: ExhibitItem[] = [
  { id: 'rain', name: 'Rain', text: 'Rain on a garden under the eaves. The glass mists over as you focus.', media: 'media/study/study-rain' },
  { id: 'snow', name: 'Snow', text: 'A quiet pine forest in falling snow. Frost gathers as the block runs.', media: 'media/study/study-snow' },
  { id: 'forest', name: 'Forest', text: 'Light through the leaves, warming from morning towards midday.', media: 'media/study/study-forest' },
  { id: 'night', name: 'Night', text: 'A still lake at blue hour. The stars come out while you work.', media: 'media/study/study-night' },
  { id: 'fireplace', name: 'Fireplace', text: 'A cabin hearth whose flames move and throw the odd spark.', media: 'media/study/study-fireplace' }
]

export function FocusChapter({ active }: { active: boolean }) {
  return (
    <Exhibit
      id="study"
      active={active}
      title={['A room to work in,', '*the record still turning.*']}
      lead="A real view, its own field recording, a focus clock with breaks, and your music on the record beside you."
      items={STUDY_ROOMS}
      kind="gilt"
    >
      <p className={styles.more}>
        <a href={asset('study-room/')}>Step inside the Focus Room</a>
      </p>
    </Exhibit>
  )
}
