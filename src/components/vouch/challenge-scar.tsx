import { Swords, Clock, CheckCircle2, AlertTriangle } from 'lucide-react'
import type { Challenge, Verdict } from '@/lib/types/vouch'
import { formatDate, CHALLENGE_TYPE_LABELS, VERDICT_LABELS } from '@/lib/types/vouch'
import { weiToGEN } from '@/lib/types/vouch'

interface Props {
  challenge: Challenge
  verdict?:  Verdict
}

export function ChallengeScar({ challenge, verdict }: Props) {
  const isOpen    = challenge.status === 'open'
  const isPending = challenge.status === 'verdict_pending'
  const resolved  = challenge.status === 'resolved'

  return (
    <div className={`rounded-xl border p-4 ${
      isOpen || isPending
        ? 'border-[var(--challenge-red)]/40 bg-[var(--challenge-red)]/5 glow-red'
        : resolved && verdict?.action?.startsWith('slash')
        ? 'border-[var(--challenge-red)]/30 bg-[var(--fog-panel)]'
        : 'border-[var(--line)] bg-[var(--fog-panel)]'
    }`}>

      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Swords className={`w-4 h-4 ${isOpen || isPending ? 'text-[var(--challenge-red)]' : 'text-[var(--muted-steel)]'}`} />
          <span className="text-sm font-semibold text-[var(--paper-white)]">
            {CHALLENGE_TYPE_LABELS[challenge.challenge_type]}
          </span>
          <span className="text-xs font-mono text-[var(--muted-steel)]">{challenge.challenge_id}</span>
        </div>
        <div className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-mono ${
          isOpen || isPending ? 'text-[var(--challenge-red)] border-[var(--challenge-red)]/30' :
          resolved ? 'text-[var(--verdict-green)] border-[var(--verdict-green)]/30' :
          'text-[var(--muted-steel)] border-[var(--line)]'
        }`}>
          {isOpen && <><AlertTriangle className="w-3 h-3" /> Open</>}
          {isPending && <><Clock className="w-3 h-3" /> Pending Verdict</>}
          {resolved && <><CheckCircle2 className="w-3 h-3" /> Resolved</>}
        </div>
      </div>

      {/* Summary */}
      <p className="text-sm text-[var(--muted-steel)] mb-3 line-clamp-2">{challenge.challenge_summary}</p>

      {/* Bond */}
      <div className="flex items-center gap-4 text-xs text-[var(--muted-steel)] mb-3">
        <span className="flex items-center gap-1">
          <span className="text-[var(--challenge-red)]">●</span>
          {weiToGEN(challenge.challenge_bond)} GEN bond
        </span>
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {formatDate(challenge.created_at)}
        </span>
        {challenge.resolved_at && (
          <span>Resolved {formatDate(challenge.resolved_at)}</span>
        )}
      </div>

      {/* Evidence links */}
      {challenge.evidence_urls.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {challenge.evidence_urls.map((url, i) => (
            <a key={i} href={url} target="_blank" rel="noopener noreferrer"
              className="text-xs text-[var(--signal-blue)] hover:underline font-mono truncate max-w-[200px]">
              ↗ {new URL(url).hostname}
            </a>
          ))}
        </div>
      )}

      {/* Verdict strip */}
      {verdict && (
        <div className={`mt-2 pt-3 border-t border-[var(--line)] flex items-center gap-2`}>
          <span className="text-xs text-[var(--muted-steel)]">Verdict:</span>
          <span className={`text-xs font-semibold verdict-${verdict.verdict_status}`}>
            {VERDICT_LABELS[verdict.verdict_status]}
          </span>
          <span className="text-xs text-[var(--muted-steel)]">·</span>
          <span className="text-xs text-[var(--muted-steel)]">{verdict.short_reason}</span>
        </div>
      )}

      {/* Reward status */}
      {challenge.reward_status && (
        <div className="mt-2 pt-2 border-t border-[var(--line)]">
          <span className={`text-xs font-mono ${
            challenge.reward_status === 'won' ? 'text-[var(--verdict-green)]' :
            challenge.reward_status === 'forfeited' ? 'text-[var(--challenge-red)]' :
            'text-[var(--muted-steel)]'
          }`}>
            Reward: {challenge.reward_status}
          </span>
        </div>
      )}
    </div>
  )
}
