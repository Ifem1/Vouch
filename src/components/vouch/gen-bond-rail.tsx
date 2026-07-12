import { Shield } from 'lucide-react'
import type { BondTier } from '@/lib/types/vouch'
import { weiToGEN, BOND_TIER_LABELS, BOND_TIER_GEN } from '@/lib/types/vouch'

interface Props {
  bondWei:    number
  activeBond?: number
  tier:       BondTier
  label?:     string
  inactiveLabel?: string
}

const TIER_ORDER: BondTier[] = ['micro', 'standard', 'high_trust', 'institutional']

export function GENBondRail({ bondWei, activeBond, tier, label = 'GEN Bond', inactiveLabel = 'inactive' }: Props) {
  const tierIndex  = TIER_ORDER.indexOf(tier)
  const nextTier   = TIER_ORDER[tierIndex + 1] as BondTier | undefined
  const nextGenMin = nextTier ? BOND_TIER_GEN[nextTier] : null
  const currentGen = bondWei / 1e18
  const progress   = nextGenMin
    ? Math.min((currentGen / nextGenMin) * 100, 100)
    : 100

  const tierColors: Record<BondTier, string> = {
    micro:        'bg-[var(--muted-steel)]',
    standard:     'bg-[var(--signal-blue)]',
    high_trust:   'bg-[var(--bond-gold)]',
    institutional:'bg-[var(--electric-violet)]',
  }

  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--fog-panel)] p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-[var(--bond-gold)]" />
          <span className="text-sm font-semibold text-[var(--paper-white)]">{label}</span>
        </div>
        <span className={`text-xs font-mono px-2 py-0.5 rounded-full border tier-${tier}`} style={{ borderColor: 'currentColor' }}>
          {BOND_TIER_LABELS[tier]}
        </span>
      </div>

      {/* Main amount */}
      <div className="mb-3">
        <span className="text-2xl font-display font-bold text-[var(--bond-gold)]">
          {weiToGEN(bondWei)}
        </span>
        <span className="text-sm text-[var(--muted-steel)] ml-1">GEN bonded</span>
        {activeBond !== undefined && activeBond !== bondWei && (
          <div className="text-xs text-[var(--muted-steel)] mt-0.5">
            {weiToGEN(activeBond)} GEN active · {weiToGEN(bondWei - activeBond)} GEN {inactiveLabel}
          </div>
        )}
      </div>

      {/* Progress bar to next tier */}
      <div className="space-y-1">
        <div className="h-1.5 w-full bg-[var(--fog-panel-soft)] rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${tierColors[tier]}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        {nextTier && (
          <p className="text-xs text-[var(--muted-steel)]">
            {(nextGenMin! - currentGen).toFixed(0)} GEN to {BOND_TIER_LABELS[nextTier]}
          </p>
        )}
      </div>
    </div>
  )
}
