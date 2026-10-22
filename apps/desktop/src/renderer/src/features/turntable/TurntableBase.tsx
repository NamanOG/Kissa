import React, { memo, useId } from 'react'
import { cn } from '@renderer/utils/cn'
import { useEditionsStore } from '@renderer/stores/editionsStore'
import { FINISH_PALETTES } from '@renderer/features/editions/editions'
import brushedTexture from '@renderer/media/editions/brushed-aluminium-fine.jpg'

export interface TurntableBaseProps extends React.HTMLAttributes<HTMLDivElement> { }

/**
 * 3D Turntable Plinth Deck.
 * Accurately models a high-end audiophile turntable chassis (Technics / Dieter Rams / Pro-Ject),
 * complete with high-specular chamfered edges, brushed obsidian lacquer, vertical front face,
 * recessed metallic platter well, and rubber isolation feet.
 *
 * The finish (Kissa Editions) only changes the colours of these same surfaces, so every
 * edition keeps the deck's geometry and controls. All of it is static: nothing redraws
 * while the record turns.
 */
export const TurntableBase = memo(
  ({ className, style, children, ...props }: TurntableBaseProps): React.JSX.Element => {
    const finish = useEditionsStore((s) => s.finish)
    const p = FINISH_PALETTES[finish] ?? FINISH_PALETTES.original
    const m = p.machining
    // Corner radius of the plate: soft for lacquer, tight for machined metal.
    const r = p.radius ?? 18
    const uid = useId().replace(/:/g, '')
    const id = (name: string): string => `${name}-${uid}`

    return (
      <div
        className={cn('absolute inset-0 pointer-events-none', className)}
        data-finish={finish}
        style={
          {
            '--deck-engrave': p.engrave,
            '--deck-engrave-shadow': p.engraveShadow,
            ...(p.controls && {
              '--deck-housing': p.controls.housing,
              '--deck-key-top': p.controls.keyTop,
              '--deck-key-bottom': p.controls.keyBottom,
              '--deck-bezel': p.controls.bezel
            }),
            '--deck-plate': p.plate.text,
            '--deck-plate-shadow': p.plate.shadow,
            ...style
          } as React.CSSProperties
        }
        {...props}
      >
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 1000 700"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id={id('plinth-top')} x1="10%" y1="0%" x2="90%" y2="100%">
              <stop offset="0%" stopColor={p.top[0]} />
              <stop offset="25%" stopColor={p.top[1]} />
              <stop offset="55%" stopColor={p.top[2]} />
              <stop offset="85%" stopColor={p.top[3]} />
              <stop offset="100%" stopColor={p.top[4]} />
            </linearGradient>

            <linearGradient id={id('plinth-front')} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={p.front[0]} />
              <stop offset="20%" stopColor={p.front[1]} />
              <stop offset="65%" stopColor={p.front[2]} />
              <stop offset="100%" stopColor={p.front[3]} />
            </linearGradient>

            <linearGradient id={id('front-seam-highlight')} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={p.seam[2]} />
              <stop offset="30%" stopColor={p.seam[0]} />
              <stop offset="60%" stopColor={p.seam[1]} />
              <stop offset="100%" stopColor={p.seam[2]} />
            </linearGradient>

            <linearGradient id={id('foot-grad')} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={p.feet[0]} />
              <stop offset="40%" stopColor={p.feet[1]} />
              <stop offset="80%" stopColor={p.feet[2]} />
              <stop offset="100%" stopColor={p.feet[3]} />
            </linearGradient>

            <radialGradient id={id('well-gradient')} cx="50%" cy="48%" r="50%">
              <stop offset="0%" stopColor={p.well[0]} />
              <stop offset="80%" stopColor={p.well[1]} />
              <stop offset="100%" stopColor={p.well[2]} />
            </radialGradient>

            {p.brushed && (
              <clipPath id={id('front-clip')}>
                <path d={`M 10 ${650 - r} Q 10 650 ${10 + r} 650 L ${990 - r} 650 Q 990 650 990 ${650 - r} L 990 670 Q 990 688 ${990 - Math.max(r, 8)} 688 L ${10 + Math.max(r, 8)} 688 Q 10 688 10 670 Z`} />
              </clipPath>
            )}
            {m?.sheen && (
              /* Satin lacquer: one broad, soft highlight where the room light falls, no grain. */
              <radialGradient id={id('sheen')} cx="24%" cy="12%" r="75%">
                <stop offset="0%" stopColor="#fff" stopOpacity="0.22" />
                <stop offset="45%" stopColor="#fff" stopOpacity="0.06" />
                <stop offset="100%" stopColor="#000" stopOpacity="0.06" />
              </radialGradient>
            )}
            {(p.brushed || m) && (
              <clipPath id={id('top-clip')}>
                <rect x="10" y="10" width="980" height="640" rx={r} ry={r} />
              </clipPath>
            )}
            {m?.reflection && (
              /*
               * Brushed metal spreads a light across its grain: horizontal brushing shows a soft
               * vertical band where the room's light reflects, not a diagonal shine.
               */
              <linearGradient id={id('reflection')} x1="0%" y1="0%" x2="100%" y2="0%">
                {/* Metal, unlike plastic, has real value range: a dark edge, a bright band, a dim
                    middle and a second softer band, all running across the grain. */}
                <stop offset="0%" stopColor="#000" stopOpacity="0.12" />
                <stop offset="13%" stopColor="#fff" stopOpacity="0.04" />
                <stop offset="25%" stopColor="#fff" stopOpacity="0.34" />
                <stop offset="31%" stopColor="#fff" stopOpacity="0.2" />
                <stop offset="45%" stopColor="#000" stopOpacity="0.08" />
                <stop offset="62%" stopColor="#000" stopOpacity="0.04" />
                <stop offset="74%" stopColor="#fff" stopOpacity="0.14" />
                <stop offset="86%" stopColor="#fff" stopOpacity="0" />
                <stop offset="100%" stopColor="#000" stopOpacity="0.16" />
              </linearGradient>
            )}
            {m && (
              <>
                {/* Diamond-cut chamfer: bright along the back and left, where the light falls. */}
                <linearGradient id={id('chamfer')} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={m.chamfer[0]} />
                  <stop offset="55%" stopColor={m.chamfer[1]} />
                  <stop offset="100%" stopColor={m.chamfer[1]} />
                </linearGradient>
                {/* The platter recess: its back wall in shadow, its near lip catching light. */}
                <linearGradient id={id('recess-lip')} x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#000" stopOpacity="0.55" />
                  <stop offset="55%" stopColor="#000" stopOpacity="0.25" />
                  <stop offset="80%" stopColor="#fff" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#fff" stopOpacity="0.7" />
                </linearGradient>
              </>
            )}
          </defs>

          <g>
            <rect x="70" y="650" width="76" height="24" rx="7" fill={`url(#${id('foot-grad')})`} />
            <line x1="72" y1="651" x2="144" y2="651" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
            <line x1="70" y1="673" x2="146" y2="673" stroke="rgba(0,0,0,0.95)" strokeWidth="1.5" />
          </g>
          <g>
            <rect x="854" y="650" width="76" height="24" rx="7" fill={`url(#${id('foot-grad')})`} />
            <line x1="856" y1="651" x2="928" y2="651" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
            <line x1="854" y1="673" x2="930" y2="673" stroke="rgba(0,0,0,0.95)" strokeWidth="1.5" />
          </g>

          <rect x="10" y="10" width="980" height="640" rx={r} ry={r} fill={`url(#${id('plinth-top')})`} />
          {p.brushed && (
            /*
             * Real brushed grain: a static image made once, offline
             * (scripts/generate-edition-textures.ps1). It is centred on mid grey and overlaid,
             * so it adds only the grain and the finish keeps its own tone. The plinth never
             * redraws while the record turns, so this costs one decode, not a per-frame effect.
             */
            <g clipPath={`url(#${id('top-clip')})`} data-texture="brushed">
              <image
                href={brushedTexture}
                x="10"
                y="10"
                width="980"
                height="640"
                preserveAspectRatio="none"
                style={{ mixBlendMode: 'overlay' }}
                opacity="0.85"
              />
              {m?.reflection && (
                <rect x="10" y="10" width="980" height="640" fill={`url(#${id('reflection')})`} />
              )}
            </g>
          )}

          {m?.sheen && (
            <rect x="10" y="10" width="980" height="640" rx={r} ry={r} fill={`url(#${id('sheen')})`} data-finish-sheen="" />
          )}

          {m && (
            <g data-machining="chamfer">
              <rect
                x="11.5"
                y="11.5"
                width="977"
                height="637"
                rx={r - 1.5}
                ry={r - 1.5}
                fill="none"
                stroke={`url(#${id('chamfer')})`}
                strokeWidth="2"
              />
              {/* The inner edge of the bevel, where the cut meets the brushed face. */}
              <rect x="13.5" y="13.5" width="973" height="633" rx={Math.max(r - 3.5, 1)} ry={Math.max(r - 3.5, 1)} fill="none" stroke="rgba(0,0,0,0.16)" strokeWidth="1" />
            </g>
          )}

          <rect
            x="10.5"
            y="10.5"
            width="979"
            height="639"
            rx={r - 0.5}
            ry={r - 0.5}
            fill="none"
            stroke={p.rim}
            strokeWidth="1"
          />

          <path
            d={`M 10 ${650 - r} Q 10 650 ${10 + r} 650 L ${990 - r} 650 Q 990 650 990 ${650 - r} L 990 670 Q 990 688 ${990 - Math.max(r, 8)} 688 L ${10 + Math.max(r, 8)} 688 Q 10 688 10 670 Z`}
            fill={`url(#${id('plinth-front')})`}
          />
          {p.brushed && (
            /* The front edge is the same brushed stock, turned away from the light: the grain shows, faintly. */
            <g clipPath={`url(#${id('front-clip')})`} data-texture="front">
              <image href={brushedTexture} x="10" y="640" width="980" height="60" preserveAspectRatio="none" style={{ mixBlendMode: 'overlay' }} opacity="0.4" />
            </g>
          )}
          <line x1="12" y1="648" x2="988" y2="648" stroke={`url(#${id('front-seam-highlight')})`} strokeWidth="1" />
          <line x1="10" y1="650" x2="990" y2="650" stroke="rgba(0,0,0,0.7)" strokeWidth="1" />
          <line x1="28" y1="688" x2="972" y2="688" stroke="rgba(0,0,0,0.95)" strokeWidth="1.5" />

          <circle cx="420" cy="325" r="285" fill={`url(#${id('well-gradient')})`} />
          <circle cx="420" cy="325" r="284" fill="none" stroke="rgba(0,0,0,0.7)" strokeWidth="2" />
          {m?.recess && (
            /* The platter fills its recess; this ring is the gap and lip just outside it. */
            <g data-machining="recess">
              <circle cx="420" cy="325" r="289" fill="none" stroke="rgba(0,0,0,0.45)" strokeWidth="6" />
              <circle cx="420" cy="325" r="292.5" fill="none" stroke={`url(#${id('recess-lip')})`} strokeWidth="1.5" />
            </g>
          )}
        </svg>

        {children}
      </div>
    )
  }
)

TurntableBase.displayName = 'TurntableBase'
