import { Star } from 'lucide-react'
import type { Endorsement } from '@/lib/types/vouch'
import { weiToGEN, formatDate } from '@/lib/types/vouch'
import { shortenAddress } from '@/lib/utils/explorer'

interface Props {
  endorsements:  Endorsement[]
  totalBondWei?: number
}

export function EndorsementStack({ endorsements, totalBondWei }: Props) {
  const active = endorsements.filter(e => e.status === 'active')
  const total  = totalBondWei ?? active.reduce((s, e) => s + e.bond_wei, 0)

  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--fog-panel)] p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Star className="w-4 h-4 text-[var(--bond-gold)]" />
          <span className="text-sm font-semibold text-[var(--paper-white)]">Endorsements</span>
        </div>
        <div className="text-right">
          <p className="text-sm font-mono font-bold text-[var(--bond-gold)]">{weiToGEN(total)} GEN</p>
          <p className="text-xs text-[var(--muted-steel)]">{active.length} active</p>
        </div>
      </div>

      {endorsements.length === 0 ? (
        <p className="text-xs text-[var(--muted-steel)]">No endorsements yet.</p>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {endorsements.map(e => (
            <div key={e.endorsement_id}
              className={`flex items-center justify-between p-2.5 rounded-lg bg-[var(--fog-panel-soft)] border ${
                e.status === 'withdrawn' ? 'border-[var(--line)] opacity-50' : 'border-[var(--bond-gold)]/20'
              }`}
            >
              <div>
                <p className="text-xs font-mono text-[var(--paper-white)]">{shortenAddress(e.endorser)}</p>
                <p className="text-xs text-[var(--muted-steel)]">{formatDate(e.created_at)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-mono font-semibold text-[var(--bond-gold)]">
                  {weiToGEN(e.bond_wei)} GEN
                </p>
                {e.status === 'withdrawn' && (
                  <p className="text-xs text-[var(--muted-steel)]">withdrawn</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
