import type { Capsule } from '@/lib/types/vouch'
import { weiToGEN, BOND_TIER_GEN, STATUS_LABELS } from '@/lib/types/vouch'

interface Props { capsule: Capsule }

const STATUS_COLOR: Record<string, string> = {
  active:       '#22C55E',
  upheld:       '#22C55E',
  challenged:   '#EF4444',
  slashed:      '#EF4444',
  suspended:    '#EF4444',
  downgraded:   '#D8A739',
  under_review: '#D8A739',
  expired:      '#94A3B8',
  retired:      '#94A3B8',
}

export function ReputationHeatRing({ capsule }: Props) {
  const maxGen   = BOND_TIER_GEN[capsule.bond_tier] * 4
  const bondGen  = capsule.bond_amount / 1e18
  const fillPct  = Math.min(bondGen / maxGen, 1)
  const color    = STATUS_COLOR[capsule.status] ?? '#94A3B8'

  const r  = 44
  const cx = 60
  const cy = 60
  const strokeWidth  = 8
  const circumference = 2 * Math.PI * r
  const dashoffset    = circumference * (1 - fillPct)

  // Challenge notches
  const notches = Math.min(capsule.challenge_count, 8)

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="120" height="120" viewBox="0 0 120 120">
        {/* Track */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--fog-panel-soft)" strokeWidth={strokeWidth} />
        {/* Fill */}
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={dashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`}
          opacity={0.85}
        />
        {/* Challenge notches (red marks) */}
        {Array.from({ length: notches }).map((_, i) => {
          const angle = (i / 8) * 2 * Math.PI - Math.PI / 2
          const x1 = cx + (r - strokeWidth / 2) * Math.cos(angle)
          const y1 = cy + (r - strokeWidth / 2) * Math.sin(angle)
          const x2 = cx + (r + strokeWidth / 2) * Math.cos(angle)
          const y2 = cy + (r + strokeWidth / 2) * Math.sin(angle)
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#EF4444" strokeWidth={2.5} strokeLinecap="round" />
        })}
        {/* Center text */}
        <text x={cx} y={cy - 6} textAnchor="middle" fill={color} fontSize="12" fontWeight="bold" fontFamily="monospace">
          {weiToGEN(capsule.bond_amount)}
        </text>
        <text x={cx} y={cy + 8} textAnchor="middle" fill="var(--muted-steel)" fontSize="9" fontFamily="monospace">
          GEN
        </text>
        <text x={cx} y={cy + 20} textAnchor="middle" fill="var(--muted-steel)" fontSize="8">
          {STATUS_LABELS[capsule.status]}
        </text>
      </svg>
      {capsule.challenge_count > 0 && (
        <p className="text-xs text-[var(--challenge-red)] font-mono">
          {capsule.challenge_count} challenge{capsule.challenge_count !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  )
}
