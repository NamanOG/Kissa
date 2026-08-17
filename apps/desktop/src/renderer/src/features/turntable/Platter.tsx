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
          {/* Brushed Aluminum Vertical Cylinder Rim (Front & sides 3D thickness) */}
          <linearGradient id="platter-side-metal" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#1e1e22" />
            <stop offset="10%" stopColor="#484850" />
            <stop offset="25%" stopColor="#8e8e98" />
            <stop offset="38%" stopColor="#dedee8" />
            <stop offset="50%" stopColor="#7a7a84" />
            <stop offset="65%" stopColor="#36363c" />
            <stop offset="80%" stopColor="#8c8c96" />
            <stop offset="92%" stopColor="#c8c8d2" />
            <stop offset="100%" stopColor="#222226" />
          </linearGradient>

          {/* Top Chamfer Edge Ring (Razor-thin silver highlight) */}
          <radialGradient id="platter-top-lip" cx="35%" cy="30%" r="65%">
            <stop offset="96%" stopColor="#18181c" />
            <stop offset="97.5%" stopColor="#80808a" />
            <stop offset="98.8%" stopColor="#f0f0fa" />
            <stop offset="99.5%" stopColor="#cccccc" />
            <stop offset="100%" stopColor="#44444a" />
          </radialGradient>

          {/* Platter Base Well Drop Shadow */}
          <radialGradient id="platter-well-shadow" cx="50%" cy="50%" r="50%">
            <stop offset="85%" stopColor="rgba(0,0,0,0.85)" />
            <stop offset="95%" stopColor="rgba(0,0,0,0.4)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>

        {/* ── 1. Contact shadow cast by platter onto plinth ── */}
        <ellipse cx="200" cy="208" rx="198" ry="196" fill="url(#platter-well-shadow)" filter="blur(6px)" />
        <ellipse cx="200" cy="210" rx="196" ry="192" fill="rgba(0,0,0,0.9)" filter="blur(3px)" />

        {/* ── 2. Platter Vertical Side Face (3D cylinder thickness ~12px drop) ── */}
        {/* Front drop arc */}
        <path
          d="M 4 200 A 196 196 0 0 0 396 200 L 396 210 A 196 196 0 0 1 4 210 Z"
          fill="url(#platter-side-metal)"
        />
        {/* Fine vertical machining lines on side face */}
        <path
          d="M 4 200 A 196 196 0 0 0 396 200 L 396 210 A 196 196 0 0 1 4 210 Z"
          fill="none"
          stroke="rgba(0,0,0,0.5)"
          strokeWidth="0.5"
        />
        {/* Bottom rim edge line */}
        <path
          d="M 6 210 A 194 194 0 0 0 394 210"
          fill="none"
          stroke="rgba(0,0,0,0.9)"
          strokeWidth="1.5"
        />

        {/* ── 3. Platter Top Disc & Thin Chamfer Bevel Lip ── */}
        <circle cx="200" cy="200" r="196" fill="#141416" />
        <circle cx="200" cy="200" r="196" fill="url(#platter-top-lip)" />

        {/* Crisp metallic bevel rim stroke */}
        <circle
          cx="200"
          cy="200"
          r="195.5"
          fill="none"
          stroke="rgba(255,255,255,0.4)"
          strokeWidth="1"
        />
      </svg>
    </div>
  )
})

Platter.displayName = 'Platter'
