import { memo } from 'react'
import { cn } from '@renderer/utils/cn'
import { TurntableBase } from './TurntableBase'
import { TurntableShadow } from './TurntableShadow'
import { Platter } from './Platter'
import { Slipmat } from './Slipmat'
import { TonearmAssembly } from './TonearmAssembly'
import { MechanicalControls } from './MechanicalControls'
import { VinylEngine } from '../vinyl'
import type { VinylEngineProps } from '../vinyl/types'

/**
 * 3D Turntable Engine.
 * Accurately aligns the 3D plinth chassis, machined aluminum platter cylinder,
 * audiophile vinyl record, tonearm assembly, and tactile on-deck controls.
 */
export const TurntableEngine = memo(
  ({ className, albumArt, isActive, ...props }: VinylEngineProps): React.JSX.Element => {
    return (
      <div
        className={cn(
          'relative flex items-center justify-center',
          'w-full max-w-[840px]',
          className
        )}
        style={{ perspective: '1400px' }}
        {...props}
      >
        {/* Floor and contact shadow */}
        <TurntableShadow />

        {/* 3D-perspective tilted turntable plinth */}
        <div
          className="relative w-full aspect-[10/6.8] pointer-events-none"
          style={{
            transform: 'rotateX(13deg) rotateY(-0.8deg)',
            transformStyle: 'preserve-3d'
          }}
        >
          <TurntableBase className="absolute inset-0 overflow-visible">
            {/* ── Platter + Vinyl assembly (Aligned with recessed well) ── */}
            <div
              className="absolute flex items-center justify-center pointer-events-none"
              style={{
                left: '13.5%',
                top: '5%',
                width: '57%',
                height: '84%'
              }}
            >
              <div className="relative w-full h-0 pb-[100%]">
                <div className="absolute inset-0 flex items-center justify-center">
                  {/* Heavy Machined Metal Platter Cylinder */}
                  <Platter size="100%" />
                  {/* Anti-static Felt Slipmat */}
                  <Slipmat size="98%" />
                  {/* Audiophile Vinyl Record */}
                  <VinylEngine
                    albumArt={albumArt}
                    isActive={isActive}
                    className="w-[99%] h-[99%] max-w-none"
                  />
                </div>
              </div>
            </div>

            {/* ── Tonearm Assembly ── */}
            <TonearmAssembly
              className="absolute"
              style={{
                right: '4%',
                top: '2%',
                width: '26%',
                height: '92%'
              }}
            />

            {/* ── On-plinth tactile mechanical controls ── */}
            <MechanicalControls />
          </TurntableBase>
        </div>
      </div>
    )
  }
)

TurntableEngine.displayName = 'TurntableEngine'
