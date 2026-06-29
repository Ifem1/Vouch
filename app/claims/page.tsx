'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Filter, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getClaim, getContractSummary } from '@/lib/genlayer/cite'
import type { Claim, ClaimStatus } from '@/lib/types/cite'
import { CLAIM_TYPE_LABELS, VERDICT_LABELS, VERDICT_COLORS } from '@/lib/types/cite'
import { formatTimestamp } from '@/lib/utils/explorer'

const DEMO_CLAIMS: Array<{ id: string; claim: Partial<Claim> }> = [
  {
    id: 'demo-1',
    claim: {
      title: 'GenLayer Studio provides a local environment for testing Intelligent Contracts',
      statement:
        'GenLayer Studio is described as a local development and testing environment for Intelligent Contracts in the official documentation.',
      claim_type: 'technical_capability',
      evidence_standard: 'official_source_or_repository',
      status: 'reviewed',
      evidence_count: '3',
      review_count: '1',
      final_verdict: 'proven',
      final_confidence: 'high',
      final_reason: 'Official docs directly confirm GenLayer Studio as a local testing sandbox.',
      created_at: new Date(Date.now() - 86400 * 3 * 1000).toISOString(),
    },
  },
  {
    id: 'demo-2',
    claim: {
      title: 'A founder publicly announced Machine Bound Identity',
      statement: 'The founder of a major protocol publicly announced "Machine Bound Identity" as a new product on social media.',
      claim_type: 'public_statement',
      evidence_standard: 'primary_source_required',
      status: 'open',
      evidence_count: '1',
      review_count: '0',
      final_verdict: '',
      created_at: new Date(Date.now() - 86400 * 1000).toISOString(),
    },
  },
  {
    id: 'demo-3',
    claim: {
      title: 'This protocol supports ERC-4337 account abstraction',
      statement: 'The protocol documentation explicitly states support for ERC-4337 account abstraction with at least one working integration.',
      claim_type: 'technical_capability',
      evidence_standard: 'strong_public_evidence',
      status: 'reviewed',
      evidence_count: '2',
      review_count: '1',
      final_verdict: 'weakly_supported',
      final_confidence: 'low',
      final_reason: 'Sources mention ERC-4337 briefly but do not prove active integration.',
      created_at: new Date(Date.now() - 86400 * 7 * 1000).toISOString(),
    },
  },
]

const STATUS_COLORS: Record<ClaimStatus, string> = {
  open: 'var(--proof-blue)',
  under_review: 'var(--amber-doubt)',
  reviewed: 'var(--source-green)',
  closed: 'var(--paper-muted)',
}

