'use client'

import Link from 'next/link'
import { Shield, Star, Swords, Clock, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { Capsule } from '@/lib/types/vouch'
import { weiToGEN, formatDate, CATEGORY_LABELS, STATUS_LABELS, BOND_TIER_LABELS, daysUntilExpiry, isExpired } from '@/lib/types/vouch'
import { shortenAddress } from '@/lib/utils/explorer'

interface Props {
  capsule: Capsule
  showOwner?: boolean
}

const STATUS_ICON = {
  active:       <CheckCircle2 className="w-3 h-3" />,
  challenged:   <AlertTriangle className="w-3 h-3" />,
  slashed:      <XCircle className="w-3 h-3" />,
  suspended:    <XCircle className="w-3 h-3" />,
  upheld:       <CheckCircle2 className="w-3 h-3" />,
  downgraded:   <AlertTriangle className="w-3 h-3" />,
  under_review: <Clock className="w-3 h-3" />,
  expired:      <Clock className="w-3 h-3" />,
  retired:      <Clock className="w-3 h-3" />,
}

function getBorderColor(status: Capsule['status']): string {
  if (['active', 'upheld'].includes(status)) return 'border-l-[var(--verdict-green)]'
  if (['challenged', 'slashed', 'suspended'].includes(status)) return 'border-l-[var(--challenge-red)]'
  if (status === 'downgraded') return 'border-l-[var(--bond-gold)]'
  return 'border-l-[var(--muted-steel)]'
}

export function CapsuleCard({ capsule, showOwner = false }: Props) {
  const days = daysUntilExpiry(capsule)
  const expired = isExpired(capsule)

  return (
    <Link href={`/capsule/${capsule.capsule_id}`} className="block group">
      <div className={`relative rounded-xl border border-[var(--line)] bg-[var(--fog-panel)] border-l-2 ${getBorderColor(capsule.status)} p-5 transition-all hover:border-[var(--bond-gold)]/40 hover:bg-[var(--fog-panel-soft)] hover:shadow-lg hover:shadow-[var(--bond-gold)]/5`}>

        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-display font-semibold text-[var(--paper-white)] text-base leading-tight truncate group-hover:text-[var(--bond-gold)] transition-colors">
              {capsule.claim_title}
            </h3>
            {showOwner && (
              <p className="text-xs text-[var(--muted-steel)] font-mono mt-0.5">
                {shortenAddress(capsule.owner)}
              </p>
            )}
          </div>
          <div className={`flex items-center gap-1 text-xs font-mono px-2 py-0.5 rounded-full border shrink-0 status-${capsule.status}`}
            style={{ borderColor: 'currentColor', opacity: 0.9 }}>
            {STATUS_ICON[capsule.status]}
            {STATUS_LABELS[capsule.status]}
          </div>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          <Badge variant="outline" className="text-xs border-[var(--line)] text-[var(--muted-steel)]">
            {CATEGORY_LABELS[capsule.category]}
          </Badge>
          <Badge variant="outline" className={`text-xs border-[var(--line)] tier-${capsule.bond_tier}`}>
            {BOND_TIER_LABELS[capsule.bond_tier]}
          </Badge>
          {capsule.latest_verdict_id && (
            <Badge variant="outline" className="text-xs border-[var(--electric-violet)]/30 text-[var(--electric-violet)]">
              Verdict
            </Badge>
          )}
        </div>

        {/* Stats row */}
        <div className="flex items-center justify-between text-xs text-[var(--muted-steel)]">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Shield className="w-3 h-3 text-[var(--bond-gold)]" />
              {weiToGEN(capsule.bond_amount)} GEN
            </span>
            <span className="flex items-center gap-1">
              <Star className="w-3 h-3" />
              {capsule.endorsement_count}
            </span>
            <span className={`flex items-center gap-1 ${capsule.challenge_count > 0 ? 'text-[var(--challenge-red)]' : ''}`}>
              <Swords className="w-3 h-3" />
              {capsule.challenge_count}
            </span>
          </div>
          <span className={`flex items-center gap-1 font-mono ${expired ? 'text-[var(--challenge-red)]' : days <= 7 ? 'text-[var(--bond-gold)]' : ''}`}>
            <Clock className="w-3 h-3" />
            {expired ? 'Expired' : `${days}d`}
          </span>
        </div>

        {/* Expiry */}
        <p className="text-xs text-[var(--muted-steel)] mt-2 font-mono">
          Expires {formatDate(capsule.expires_at)}
        </p>
      </div>
    </Link>
  )
}
