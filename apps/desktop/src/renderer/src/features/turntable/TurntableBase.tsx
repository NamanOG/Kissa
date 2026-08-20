import React, { memo } from 'react'
import { cn } from '@renderer/utils/cn'

export interface TurntableBaseProps extends React.HTMLAttributes<HTMLDivElement> { }

/**
 * 3D Turntable Plinth Deck.
 * Accurately models the matte obsidian/dark charcoal hi-fi deck from the reference image,
 * complete with beveled chamfer edges, vertical front face, recessed platter well,
 * and rubber isolation feet.
 */
export const TurntableBase = memo(
  ({ className, style, children, ...props }: TurntableBaseProps): React.JSX.Element => {
    return (
      <div className={cn('absolute inset-0 pointer-events-none', className)} style={style} {...props}>
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 1000 700"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
        >
          <defs>
            {/* Smoked acrylic / graphite satin composite */}
            <linearGradient id="plinth-top" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#403530" />
              <stop offset="25%" stopColor="#302723" />
              <stop offset="60%" stopColor="#211b19" />
              <stop offset="100%" stopColor="#171312" />
            </linearGradient>

            {/* Front face — vertical thickness */}
            <linearGradient id="plinth-front" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#342a26" />
              <stop offset="20%" stopColor="#261f1d" />
              <stop offset="80%" stopColor="#181312" />
              <stop offset="100%" stopColor="#100d0c" />
            </linearGradient>

            {/* Rubber isolation feet */}
            <linearGradient id="foot-grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#29211f" />
              <stop offset="50%" stopColor="#171211" />
              <stop offset="100%" stopColor="#0e0b0a" />
            </linearGradient>

            {/* Recessed Platter Well — deep shadow well */}
            <radialGradient id="well-gradient" cx="50%" cy="48%" r="50%">
              <stop offset="0%" stopColor="#070708" />
              <stop offset="70%" stopColor="#050506" />
              <stop offset="95%" stopColor="#0c0c0e" />
              <stop offset="100%" stopColor="#211a18" />
            </radialGradient>

            {/* Soft specular studio catchlight */}
            <radialGradient id="plinth-specular" cx="45%" cy="35%" r="55%">
              <stop offset="0%" stopColor="rgba(255,240,210,0.09)" />
              <stop offset="50%" stopColor="rgba(255,240,210,0.03)" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>

            {/* Chamfer highlight along top rim — warm subtle sheen */}
            <linearGradient id="top-edge-highlight" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(215,167,108,0.15)" />
              <stop offset="40%" stopColor="rgba(255,255,255,0.07)" />
              <stop offset="80%" stopColor="rgba(0,0,0,0.4)" />
              <stop offset="100%" stopColor="rgba(215,167,108,0.08)" />
            </linearGradient>
          </defs>

          {/* ── Isolation Feet (beneath plinth) ─────────────── */}
          {/* Left Foot */}
          <g>
            <rect x="70" y="650" width="76" height="24" rx="7" fill="url(#foot-grad)" />
            <line x1="72" y1="651" x2="144" y2="651" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
            <line x1="70" y1="673" x2="146" y2="673" stroke="rgba(0,0,0,0.9)" strokeWidth="1" />
          </g>
          {/* Right Foot */}
          <g>
            <rect x="854" y="650" width="76" height="24" rx="7" fill="url(#foot-grad)" />
            <line x1="856" y1="651" x2="928" y2="651" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
            <line x1="854" y1="673" x2="930" y2="673" stroke="rgba(0,0,0,0.9)" strokeWidth="1" />
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

          {/* Top Chamfer Edge Highlight */}
          <rect
            x="11"
            y="11"
            width="978"
            height="638"
            rx="17"
            ry="17"
            fill="none"
            stroke="url(#top-edge-highlight)"
            strokeWidth="1"
          />

          {/* Inner bevel shadow stroke */}
          <rect
            x="12"
            y="12"
            width="976"
            height="636"
            rx="16"
            ry="16"
            fill="none"
            stroke="rgba(0,0,0,0.4)"
            strokeWidth="1"
          />

          {/* Specular catchlight from key studio lamp */}
          <ellipse cx="180" cy="80" rx="140" ry="70" fill="url(#plinth-specular)" />

          {/* ── Front Face (3D vertical thickness) ──────────── */}
          <path
            d="M 10 632 Q 10 650 28 650 L 972 650 Q 990 650 990 632 L 990 670 Q 990 688 972 688 L 28 688 Q 10 688 10 670 Z"
            fill="url(#plinth-front)"
          />
          {/* Bevel seam line between top surface and front face */}
          <line x1="12" y1="648" x2="988" y2="648" stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
          <line x1="10" y1="649" x2="990" y2="649" stroke="rgba(0,0,0,0.7)" strokeWidth="1" />
          {/* Bottom ground contact line */}
          <line x1="28" y1="688" x2="972" y2="688" stroke="rgba(0,0,0,0.95)" strokeWidth="1.5" />

          {/* ── Recessed Platter Well ─────────────────────── */}
          <circle
            cx="420"
            cy="325"
            r="285"
            fill="url(#well-gradient)"
            stroke="rgba(0,0,0,0.9)"
            strokeWidth="3"
          />
          {/* Deep inner shadow ring */}
          <circle
            cx="420"
            cy="325"
            r="283"
            fill="none"
            stroke="rgba(0,0,0,0.8)"
            strokeWidth="4"
          />
          {/* Subtle outer metallic rim catch */}
          <circle
            cx="420"
            cy="324"
            r="286"
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="1"
          />
        </svg>

        {/* Warm diffused keylight, contained inside the physical chassis. */}
        <div
          className="absolute inset-0 pointer-events-none rounded-[18px]"
          style={{
            background:
              'radial-gradient(ellipse 120% 90% at 10% 5%, rgba(255, 236, 211, 0.085) 0%, transparent 65%)'
          }}
        />

        {children}
      </div>
    )
  }
)

TurntableBase.displayName = 'TurntableBase'
