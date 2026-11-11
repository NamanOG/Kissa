import React, { memo, useId } from 'react'
import { cn } from '@renderer/utils/cn'
import { useEditionsStore } from '@renderer/stores/editionsStore'
import { FINISH_PALETTES } from '@renderer/features/editions/editions'

export interface TurntableBaseProps extends React.HTMLAttributes<HTMLDivElement> { }

/** The room's light, 0 to 1, as an opacity that never quite reaches zero. */
const lit = (floor: number): string => `calc(${floor} + ${1 - floor} * var(--room-illumination, 1))`
/** Highlights take a little of the room's colour, as a real lamp would tint them. */
const TINTED_LIGHT = 'color-mix(in srgb, var(--accent, #d7a76c) 18%, #fff)'

/** Platter recess in drawing units: the platter (radius ~290) sits just inside it. */
const WELL = { cx: 420, cy: 325, r: 294 }

/**
 * The turntable's plinth, drawn the way modern hardware is photographed: one solid slab with
 * smooth gradients, a single fine highlight along its lit edges, a soft front edge and one
 * contact shadow. No texture: the finishes differ by colour and by how they take the light
 * (matte, gloss, anodised metal).
 *
 * The finish (Kissa Editions) changes only colours and sheen, so every edition keeps the deck's
 * geometry and controls. All of it is static: nothing redraws while the record turns. Light
 * follows the room light (--room-illumination) and takes a little of the room's colour (--accent).
 */
