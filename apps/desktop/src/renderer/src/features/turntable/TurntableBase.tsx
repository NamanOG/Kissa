import React, { memo } from 'react'
import { cn } from '@renderer/utils/cn'

export interface TurntableBaseProps extends React.HTMLAttributes<HTMLDivElement> { }

/**
 * 3D Turntable Plinth Deck.
 * Accurately models a high-end audiophile turntable chassis (Technics / Dieter Rams / Pro-Ject),
 * complete with high-specular chamfered edges, brushed obsidian lacquer, vertical front face,
 * recessed metallic platter well, and rubber isolation feet.
 */
export const TurntableBase = memo(
  ({ className, style, children, ...props }: TurntableBaseProps): React.JSX.Element => {
    return (
      <div
        className={cn('absolute inset-0 pointer-events-none', className)}
        style={style}
        {...props}
      >
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 1000 700"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
        >
          <defs>
            {/* Rich obsidian brushed lacquer composite */}
            <linearGradient id="plinth-top" x1="10%" y1="0%" x2="90%" y2="100%">
              <stop offset="0%" stopColor="#3c332e" />
              <stop offset="25%" stopColor="#2a231f" />
              <stop offset="55%" stopColor="#1c1715" />
              <stop offset="85%" stopColor="#14100f" />
              <stop offset="100%" stopColor="#0d0a09" />
            </linearGradient>

            {/* Front face — vertical thickness with directional ambient occlusion */}
            <linearGradient id="plinth-front" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#382e29" />
              <stop offset="20%" stopColor="#251e1b" />
              <stop offset="65%" stopColor="#171210" />
              <stop offset="100%" stopColor="#0a0807" />
            </linearGradient>

            {/* Subtle front seam highlight */}
            <linearGradient id="front-seam-highlight" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(255,245,225,0.05)" />
              <stop offset="30%" stopColor="rgba(255,245,225,0.25)" />
              <stop offset="60%" stopColor="rgba(215,167,108,0.2)" />
              <stop offset="100%" stopColor="rgba(255,245,225,0.05)" />
            </linearGradient>

            {/* Rubber isolation feet */}
            <linearGradient id="foot-grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#302824" />
              <stop offset="40%" stopColor="#1c1614" />
              <stop offset="80%" stopColor="#100c0b" />
              <stop offset="100%" stopColor="#060504" />
            </linearGradient>

            {/* Recessed Platter Well — deep shadow well without bright outer borders */}
            <radialGradient id="well-gradient" cx="50%" cy="48%" r="50%">
              <stop offset="0%" stopColor="#08080a" />
              <stop offset="80%" stopColor="#050506" />
              <stop offset="100%" stopColor="#151210" />
            </radialGradient>

            {/* Primary key studio softbox highlight */}
            <radialGradient id="plinth-specular-key" cx="28%" cy="20%" r="55%">
              <stop offset="0%" stopColor="rgba(255,248,235,0.12)" />
              <stop offset="40%" stopColor="rgba(255,238,210,0.04)" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>

            {/* Secondary right-side fill catchlight */}
            <radialGradient id="plinth-specular-soft" cx="80%" cy="30%" r="45%">
              <stop offset="0%" stopColor="rgba(255,250,240,0.08)" />
              <stop offset="45%" stopColor="rgba(215,167,108,0.02)" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
          </defs>

          {/* ── Isolation Feet (beneath plinth) ─────────────── */}
          {/* Left Foot */}
          <g>
            <rect x="70" y="650" width="76" height="24" rx="7" fill="url(#foot-grad)" />
            <line x1="72" y1="651" x2="144" y2="651" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
            <line x1="70" y1="673" x2="146" y2="673" stroke="rgba(0,0,0,0.95)" strokeWidth="1.5" />
          </g>
          {/* Right Foot */}
          <g>
            <rect x="854" y="650" width="76" height="24" rx="7" fill="url(#foot-grad)" />
            <line x1="856" y1="651" x2="928" y2="651" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
            <line x1="854" y1="673" x2="930" y2="673" stroke="rgba(0,0,0,0.95)" strokeWidth="1.5" />
          </g>

          {/* ── Main Plinth Top Surface ─────────────────────── */}
          <rect
            x="10"
            y="10"
            width="980"
            height="640"
            rx="18"
            ry="18"
            fill="url(#plinth-top)"
          />

          {/* Fine subtle top edge chamfer catchlight (zero harsh white borders) */}
          <rect
            x="10.5"
            y="10.5"
            width="979"
            height="639"
            rx="17.5"
            ry="17.5"
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="1"
          />

          {/* Primary Key Studio Lamp Specular Reflection */}
          <ellipse cx="220" cy="90" rx="180" ry="85" fill="url(#plinth-specular-key)" />

          {/* Secondary Soft Fill Specular Reflection */}
          <ellipse cx="780" cy="180" rx="150" ry="75" fill="url(#plinth-specular-soft)" />

          {/* ── Front Face (3D vertical thickness) ──────────── */}
          <path
            d="M 10 632 Q 10 650 28 650 L 972 650 Q 990 650 990 632 L 990 670 Q 990 688 972 688 L 28 688 Q 10 688 10 670 Z"
            fill="url(#plinth-front)"
          />
          {/* Subtle bevel seam line between top surface and front face */}
          <line x1="12" y1="648" x2="988" y2="648" stroke="url(#front-seam-highlight)" strokeWidth="1" />
          <line x1="10" y1="650" x2="990" y2="650" stroke="rgba(0,0,0,0.7)" strokeWidth="1" />
          {/* Bottom ground contact line */}
          <line x1="28" y1="688" x2="972" y2="688" stroke="rgba(0,0,0,0.95)" strokeWidth="1.5" />

          {/* ── Recessed Platter Well (Clean shadow well without stray rim strokes) ── */}
          <circle
            cx="420"
            cy="325"
            r="285"
            fill="url(#well-gradient)"
          />
          {/* Deep inner shadow ring */}
          <circle
            cx="420"
            cy="325"
            r="284"
            fill="none"
            stroke="rgba(0,0,0,0.7)"
            strokeWidth="2"
          />
        </svg>

        {children}
      </div>
    )
  }
)

TurntableBase.displayName = 'TurntableBase'
