import React, { memo } from 'react'
import { cn } from '@renderer/utils/cn'

export interface PlatterProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: string
}

/**
 * Machined Aluminum Platter Cylinder.
 * Renders the realistic heavy metal platter beneath the vinyl record.
 * Rather than a thick ring on top, this models the actual 3D cylindrical platter:
 * a razor-thin polished top chamfer lip and a brushed aluminum vertical side face
 * with directional metallic reflections and contact shadows on the plinth.
 */
export const Platter = memo(({ className, style, size = '100%', ...props }: PlatterProps): React.JSX.Element => {
  return (
    <div
      className={cn('absolute rounded-full select-none pointer-events-none', className)}
      style={{ width: size, height: size, ...style }}
      {...props}
    >
      <svg
        className="absolute inset-0 w-full h-full overflow-visible"
        viewBox="0 0 400 400"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Refined dark gunmetal brushed aluminum vertical cylinder rim */}
          <linearGradient id="platter-side-metal" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#141416" />
            <stop offset="20%" stopColor="#2c2c34" />
            <stop offset="40%" stopColor="#484854" />
            <stop offset="60%" stopColor="#303038" />
            <stop offset="85%" stopColor="#202024" />
            <stop offset="100%" stopColor="#121214" />
          </linearGradient>

          {/* Top Chamfer Edge Ring — subtle dark-metallic rim */}
          <radialGradient id="platter-top-lip" cx="35%" cy="30%" r="65%">
            <stop offset="96%" stopColor="#121215" />
            <stop offset="98.5%" stopColor="#3a3a44" />
            <stop offset="100%" stopColor="#1e1e22" />
          </radialGradient>

          {/* Platter top face metal */}
          <radialGradient id="platter-face-metal" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#141416" />
            <stop offset="85%" stopColor="#101012" />
            <stop offset="100%" stopColor="#0a0a0c" />
          </radialGradient>

          {/* Platter Base Contact Shadow */}
          <radialGradient id="platter-well-shadow" cx="50%" cy="50%" r="50%">
            <stop offset="78%" stopColor="rgba(0,0,0,0.85)" />
            <stop offset="92%" stopColor="rgba(0,0,0,0.3)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>

        {/* ── 1. Contact shadow cast by platter onto plinth ── */}
        <ellipse cx="200" cy="204" rx="197" ry="196" fill="url(#platter-well-shadow)" />

        {/* ── 2. Platter Vertical Side Face (Low-profile 5px drop) ── */}
        <path
          d="M 6 200 A 194 194 0 0 0 394 200 L 394 205 A 194 194 0 0 1 6 205 Z"
          fill="url(#platter-side-metal)"
        />
        {/* Bottom rim edge line */}
        <path
          d="M 8 205 A 192 192 0 0 0 392 205"
          fill="none"
          stroke="rgba(0,0,0,0.8)"
          strokeWidth="1.2"
        />

        {/* ── 3. Platter Top Disc & Thin Chamfer Bevel Lip ── */}
        <circle cx="200" cy="200" r="194" fill="url(#platter-face-metal)" />
        <circle cx="200" cy="200" r="194" fill="url(#platter-top-lip)" />

        {/* Subtle metallic bevel rim stroke */}
        <circle
          cx="200"
          cy="200"
          r="193.5"
          fill="none"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth="0.8"
        />
      </svg>
    </div>
  )
})

Platter.displayName = 'Platter'