export const TurntableBase = memo(
  ({ className, style, children, ...props }: TurntableBaseProps): React.JSX.Element => {
    const finish = useEditionsStore((s) => s.finish)
    const p = FINISH_PALETTES[finish] ?? FINISH_PALETTES.original
    const m = p.machining
    const sheen = p.surface?.sheen ?? 0.25
    const tint = p.surface?.roomTint ?? 0.06
    const chamfer = p.machining?.chamfer ?? ['rgba(255,255,255,0.5)', 'rgba(255,255,255,0.08)']
    // Corner radius of the plate: soft for lacquer, tighter for machined metal.
    const r = p.radius ?? 18
    const uid = useId().replace(/:/g, '')
    const id = (name: string): string => `${name}-${uid}`
    const frontPath = `M 10 ${650 - r} Q 10 650 ${10 + r} 650 L ${990 - r} 650 Q 990 650 990 ${650 - r} L 990 670 Q 990 688 ${990 - Math.max(r, 8)} 688 L ${10 + Math.max(r, 8)} 688 Q 10 688 10 670 Z`

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
            {/* The front edge's ends turn softly away from the light. */}
            <linearGradient id={id('front-ends')} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#000" stopOpacity="0.35" />
              <stop offset="8%" stopColor="#000" stopOpacity="0" />
              <stop offset="92%" stopColor="#000" stopOpacity="0" />
              <stop offset="100%" stopColor="#000" stopOpacity="0.4" />
            </linearGradient>

            <linearGradient id={id('front-seam-highlight')} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={p.seam[2]} />
              <stop offset="30%" stopColor={p.seam[0]} />
              <stop offset="60%" stopColor={p.seam[1]} />
              <stop offset="100%" stopColor={p.seam[2]} />
            </linearGradient>

            <linearGradient id={id('foot-grad')} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={p.feet[1]} />
              <stop offset="100%" stopColor={p.feet[3]} />
            </linearGradient>

            {/* One soft contact shadow under the deck, gone at its ends. */}
            <radialGradient id={id('contact')} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#000" stopOpacity="0.6" />
              <stop offset="60%" stopColor="#000" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#000" stopOpacity="0" />
            </radialGradient>

            {/* The room's light on the plate: broad and soft, from the upper left. Matte finishes
                spread it, gloss gathers it (the strength is set per finish). */}
            <radialGradient id={id('sheen')} cx="22%" cy="4%" r="85%">
              <stop offset="0%" style={{ stopColor: TINTED_LIGHT }} stopOpacity={sheen} />
              <stop offset="30%" style={{ stopColor: TINTED_LIGHT }} stopOpacity={sheen * 0.4} />
              <stop offset="60%" style={{ stopColor: TINTED_LIGHT }} stopOpacity={sheen * 0.08} />
              <stop offset="100%" stopColor="#fff" stopOpacity="0" />
            </radialGradient>
            {/* The far corner, away from the light, falls gently into shade. */}
            <radialGradient id={id('shade')} cx="95%" cy="100%" r="80%">
              <stop offset="0%" stopColor="#000" stopOpacity="0.22" />
              <stop offset="60%" stopColor="#000" stopOpacity="0.05" />
              <stop offset="100%" stopColor="#000" stopOpacity="0" />
            </radialGradient>

            {/* The one fine highlight along the lit back edge, fading at the corners. */}
            <linearGradient id={id('edge-light')} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" style={{ stopColor: TINTED_LIGHT }} stopOpacity="0.1" />
              <stop offset="25%" style={{ stopColor: TINTED_LIGHT }} stopOpacity="0.9" />
              <stop offset="60%" style={{ stopColor: TINTED_LIGHT }} stopOpacity="0.5" />
              <stop offset="100%" style={{ stopColor: TINTED_LIGHT }} stopOpacity="0.08" />
            </linearGradient>

            <radialGradient id={id('well-gradient')} cx="50%" cy="48%" r="50%">
              <stop offset="0%" stopColor={p.well[0]} />
              <stop offset="80%" stopColor={p.well[1]} />
              <stop offset="100%" stopColor={p.well[2]} />
            </radialGradient>

            {/* A broad, soft specular band falling diagonally from the light (upper left): the
                plate reads as a solid material through light, not texture. */}
            <linearGradient id={id('specular')} x1="0" y1="0" x2="1" y2="0.75">
              <stop offset="0" style={{ stopColor: TINTED_LIGHT }} stopOpacity="0" />
              <stop offset="0.16" style={{ stopColor: TINTED_LIGHT }} stopOpacity={sheen * 0.35} />
              <stop offset="0.3" style={{ stopColor: TINTED_LIGHT }} stopOpacity={sheen * 0.12} />
              <stop offset="0.5" style={{ stopColor: TINTED_LIGHT }} stopOpacity="0" />
            </linearGradient>
            {/* Gentle occlusion: the plate darkens a little towards its front lip and its ends. */}
            <linearGradient id={id('occlusion-front')} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0.62" stopColor="#000" stopOpacity="0" />
              <stop offset="1" stopColor="#000" stopOpacity="0.18" />
            </linearGradient>
            <linearGradient id={id('occlusion-ends')} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#000" stopOpacity="0.1" />
              <stop offset="0.07" stopColor="#000" stopOpacity="0" />
              <stop offset="0.93" stopColor="#000" stopOpacity="0" />
              <stop offset="1" stopColor="#000" stopOpacity="0.14" />
            </linearGradient>
            {/* The chamfer round the top plate: one continuous cut edge that catches the light on
                the back and left (towards the lamp) and turns into shade on the front and right. */}
            <linearGradient id={id('chamfer')} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor={chamfer[0]} />
              <stop offset="0.3" stopColor={chamfer[1]} />
              <stop offset="0.62" stopColor="#000" stopOpacity="0" />
              <stop offset="1" stopColor="#000" stopOpacity="0.28" />
            </linearGradient>
            {/* Ambient occlusion where the deck stands: wide and faint, then tight under each foot. */}
            <radialGradient id={id('ambient')} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#000" stopOpacity="0.32" />
              <stop offset="70%" stopColor="#000" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#000" stopOpacity="0" />
            </radialGradient>
            <radialGradient id={id('foot-ao')} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#000" stopOpacity="0.75" />
              <stop offset="100%" stopColor="#000" stopOpacity="0" />
            </radialGradient>
            <clipPath id={id('front-clip')}>
              <path d={frontPath} />
            </clipPath>
            <clipPath id={id('top-clip')}>
              <rect x="10" y="10" width="980" height="640" rx={r} ry={r} />
            </clipPath>
            {m?.reflection && (
              /* Anodised metal: one soft, wide band where the room's light reflects. */
              <linearGradient id={id('reflection')} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#000" stopOpacity="0.08" />
                <stop offset="22%" stopColor="#fff" stopOpacity="0.16" />
                <stop offset="38%" stopColor="#fff" stopOpacity="0.04" />
                <stop offset="70%" stopColor="#000" stopOpacity="0.03" />
                <stop offset="100%" stopColor="#000" stopOpacity="0.1" />
              </linearGradient>
            )}
          </defs>

          {/* Where the deck meets the surface: a wide, faint occlusion and a tight contact line. */}
          <ellipse cx="500" cy="697" rx="520" ry="16" fill={`url(#${id('ambient')})`} />
          <ellipse cx="500" cy="693" rx="490" ry="8" fill={`url(#${id('contact')})`} data-deck-contact="" />

          {/* Low feet, set well in under the front edge: a slim dark band with a soft shadow below. */}
          {[104, 836].map((x) => (
            <g key={x} data-deck-foot="">
              <ellipse cx={x + 30} cy="695" rx="40" ry="5" fill={`url(#${id('foot-ao')})`} />
              <rect x={x} y="682" width="60" height="11" rx="3" fill={`url(#${id('foot-grad')})`} />
              <line x1={x + 3} y1="688.6" x2={x + 57} y2="688.6" stroke="rgba(255,255,255,0.1)" strokeWidth="0.8" />
            </g>
          ))}

          {/* The front edge: the slab's thickness, smooth, lit just under its top. */}
          <path d={frontPath} fill={`url(#${id('plinth-front')})`} />
          <g clipPath={`url(#${id('front-clip')})`} data-deck-front="">
            <rect x="10" y="650" width="980" height="38" fill={`url(#${id('front-ends')})`} />
          </g>
          <line x1={10 + r * 0.6} y1="651.2" x2={990 - r * 0.6} y2="651.2" stroke={`url(#${id('front-seam-highlight')})`} strokeWidth="1.2" style={{ opacity: lit(0.35) }} />

          {/* The top plate. */}
          <rect x="10" y="10" width="980" height="640" rx={r} ry={r} fill={`url(#${id('plinth-top')})`} />
          <g clipPath={`url(#${id('top-clip')})`}>
            {m?.reflection && (
              <rect x="10" y="10" width="980" height="640" fill={`url(#${id('reflection')})`} style={{ opacity: lit(0.4) }} />
            )}
            <rect x="10" y="10" width="980" height="640" fill={`url(#${id('shade')})`} />
            <rect x="10" y="10" width="980" height="640" fill={`url(#${id('occlusion-front')})`} />
            <rect x="10" y="10" width="980" height="640" fill={`url(#${id('occlusion-ends')})`} />
            <rect x="10" y="10" width="980" height="640" fill={`url(#${id('specular')})`} style={{ opacity: lit(0.2) }} data-deck-specular="" />
          </g>
          {/* The room's colour falls softly on the plate, so the deck belongs to the room it is in. */}
          <rect x="10" y="10" width="980" height="640" rx={r} ry={r} style={{ fill: 'var(--accent, #d7a76c)', opacity: tint }} data-room-tint="" />
          <rect x="10" y="650" width="980" height="38" style={{ fill: 'var(--accent, #d7a76c)', opacity: tint * 0.7 }} clipPath={`url(#${id('front-clip')})`} />
          {/* Dim the room and the shine goes with it. */}
          <rect
            x="10"
            y="10"
            width="980"
            height="640"
            rx={r}
            ry={r}
            fill={`url(#${id('sheen')})`}
            data-finish-sheen=""
            style={{ opacity: lit(0.25) }}
          />

          {/* The platter's recess: a clean dark gap round the platter. */}
          <circle cx={WELL.cx} cy={WELL.cy} r={WELL.r} fill={`url(#${id('well-gradient')})`} />
          {m?.recess && (
            <path
              d={`M ${WELL.cx - WELL.r - 1.5} ${WELL.cy} A ${WELL.r + 1.5} ${WELL.r + 1.5} 0 0 0 ${WELL.cx + WELL.r + 1.5} ${WELL.cy}`}
              fill="none"
              style={{ stroke: TINTED_LIGHT, opacity: lit(0.3) }}
              strokeOpacity="0.16"
              strokeWidth="1"
              data-machining="recess"
            />
          )}

          {/* Precise edges: a hairline round the plate and one fine highlight along the lit back edge. */}
          <rect x="10.5" y="10.5" width="979" height="639" rx={r - 0.5} ry={r - 0.5} fill="none" stroke={p.rim} strokeWidth="1" />
          <rect
            x="11.6"
            y="11.6"
            width="976.8"
            height="636.8"
            rx={r - 1.6}
            ry={r - 1.6}
            fill="none"
            stroke={`url(#${id('chamfer')})`}
            strokeWidth="1.3"
            style={{ opacity: lit(0.3) }}
            data-deck-chamfer=""
          />
          <line
            x1={10 + r}
            y1="11"
            x2={990 - r}
            y2="11"
            stroke={`url(#${id('edge-light')})`}
            strokeWidth="1.2"
            style={{ opacity: lit(0.2) }}
            data-deck-edge-light=""
          />
          {/* Where the top plate turns down into the front edge. */}
          <line x1={10 + r * 0.5} y1="649.6" x2={990 - r * 0.5} y2="649.6" stroke="rgba(0,0,0,0.6)" strokeWidth="1" />
        </svg>

        {children}
      </div>
    )
  }
)

TurntableBase.displayName = 'TurntableBase'
