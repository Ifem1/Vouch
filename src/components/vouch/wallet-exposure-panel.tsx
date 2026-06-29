import { Shield, Star, Swords, TrendingUp, TrendingDown, Clock } from 'lucide-react'
import type { ActivityRecord } from '@/lib/types/vouch'

interface Props {
  activity: ActivityRecord[]
}

const TYPE_ICON: Record<string, React.ReactNode> = {
  capsule_created:          <Shield className="w-3.5 h-3.5 text-[var(--bond-gold)]" />,
  capsule_retired:          <Shield className="w-3.5 h-3.5 text-[var(--muted-steel)]" />,
  capsule_renewed:          <Shield className="w-3.5 h-3.5 text-[var(--verdict-green)]" />,
  capsule_verdict_applied:  <Shield className="w-3.5 h-3.5 text-[var(--electric-violet)]" />,
  bond_increased:           <TrendingUp className="w-3.5 h-3.5 text-[var(--bond-gold)]" />,
  bond_withdrawn:           <TrendingDown className="w-3.5 h-3.5 text-[var(--muted-steel)]" />,
  endorsement_made:         <Star className="w-3.5 h-3.5 text-[var(--bond-gold)]" />,
  endorsement_withdrawn:    <Star className="w-3.5 h-3.5 text-[var(--muted-steel)]" />,
  endorsement_refund_claimed: <Star className="w-3.5 h-3.5 text-[var(--verdict-green)]" />,
  challenge_opened:         <Swords className="w-3.5 h-3.5 text-[var(--challenge-red)]" />,
  challenge_resolved:       <Swords className="w-3.5 h-3.5 text-[var(--verdict-green)]" />,
  challenge_reward_claimed: <Swords className="w-3.5 h-3.5 text-[var(--bond-gold)]" />,
}

const TYPE_LABEL: Record<string, string> = {
  capsule_created:          'Capsule Created',
  capsule_retired:          'Capsule Retired',
  capsule_renewed:          'Capsule Renewed',
  capsule_verdict_applied:  'Verdict Applied',
  bond_increased:           'Bond Increased',
  bond_withdrawn:           'Bond Withdrawn',
  endorsement_made:         'Endorsed Capsule',
  endorsement_withdrawn:    'Endorsement Withdrawn',
  endorsement_refund_claimed: 'Endorsement Refunded',
  challenge_opened:         'Challenge Opened',
  challenge_resolved:       'Challenge Resolved',
  challenge_reward_claimed: 'Reward Claimed',
}

function formatTs(ts: number): string {
  return new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function getAmount(record: ActivityRecord): string | null {
  const wei = record.bond_wei ?? record.amount_wei ?? record.additional_wei
  if (!wei) return null
  return `${(wei / 1e18).toFixed(2)} GEN`
}

export function WalletExposurePanel({ activity }: Props) {
  if (activity.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--line)] bg-[var(--fog-panel)] p-6 text-center">
        <Clock className="w-8 h-8 text-[var(--muted-steel)] mx-auto mb-2" />
        <p className="text-sm text-[var(--muted-steel)]">No wallet activity yet.</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--fog-panel)] divide-y divide-[var(--line)]">
      {activity.map((record, i) => {
        const amount = getAmount(record)
        return (
          <div key={i} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-[var(--glass)] transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 flex items-center justify-center shrink-0">
                {TYPE_ICON[record.type] ?? <Clock className="w-3.5 h-3.5 text-[var(--muted-steel)]" />}
              </div>
              <div>
                <p className="text-sm text-[var(--paper-white)]">
                  {TYPE_LABEL[record.type] ?? record.type}
                </p>
                {record.capsule_id && (
                  <p className="text-xs text-[var(--muted-steel)] font-mono">{record.capsule_id}</p>
                )}
                {record.challenge_id && (
                  <p className="text-xs text-[var(--muted-steel)] font-mono">{record.challenge_id}</p>
                )}
              </div>
            </div>
            <div className="text-right shrink-0">
              {amount && (
                <p className="text-sm font-mono font-semibold text-[var(--bond-gold)]">{amount}</p>
              )}
              <p className="text-xs text-[var(--muted-steel)] font-mono">{formatTs(record.ts)}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