export default function ClaimsPage() {
  const [filter, setFilter] = useState<'all' | ClaimStatus>('all')
  const [onChainClaims, setOnChainClaims] = useState<Array<{ id: string; claim: Partial<Claim> }>>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Try to load some on-chain claims (ids 0-9)
    const addr = process.env.NEXT_PUBLIC_CITE_CONTRACT_ADDRESS
    if (!addr) return

    setLoading(true)
    ;(async () => {
      try {
        const summaryRaw = await getContractSummary()
        const summary = typeof summaryRaw === 'string' ? JSON.parse(summaryRaw) : summaryRaw
        const total = Number(summary?.claim_counter ?? 0)
        const fetched: Array<{ id: string; claim: Partial<Claim> }> = []
        const ids = Array.from({ length: Math.min(total, 20) }, (_, i) => `CLM-${i + 1}`)
        await Promise.all(
          ids.map((cid) =>
            getClaim(cid)
              .then((raw) => {
                const c: Claim = typeof raw === 'string' ? JSON.parse(raw) : raw
                if (c && c.claim_id) fetched.push({ id: cid, claim: c })
              })
              .catch(() => null),
          ),
        )
        setOnChainClaims(fetched.sort((a, b) => (b.id > a.id ? 1 : -1)))
      } catch {
        setError('Failed to load on-chain claims')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const allClaims = onChainClaims.length > 0 ? onChainClaims : DEMO_CLAIMS
  const isDemo = onChainClaims.length === 0

  const filtered =
    filter === 'all' ? allClaims : allClaims.filter((c) => c.claim.status === filter)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl text-[var(--paper)]">Evidence Court</h1>
          <p className="text-sm text-[var(--paper-muted)] mt-1">Public claims awaiting evidence and verdict.</p>
        </div>
        <Link href="/claims/new">
          <Button className="bg-[var(--proof-blue)] hover:bg-blue-500 text-white gap-2">
            <Plus className="w-4 h-4" /> Create Claim
          </Button>
        </Link>
      </div>

      {isDemo && (
        <div className="mb-6 flex items-center gap-2 text-xs font-mono text-[var(--amber-doubt)] border border-[var(--amber-doubt)]/30 rounded px-3 py-2 bg-[var(--amber-doubt)]/5">
          <AlertCircle className="w-3.5 h-3.5" />
          Showing demo fixtures. Deploy the contract and set NEXT_PUBLIC_CITE_CONTRACT_ADDRESS to see on-chain claims.
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Filters */}
        <aside className="lg:w-48 shrink-0">
          <div className="sticky top-20 space-y-1">
            <p className="text-xs font-mono text-[var(--paper-muted)] uppercase tracking-widest mb-3 flex items-center gap-1">
              <Filter className="w-3 h-3" /> Filter
            </p>
            {(['all', 'open', 'under_review', 'reviewed', 'closed'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`w-full text-left px-3 py-2 rounded text-xs font-mono transition-colors ${
                  filter === s
                    ? 'bg-[var(--glass)] text-[var(--paper)] border border-[var(--line)]'
                    : 'text-[var(--paper-muted)] hover:text-[var(--paper)] hover:bg-[var(--glass)]'
                }`}
              >
                {s === 'all' ? 'All Claims' : s.replace('_', ' ')}
              </button>
            ))}
          </div>
        </aside>

        {/* Claim cards */}
        <div className="flex-1 space-y-4">
          {loading && (
            <div className="flex items-center gap-2 text-sm text-[var(--paper-muted)]">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading claims…
            </div>
          )}
          {error && <p className="text-sm text-[var(--contradiction-red)]">{error}</p>}
          {filtered.length === 0 && !loading && (
            <div className="py-20 text-center">
              <p className="text-sm text-[var(--paper-muted)]">No claims match this filter.</p>
            </div>
          )}
          {filtered.map(({ id, claim }) => {
            const status = (claim.status ?? 'open') as ClaimStatus
            const verdict = claim.final_verdict
            return (
              <Link key={id} href={id.startsWith('demo') ? '#' : `/claims/${id}`}>
                <div className="rounded-lg border border-[var(--line)] bg-[var(--panel)] hover:border-[var(--proof-blue)]/40 hover:bg-[var(--panel-soft)] transition-all p-5 space-y-3 cursor-pointer">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="text-sm font-medium text-[var(--paper)] leading-snug flex-1">
                      {claim.title}
                    </h2>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ background: STATUS_COLORS[status] }}
                      />
                      <span className="text-xs font-mono text-[var(--paper-muted)] capitalize">
                        {status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-[var(--paper-muted)] leading-relaxed line-clamp-2">{claim.statement}</p>

                  <div className="flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center gap-3 text-[var(--paper-muted)]">
                      <Badge variant="outline" className="text-[10px] border-[var(--line)] text-[var(--paper-muted)]">
                        {CLAIM_TYPE_LABELS[claim.claim_type as keyof typeof CLAIM_TYPE_LABELS] ?? claim.claim_type}
                      </Badge>
                      <span>{Number(claim.evidence_count)} evidence</span>
                      {claim.created_at && <span>{formatTimestamp(claim.created_at)}</span>}
                    </div>

                    {verdict && (
                      <span
                        className="font-mono text-[10px] uppercase"
                        style={{ color: VERDICT_COLORS[verdict as keyof typeof VERDICT_COLORS] ?? 'var(--paper-muted)' }}
                      >
                        {VERDICT_LABELS[verdict as keyof typeof VERDICT_LABELS] ?? verdict}
                      </span>
                    )}
                  </div>

                  {id.startsWith('demo') && (
                    <span className="text-[10px] font-mono text-[var(--paper-muted)] border border-[var(--line)] rounded px-1.5 py-0.5">
                      demo
                    </span>
                  )}
                </div>
              </Link>
            )
          })}
        </div>

        {/* Consensus heat */}
        <aside className="hidden xl:block w-52 shrink-0">
          <div className="sticky top-20 rounded-lg border border-[var(--line)] bg-[var(--panel-soft)] p-4 space-y-3">
            <p className="text-xs font-mono text-[var(--paper-muted)] uppercase tracking-widest">Verdict Heat</p>
            {[
              { label: 'Proven', color: 'var(--source-green)', pct: 35 },
              { label: 'Mostly Supported', color: 'var(--source-green)', pct: 20 },
              { label: 'Weakly Supported', color: 'var(--amber-doubt)', pct: 15 },
              { label: 'Insufficient', color: 'var(--paper-muted)', pct: 20 },
              { label: 'Contradicted', color: 'var(--contradiction-red)', pct: 10 },
            ].map(({ label, color, pct }) => (
              <div key={label} className="space-y-1">
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span style={{ color }}>{label}</span>
                  <span className="text-[var(--paper-muted)]">{pct}%</span>
                </div>
                <div className="h-1 rounded-full bg-[var(--glass)]">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                </div>
              </div>
            ))}
            <p className="text-[10px] font-mono text-[var(--paper-muted)] text-center">Demo distribution</p>
          </div>
        </aside>
      </div>
    </div>
  )
}
