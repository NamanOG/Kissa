import { SegmentedTabs } from '@renderer/components/ui/SegmentedTabs'
import { useT } from '@renderer/i18n'
import { useFeaturesStore, type SoundLightAmount } from '@renderer/stores/featuresStore'
import { cn } from '@renderer/utils/cn'

/**
 * "How much it moves": Gentle, Balanced or Lively. Rests (dimmed, not focusable) while Moving
 * light or its sound follow is off. Used in Settings > Turntable and in the Room light popover.
 */
export function SoundAmountTabs({
  disabled = false,
  appearance = 'outline'
}: {
  disabled?: boolean
  appearance?: 'outline' | 'glass'
}): React.JSX.Element {
  const t = useT()
  const amount = useFeaturesStore((s) => s.soundLightAmount)
  const setAmount = useFeaturesStore((s) => s.setSoundLightAmount)
  return (
    <div
      data-sound-amount=""
      aria-disabled={disabled || undefined}
      inert={disabled || undefined}
      className={cn('transition-opacity duration-200', disabled && 'opacity-45')}
    >
      <SegmentedTabs<SoundLightAmount>
        kind="radio"
        size="sm"
        appearance={appearance}
        label={t('turntable.soundAmount')}
        value={amount}
        onChange={setAmount}
        tabs={[
          { id: 'gentle', label: t('turntable.soundAmount.gentle') },
          { id: 'balanced', label: t('turntable.soundAmount.balanced') },
          { id: 'lively', label: t('turntable.soundAmount.lively') }
        ]}
      />
    </div>
  )
}
