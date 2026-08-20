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
          {/* Brushed Aluminum Vertical Cylinder Rim (High-contrast anisotropic metal reflections) */}
          <linearGradient id="platter-side-metal" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#1c1c20" />
            <stop offset="8%" stopColor="#555562" />
            <stop offset="22%" stopColor="#b4b4c2" />
            <stop offset="34%" stopColor="#ffffff" />
            <stop offset="46%" stopColor="#9898a8" />
            <stop offset="58%" stopColor="#3d3d46" />
            <stop offset="72%" stopColor="#9e9eae" />
            <stop offset="86%" stopColor="#f0f0fa" />
            <stop offset="95%" stopColor="#787886" />
            <stop offset="100%" stopColor="#202026" />
          </linearGradient>

          {/* Top Chamfer Edge Ring (Razor-thin mirror silver highlight) */}
          <radialGradient id="platter-top-lip" cx="32%" cy="25%" r="70%">
            <stop offset="94.5%" stopColor="#141418" />
            <stop offset="96.5%" stopColor="#727280" />
            <stop offset="98.2%" stopColor="#ffffff" />
            <stop offset="99.4%" stopColor="#d5d5e2" />
            <stop offset="100%" stopColor="#52525c" />
          </radialGradient>

          {/* Concentric brushed lathe metal texture on top platter face */}
          <radialGradient id="platter-face-metal" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#1a1a1e" />
            <stop offset="50%" stopColor="#161619" />
            <stop offset="85%" stopColor="#121215" />
            <stop offset="95%" stopColor="#24242c" />
            <stop offset="100%" stopColor="#0d0d10" />
          </radialGradient>

          {/* Platter Base Well Drop Shadow */}
          <radialGradient id="platter-well-shadow" cx="50%" cy="50%" r="50%">
            <stop offset="72%" stopColor="rgba(0,0,0,0.95)" />
            <stop offset="88%" stopColor="rgba(0,0,0,0.5)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>

          {/* Vertical lathe-machining lines pattern */}
          <pattern id="machining-lines" width="4" height="20" patternUnits="userSpaceOnUse">
            <rect x="0" y="0" width="1" height="20" fill="rgba(0,0,0,0.22)" />
            <rect x="2" y="0" width="1" height="20" fill="rgba(255,255,255,0.18)" />
          </pattern>
        </defs>

        {/* ── 1. Contact shadow cast by platter onto plinth ── */}
        <ellipse cx="200" cy="208" rx="198" ry="196" fill="url(#platter-well-shadow)" />
        <ellipse cx="200" cy="210" rx="196" ry="192" fill="rgba(0,0,0,0.9)" opacity="0.7" />

        {/* ── 2. Platter Vertical Side Face (3D cylinder thickness ~12px drop) ── */}
        {/* Front drop arc */}
        <path
          d="M 4 200 A 196 196 0 0 0 396 200 L 396 220 A 196 196 0 0 1 4 220 Z"
          fill="url(#platter-side-metal)"
        />
        {/* Fine vertical machining lines on side face */}
        <path
          d="M 4 200 A 196 196 0 0 0 396 200 L 396 220 A 196 196 0 0 1 4 220 Z"
          fill="url(#machining-lines)"
        />
        {/* Bottom rim edge line */}
        <path
          d="M 6 220 A 194 194 0 0 0 394 220"
          fill="none"
          stroke="rgba(0,0,0,0.95)"
          strokeWidth="2.5"
        />

        {/* ── 3. Platter Top Disc & Thin Chamfer Bevel Lip ── */}
        <circle cx="200" cy="200" r="196" fill="url(#platter-face-metal)" />
        <circle cx="200" cy="200" r="196" fill="url(#platter-top-lip)" />

        {/* Crisp metallic bevel rim stroke */}
        <circle
          cx="200"
          cy="200"
          r="195.5"
          fill="none"
          stroke="rgba(255,255,255,0.7)"
          strokeWidth="1.2"
        />
      </svg>
    </div>
  )
})

Platter.displayName = 'Platter'
