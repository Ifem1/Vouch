import { Gavel, TrendingUp, TrendingDown } from 'lucide-react'
import type { Verdict } from '@/lib/types/vouch'
import { VERDICT_LABELS, formatDate } from '@/lib/types/vouch'

interface Props { verdict: Verdict }

const ACTION_LABELS: Record<string, string> = {
  keep_active:          'Keep Active',
  downgrade:            'Downgrade',
  suspend:              'Suspend',
  slash_partial:        'Partial Slash',
  slash_full:           'Full Slash',
  expire_without_slash: 'Expire',
  dismiss_challenge:    'Dismiss Challenge',
}

export function VerdictSeal({ verdict }: Props) {
  const positive = ['trustworthy', 'invalid_challenge'].includes(verdict.verdict_status)
  const negative = ['contradicted', 'material_breach', 'impersonation_risk'].includes(verdict.verdict_status)

  return (
    <div className={`rounded-xl border p-5 ${
      positive ? 'border-[var(--verdict-green)]/30 bg-[var(--verdict-green)]/5 glow-green' :
      negative ? 'border-[var(--challenge-red)]/30 bg-[var(--challenge-red)]/5 glow-red' :
      'border-[var(--bond-gold)]/30 bg-[var(--bond-gold)]/5 glow-gold'
    }`}>

      {/* Seal header */}
      <div className="flex items-center gap-2 mb-4">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
          positive ? 'bg-[var(--verdict-green)]/20' :
          negative ? 'bg-[var(--challenge-red)]/20' :
          'bg-[var(--bond-gold)]/20'
        }`}>
          <Gavel className={`w-4 h-4 ${
            positive ? 'text-[var(--verdict-green)]' :
            negative ? 'text-[var(--challenge-red)]' :
            'text-[var(--bond-gold)]'
          }`} />
        </div>
        <div>
          <p className="text-xs text-[var(--muted-steel)] font-mono">{verdict.verdict_id}</p>
          <p className="text-xs text-[var(--muted-steel)]">{formatDate(verdict.created_at)}</p>
        </div>
      </div>

      {/* Main verdict */}
      <div className="mb-4">
        <div className={`text-xl font-display font-bold mb-1 verdict-${verdict.verdict_status}`}>
          {VERDICT_LABELS[verdict.verdict_status]}
        </div>
        <p className="text-sm text-[var(--paper-white)]">{verdict.short_reason}</p>
      </div>

      {/* Confidence bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-[var(--muted-steel)] mb-1">
          <span>Confidence</span>
          <span className="font-mono">{verdict.confidence}%</span>
        </div>
        <div className="h-1.5 bg-[var(--fog-panel-soft)] rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${positive ? 'bg-[var(--verdict-green)]' : negative ? 'bg-[var(--challenge-red)]' : 'bg-[var(--bond-gold)]'}`}
            style={{ width: `${verdict.confidence}%` }}
          />
        </div>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {[
          { label: 'Claim Alignment', value: verdict.claim_alignment },
          { label: 'Evidence Strength', value: verdict.evidence_strength },
          { label: 'Materiality', value: verdict.materiality },
          { label: 'Action', value: ACTION_LABELS[verdict.action] ?? verdict.action },
        ].map(({ label, value }) => (
          <div key={label} className="bg-[var(--fog-panel)] rounded-lg p-2.5">
            <p className="text-xs text-[var(--muted-steel)] mb-1">{label}</p>
            <p className="text-xs font-semibold text-[var(--paper-white)] capitalize">{value}</p>
          </div>
        ))}
      </div>

      {/* Slash */}
      {verdict.slash_bps > 0 && (
        <div className="flex items-center gap-2 text-sm text-[var(--challenge-red)]">
          <TrendingDown className="w-4 h-4" />
          <span className="font-mono">{(verdict.slash_bps / 100).toFixed(0)}% slashed</span>
        </div>
      )}
      {verdict.slash_bps === 0 && positive && (
        <div className="flex items-center gap-2 text-sm text-[var(--verdict-green)]">
          <TrendingUp className="w-4 h-4" />
          <span>No slash applied</span>
        </div>
      )}
    </div>
  )
}
