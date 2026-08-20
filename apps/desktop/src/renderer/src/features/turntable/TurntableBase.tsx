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
        className={cn('absolute inset-0 pointer-events-none rounded-[20px]', className)}
        style={{
          boxShadow:
            '0 24px 60px -8px rgba(0,0,0,0.9), 0 6px 20px rgba(0,0,0,0.7), 0 0 45px rgba(215,167,108,0.06), inset 0 1px 1px rgba(255,255,255,0.25)',
          ...style
        }}
        {...props}
      >
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 1000 700"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
        >
          <defs>
            {/* Rich obsidian brushed lacquer composite with high-contrast depth */}
            <linearGradient id="plinth-top" x1="10%" y1="0%" x2="90%" y2="100%">
              <stop offset="0%" stopColor="#52443d" />
              <stop offset="18%" stopColor="#3d322c" />
              <stop offset="45%" stopColor="#2b231f" />
              <stop offset="75%" stopColor="#1e1816" />
              <stop offset="100%" stopColor="#130f0e" />
            </linearGradient>

            {/* Front face — vertical thickness with directional ambient occlusion */}
            <linearGradient id="plinth-front" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#483b34" />
              <stop offset="15%" stopColor="#322823" />
              <stop offset="60%" stopColor="#1f1816" />
              <stop offset="100%" stopColor="#0c0908" />
            </linearGradient>

            {/* High-specular front seam highlight */}
            <linearGradient id="front-seam-highlight" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(255,245,225,0.2)" />
              <stop offset="25%" stopColor="rgba(255,245,225,0.85)" />
              <stop offset="60%" stopColor="rgba(215,167,108,0.75)" />
              <stop offset="85%" stopColor="rgba(255,255,255,0.4)" />
              <stop offset="100%" stopColor="rgba(255,245,225,0.15)" />
            </linearGradient>

            {/* Rubber isolation feet */}
            <linearGradient id="foot-grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#3a302c" />
              <stop offset="35%" stopColor="#221b18" />
              <stop offset="80%" stopColor="#120e0d" />
              <stop offset="100%" stopColor="#080605" />
            </linearGradient>

            {/* Recessed Platter Well — deep shadow well with dark metallic floor */}
            <radialGradient id="well-gradient" cx="50%" cy="48%" r="50%">
              <stop offset="0%" stopColor="#060607" />
              <stop offset="70%" stopColor="#040405" />
              <stop offset="94%" stopColor="#0e0e11" />
              <stop offset="100%" stopColor="#2a221f" />
            </radialGradient>

            {/* Well Outer Metallic Rim Light Catch */}
            <linearGradient id="well-rim-metal" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.5)" />
              <stop offset="30%" stopColor="rgba(215,167,108,0.4)" />
              <stop offset="65%" stopColor="rgba(90,80,75,0.25)" />
              <stop offset="85%" stopColor="rgba(215,167,108,0.35)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0.45)" />
            </linearGradient>

            {/* Primary key studio softbox highlight */}
            <radialGradient id="plinth-specular-key" cx="28%" cy="20%" r="55%">
              <stop offset="0%" stopColor="rgba(255,248,235,0.25)" />
              <stop offset="35%" stopColor="rgba(255,238,210,0.10)" />
              <stop offset="70%" stopColor="rgba(215,167,108,0.03)" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>

            {/* Secondary right-side fill catchlight */}
            <radialGradient id="plinth-specular-soft" cx="80%" cy="30%" r="45%">
              <stop offset="0%" stopColor="rgba(255,250,240,0.14)" />
              <stop offset="45%" stopColor="rgba(215,167,108,0.05)" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>

            {/* Chamfer highlight along top rim — crisp high-specular metallic reflection */}
            <linearGradient id="top-edge-highlight" x1="0%" y1="0%" x2="100%" y2="80%">
              <stop offset="0%" stopColor="rgba(255,250,235,0.85)" />
              <stop offset="22%" stopColor="rgba(215,167,108,0.65)" />
              <stop offset="48%" stopColor="rgba(255,255,255,0.4)" />
              <stop offset="72%" stopColor="rgba(215,167,108,0.55)" />
              <stop offset="100%" stopColor="rgba(255,245,225,0.75)" />
            </linearGradient>

            {/* Inner secondary rim highlight */}
            <linearGradient id="inner-edge-highlight" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.25)" />
              <stop offset="40%" stopColor="rgba(215,167,108,0.15)" />
              <stop offset="100%" stopColor="rgba(0,0,0,0.5)" />
            </linearGradient>
          </defs>

          {/* ── Isolation Feet (beneath plinth) ─────────────── */}
          {/* Left Foot */}
          <g>
            <rect x="70" y="650" width="76" height="24" rx="7" fill="url(#foot-grad)" />
            <line x1="72" y1="651" x2="144" y2="651" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
            <line x1="70" y1="673" x2="146" y2="673" stroke="rgba(0,0,0,0.95)" strokeWidth="1.5" />
          </g>
          {/* Right Foot */}
          <g>
            <rect x="854" y="650" width="76" height="24" rx="7" fill="url(#foot-grad)" />
            <line x1="856" y1="651" x2="928" y2="651" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
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

          {/* Top Chamfer Edge High-Specular Rim Light */}
          <rect
            x="11"
            y="11"
            width="978"
            height="638"
            rx="17"
            ry="17"
            fill="none"
            stroke="url(#top-edge-highlight)"
            strokeWidth="1.5"
          />

          {/* Secondary inner bevel light stroke */}
          <rect
            x="12.5"
            y="12.5"
            width="975"
            height="635"
            rx="16"
            ry="16"
            fill="none"
            stroke="url(#inner-edge-highlight)"
            strokeWidth="1"
          />

          {/* Inner bevel shadow stroke */}
          <rect
            x="14"
            y="14"
            width="972"
            height="632"
            rx="15"
            ry="15"
            fill="none"
            stroke="rgba(0,0,0,0.5)"
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
          {/* Gleaming bevel seam line between top surface and front face */}
          <line x1="12" y1="648" x2="988" y2="648" stroke="url(#front-seam-highlight)" strokeWidth="1.8" />
          <line x1="10" y1="650" x2="990" y2="650" stroke="rgba(0,0,0,0.85)" strokeWidth="1.2" />
          {/* Bottom ground contact line */}
          <line x1="28" y1="688" x2="972" y2="688" stroke="rgba(0,0,0,0.98)" strokeWidth="2" />

          {/* ── Recessed Platter Well ─────────────────────── */}
          <circle
            cx="420"
            cy="325"
            r="285"
            fill="url(#well-gradient)"
            stroke="rgba(0,0,0,0.95)"
            strokeWidth="3.5"
          />
          {/* Deep inner shadow ring */}
          <circle
            cx="420"
            cy="325"
            r="283"
            fill="none"
            stroke="rgba(0,0,0,0.85)"
            strokeWidth="4"
          />
          {/* Crisp metallic well rim catchlight */}
          <circle
            cx="420"
            cy="324"
            r="286.5"
            fill="none"
            stroke="url(#well-rim-metal)"
            strokeWidth="1.5"
          />
        </svg>

        {/* Warm diffused keylight, contained inside the physical chassis */}
        <div
          className="absolute inset-0 pointer-events-none rounded-[18px]"
          style={{
            background:
              'radial-gradient(ellipse 110% 85% at 15% 8%, rgba(255, 240, 220, 0.12) 0%, transparent 65%)'
          }}
        />

        {children}
      </div>
    )
  }
)

TurntableBase.displayName = 'TurntableBase'
