'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { ChevronLeft, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { VerdictRing } from '@/components/cite/verdict-ring'
import { getReview, getEvidence } from '@/lib/genlayer/cite'
import { formatTimestamp } from '@/lib/utils/explorer'
import type { Review, Evidence, Verdict, Confidence } from '@/lib/types/cite'
import { VERDICT_LABELS, VERDICT_COLORS } from '@/lib/types/cite'

interface PageProps {
  params: Promise<{ id: string; reviewId: string }>
}

export default function ReviewResultPage({ params }: PageProps) {
  const { id, reviewId } = use(params)

  const [review, setReview] = useState<Review | null>(null)
  const [strongest, setStrongest] = useState<Evidence | null>(null)
  const [weakest, setWeakest] = useState<Evidence | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const rawReview = await getReview(reviewId)
        const r: Review = typeof rawReview === 'string' ? JSON.parse(rawReview) : rawReview
        setReview(r)

        const strongestId = String(r.strongest_evidence_id)
        const weakestId = String(r.weakest_evidence_id)
        const [s, w] = await Promise.all([
          strongestId && strongestId !== '0' ? getEvidence(strongestId).catch(() => null) : Promise.resolve(null),
          weakestId && weakestId !== '0' ? getEvidence(weakestId).catch(() => null) : Promise.resolve(null),
        ])
        setStrongest(s)
        setWeakest(w)
      } catch {
        setError('Review not found.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [reviewId])

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 flex items-center justify-center gap-3 text-[var(--paper-muted)]">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">Loading verdict…</span>
      </div>
    )
  }

  if (error || !review) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <p className="text-sm text-[var(--paper-muted)]">{error ?? 'Review not found.'}</p>
        <Link href={`/claims/${id}`} className="mt-4 inline-block">
          <Button variant="outline" className="border-[var(--line)] text-[var(--paper)] hover:bg-[var(--glass)] gap-2">
            <ChevronLeft className="w-4 h-4" /> Back to Claim
          </Button>
        </Link>
      </div>
    )
  }

  let canonicalData: Record<string, unknown> | null = null
  try {
    canonicalData = JSON.parse(review.canonical_json)
  } catch {
    /* ignore */
  }

  const verdictColor = VERDICT_COLORS[review.overall_verdict] ?? 'var(--paper-muted)'

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex items-center gap-3 mb-8">
        <Link href={`/claims/${id}`}>
          <Button variant="ghost" size="sm" className="text-[var(--paper-muted)] hover:text-[var(--paper)] gap-1.5 h-8">
            <ChevronLeft className="w-3.5 h-3.5" /> Claim Room
          </Button>
        </Link>
        <span className="text-[var(--line)]">/</span>
        <span className="text-xs font-mono text-[var(--paper-muted)]">Review #{reviewId}</span>
      </div>

      {/* Judicial header */}
      <div className="rounded-lg border border-[var(--line)] bg-[var(--panel-soft)] p-8 text-center space-y-6 mb-6">
        <div>
          <p className="text-xs font-mono text-[var(--paper-muted)] uppercase tracking-widest mb-2">
            GenLayer Evidence Verdict
          </p>
          <p className="text-xs font-mono text-[var(--paper-muted)]">{formatTimestamp(review.requested_at)}</p>
        </div>

        <div className="flex justify-center">
          <VerdictRing verdict={review.overall_verdict as Verdict} confidence={review.confidence as Confidence} size={160} />
        </div>

        <div>
          <h1
            className="font-display text-4xl"
            style={{ color: verdictColor }}
          >
            {VERDICT_LABELS[review.overall_verdict as Verdict] ?? review.overall_verdict}
          </h1>
          <p className="text-sm text-[var(--paper-muted)] mt-2 leading-relaxed max-w-lg mx-auto">
            {review.short_reason}
          </p>
        </div>
      </div>

      {/* Detail grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <DetailCard label="Confidence">
          <span className="font-mono text-sm capitalize text-[var(--paper)]">{review.confidence}</span>
        </DetailCard>
        <DetailCard label="Source Alignment">
          <span className="font-mono text-sm capitalize text-[var(--paper)]">
            {review.source_alignment.replace('_', ' ')}
          </span>
        </DetailCard>
        <DetailCard label="Strongest Evidence">
          <span className="font-mono text-sm text-[var(--source-green)]">
            #{Number(review.strongest_evidence_id)}
            {strongest ? ` — ${strongest.source_title.slice(0, 40)}…` : ''}
          </span>
        </DetailCard>
        <DetailCard label="Weakest Evidence">
          <span className="font-mono text-sm text-[var(--amber-doubt)]">
            #{Number(review.weakest_evidence_id)}
            {weakest ? ` — ${weakest.source_title.slice(0, 40)}…` : ''}
          </span>
        </DetailCard>
      </div>

      {/* Contradiction */}
      {review.contradiction_found ? (
        <div className="flex items-start gap-3 rounded-lg border border-[var(--contradiction-red)]/30 bg-[var(--contradiction-red)]/5 p-4 mb-6">
          <AlertTriangle className="w-4 h-4 text-[var(--contradiction-red)] shrink-0" />
          <div>
            <p className="text-sm font-medium text-[var(--contradiction-red)]">Contradiction Detected</p>
            <p className="text-xs text-[var(--paper-muted)] mt-1">
              Validators found conflicting evidence items in this set.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3 rounded-lg border border-[var(--source-green)]/20 bg-[var(--source-green)]/5 p-4 mb-6">
          <CheckCircle2 className="w-4 h-4 text-[var(--source-green)] shrink-0" />
          <p className="text-sm text-[var(--paper-muted)]">No contradiction detected in the evidence set.</p>
        </div>
      )}

      {/* Canonical JSON */}
      {canonicalData && (
        <div className="rounded-lg border border-[var(--line)] bg-[var(--panel)] p-5 mb-6">
          <p className="text-xs font-mono text-[var(--paper-muted)] uppercase tracking-widest mb-3">Canonical JSON</p>
          <pre className="text-xs font-mono text-[var(--paper-muted)] overflow-x-auto leading-relaxed">
            {JSON.stringify(canonicalData, null, 2)}
          </pre>
        </div>
      )}

      {/* Explorer */}
      <div className="rounded-lg border border-[var(--line)] bg-[var(--panel-soft)] p-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-mono text-[var(--paper-muted)] mb-1">On-Chain Record</p>
          <p className="text-xs font-mono text-[var(--paper)]">Review #{reviewId} · Claim #{id}</p>
        </div>
        <Link href={`/claims/${id}`}>
          <Button variant="outline" size="sm" className="border-[var(--line)] text-[var(--paper)] hover:bg-[var(--glass)] h-8 gap-1.5">
            View Claim Room
          </Button>
        </Link>
      </div>
    </div>
  )
}

function DetailCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-[var(--line)] bg-[var(--panel)] p-4">
      <p className="text-xs font-mono text-[var(--paper-muted)] mb-1">{label}</p>
      {children}
    </div>
  )
}
