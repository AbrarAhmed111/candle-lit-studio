import { useId } from 'react'
import clsx from 'clsx'
import type { CandleShape } from '@/types'

type CandleArtProps = {
  shape: CandleShape
  wax: string
  vessel: string
  label?: string
  /** Keep the wick burning instead of lighting it on hover */
  lit?: boolean
  /** Looping flicker, used once on the homepage hero */
  flicker?: boolean
  className?: string
}

/**
 * Illustrated stand-in for product photography. Each candle is drawn from
 * its own wax and vessel colours until real photos are uploaded.
 */
export default function CandleArt({ shape, wax, vessel, label, lit, flicker, className }: CandleArtProps) {
  const glow = useId()

  const Flame = ({ x, y, s = 1 }: { x: number; y: number; s?: number }) => (
    <g className="flame">
      <circle cx={x} cy={y - 18 * s} r={54 * s} fill={`url(#${glow})`} />
      <g className="flame-core">
        <path
          d={`M${x} ${y} c${-10 * s} ${-9 * s} ${-9 * s} ${-22 * s} 0 ${-38 * s} c${9 * s} ${16 * s} ${10 * s} ${29 * s} 0 ${38 * s}z`}
          fill="#EFA93A"
        />
        <path
          d={`M${x} ${y - 2 * s} c${-5 * s} ${-5 * s} ${-4 * s} ${-12 * s} 0 ${-20 * s} c${4 * s} ${8 * s} ${5 * s} ${15 * s} 0 ${20 * s}z`}
          fill="#FFF1C9"
        />
      </g>
    </g>
  )

  const Wick = ({ x, y }: { x: number; y: number }) => (
    <line x1={x} y1={y} x2={x} y2={y - 11} stroke="#2E1F17" strokeWidth="2" strokeLinecap="round" />
  )

  return (
    <svg
      viewBox="0 0 200 240"
      role="img"
      aria-label={label ? `${label} candle` : 'Candle'}
      className={clsx('candle', lit && 'lit', flicker && 'lit flicker', className)}
    >
      <defs>
        <radialGradient id={glow}>
          <stop offset="0%" stopColor="#FFD98A" stopOpacity="0.75" />
          <stop offset="45%" stopColor="#F2B544" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#F2B544" stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse cx="100" cy="215" rx="66" ry="6" fill="#2E1F17" opacity="0.14" />

      {shape === 'jar' && (
        <>
          <rect x="48" y="94" width="104" height="120" rx="12" fill={vessel} />
          <rect x="54" y="110" width="92" height="98" rx="8" fill={wax} />
          <ellipse cx="100" cy="110" rx="46" ry="6" fill="#fff" opacity="0.35" />
          <rect x="66" y="140" width="68" height="46" rx="2" fill="#FCF9F3" />
          <rect x="72" y="146" width="56" height="34" fill="none" stroke="#A9692F" strokeWidth="0.6" />
          {label && (
            <text
              x="100"
              y="166"
              textAnchor="middle"
              fontSize={Math.min(8.5, 88 / (label?.length ?? 1))}
              fontStyle="italic"
              fill="#2E1F17"
              style={{ fontFamily: 'var(--font-display), serif' }}
            >
              {label}
            </text>
          )}
          <rect x="56" y="102" width="5" height="100" rx="2.5" fill="#fff" opacity="0.28" />
          <Wick x={100} y={110} />
          <Flame x={100} y={98} />
        </>
      )}

      {shape === 'pillar' && (
        <>
          <rect x="66" y="86" width="68" height="128" rx="4" fill={wax} />
          <rect x="66" y="86" width="14" height="128" rx="4" fill="#fff" opacity="0.18" />
          <rect x="118" y="86" width="16" height="128" rx="4" fill="#2E1F17" opacity="0.1" />
          <ellipse cx="100" cy="86" rx="34" ry="6" fill="#fff" opacity="0.4" />
          <Wick x={100} y={86} />
          <Flame x={100} y={74} />
        </>
      )}

      {shape === 'tin' && (
        <>
          <rect x="40" y="150" width="120" height="64" rx="8" fill={vessel} />
          <ellipse cx="100" cy="150" rx="60" ry="10" fill={wax} />
          <ellipse cx="100" cy="150" rx="60" ry="10" fill="none" stroke={vessel} strokeWidth="3" />
          <rect x="40" y="172" width="120" height="22" fill="#FCF9F3" opacity="0.92" />
          {label && (
            <text
              x="100"
              y="187"
              textAnchor="middle"
              fontSize={Math.min(9, 150 / (label?.length ?? 1))}
              fontStyle="italic"
              fill="#2E1F17"
              style={{ fontFamily: 'var(--font-display), serif' }}
            >
              {label}
            </text>
          )}
          <Wick x={100} y={150} />
          <Flame x={100} y={138} />
        </>
      )}

      {shape === 'taper' && (
        <>
          <rect x="52" y="204" width="96" height="10" rx="5" fill={vessel} />
          <rect x="74" y="190" width="20" height="16" rx="3" fill={vessel} />
          <rect x="106" y="190" width="20" height="16" rx="3" fill={vessel} />
          <path d="M79 192 L81 74 Q84 68 87 74 L89 192Z" fill={wax} />
          <path d="M111 192 L113 96 Q116 90 119 96 L121 192Z" fill={wax} />
          <path d="M79 192 L81 74 L83 74 L82 192Z" fill="#fff" opacity="0.3" />
          <path d="M111 192 L113 96 L115 96 L114 192Z" fill="#fff" opacity="0.3" />
          <Wick x={84} y={72} />
          <Wick x={116} y={94} />
          <Flame x={84} y={60} s={0.75} />
          <Flame x={116} y={82} s={0.75} />
        </>
      )}

      {shape === 'set' && (
        <>
          {[26, 76, 126].map((x, i) => (
            <g key={x}>
              <rect x={x} y={i === 1 ? 138 : 150} width="48" height={i === 1 ? 76 : 64} rx="7" fill={vessel} />
              <rect
                x={x + 4}
                y={i === 1 ? 148 : 160}
                width="40"
                height={i === 1 ? 62 : 50}
                rx="5"
                fill={wax}
                opacity={1 - i * 0.18}
              />
              <rect x={x + 9} y={i === 1 ? 170 : 176} width="30" height="16" fill="#FCF9F3" />
              <Wick x={x + 24} y={i === 1 ? 148 : 160} />
              <Flame x={x + 24} y={i === 1 ? 136 : 148} s={0.62} />
            </g>
          ))}
        </>
      )}
    </svg>
  )
}
