'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, Loader2, Compass } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { CapsuleCard } from '@/src/components/vouch/capsule-card'
import { getPublicCapsules } from '@/lib/genlayer/vouch'
import { VOUCH_CONTRACT_ADDRESS } from '@/lib/genlayer/vouch'
import type { Capsule, CapsuleStatus, BondTier, CapsuleCategory } from '@/lib/types/vouch'
import { CATEGORY_LABELS, STATUS_LABELS, BOND_TIER_LABELS } from '@/lib/types/vouch'

const PAGE_SIZE = 20

export default function ExplorePage() {
  const [capsules, setCapsules]   = useState<Capsule[]>([])
  const [filtered, setFiltered]   = useState<Capsule[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)
  const [query, setQuery]         = useState('')
  const [category, setCategory]   = useState<string>('all')
  const [status, setStatus]       = useState<string>('all')
  const [tier, setTier]           = useState<string>('all')
  const [offset, setOffset]       = useState(0)
  const [hasMore, setHasMore]     = useState(true)

  const load = useCallback(async (reset = false) => {
    if (!VOUCH_CONTRACT_ADDRESS) { setLoading(false); return }
    setLoading(true)
    try {
      const newOffset = reset ? 0 : offset
      const data      = await getPublicCapsules(newOffset, PAGE_SIZE)
      setCapsules(prev => reset ? data : [...prev, ...data])
      setOffset(newOffset + data.length)
      setHasMore(data.length === PAGE_SIZE)
      setError(null)
    } catch (e: unknown) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [offset])

  useEffect(() => { load(true) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let result = capsules
    if (query)           result = result.filter(c => c.claim_title.toLowerCase().includes(query.toLowerCase()))
    if (category !== 'all') result = result.filter(c => c.category === category)
    if (status !== 'all')   result = result.filter(c => c.status === status)
    if (tier !== 'all')     result = result.filter(c => c.bond_tier === tier)
    setFiltered(result)
  }, [capsules, query, category, status, tier])

  if (!VOUCH_CONTRACT_ADDRESS) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-20 text-center">
        <Compass className="w-12 h-12 text-[var(--muted-steel)] mx-auto mb-4" />
        <h1 className="font-display text-2xl text-[var(--paper-white)] mb-2">Contract not configured</h1>
        <p className="text-[var(--muted-steel)] text-sm">Set <code className="font-mono text-[var(--bond-gold)]">NEXT_PUBLIC_VOUCH_CONTRACT_ADDRESS</code> in your <code className="font-mono">.env.local</code> to explore capsules.</p>
      </div>
    )
  }

  const categories: CapsuleCategory[] = ['engineering','design','research','operations','community','ai_agent','identity','other']
  const statuses: CapsuleStatus[]     = ['active','challenged','upheld','downgraded','suspended','slashed','expired','retired']
  const tiers: BondTier[]             = ['micro','standard','high_trust','institutional']

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      {/* Header */}
      <div className="mb-10">
        <h1 className="font-display text-4xl font-bold text-[var(--paper-white)] mb-2">Explore Capsules</h1>
        <p className="text-[var(--muted-steel)]">Public GEN-backed reputation capsules on StudioNet.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-8">
        <div className="relative flex-1 min-w-60">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-steel)]" />
          <Input
            placeholder="Search capsules…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="pl-9 bg-[var(--fog-panel)] border-[var(--line)] text-[var(--paper-white)] placeholder:text-[var(--muted-steel)]"
          />
        </div>

        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          className="bg-[var(--fog-panel)] border border-[var(--line)] text-[var(--paper-white)] text-sm rounded-lg px-3 py-2"
        >
          <option value="all">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
        </select>

        <select
          value={status}
          onChange={e => setStatus(e.target.value)}
          className="bg-[var(--fog-panel)] border border-[var(--line)] text-[var(--paper-white)] text-sm rounded-lg px-3 py-2"
        >
          <option value="all">All Statuses</option>
          {statuses.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>

        <select
          value={tier}
          onChange={e => setTier(e.target.value)}
          className="bg-[var(--fog-panel)] border border-[var(--line)] text-[var(--paper-white)] text-sm rounded-lg px-3 py-2"
        >
          <option value="all">All Bond Tiers</option>
          {tiers.map(t => <option key={t} value={t}>{BOND_TIER_LABELS[t]}</option>)}
        </select>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-[var(--challenge-red)]/30 bg-[var(--challenge-red)]/5 p-4 mb-6 text-sm text-[var(--challenge-red)]">
          {error}
        </div>
      )}

      {/* Results */}
      {loading && capsules.length === 0 ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-6 h-6 animate-spin text-[var(--bond-gold)]" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-24">
          <Compass className="w-10 h-10 text-[var(--muted-steel)] mx-auto mb-4" />
          <p className="text-[var(--muted-steel)]">No capsules found matching your filters.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
            {filtered.map(capsule => (
              <CapsuleCard key={capsule.capsule_id} capsule={capsule} showOwner />
            ))}
          </div>
          {hasMore && (
            <div className="text-center">
              <Button
                variant="outline"
                onClick={() => load()}
                disabled={loading}
                className="border-[var(--line)] text-[var(--paper-white)] hover:bg-[var(--glass)]"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Load more
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
