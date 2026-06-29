'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, RefreshCw, Loader2, ExternalLink, AlertCircle, ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ClaimLens } from '@/components/cite/claim-lens'
import { EvidenceStack } from '@/components/cite/evidence-stack'
import { ConsensusPanel } from '@/components/cite/consensus-panel'
import { SourceAlignmentMap } from '@/components/cite/source-alignment-map'
import { TransactionState } from '@/components/cite/transaction-state'
import { getClaim, getEvidence, getClaimEvidenceIds, getLatestReview, requestReview, buildExplorerAddressUrl, parsePipeSeparated } from '@/lib/genlayer/cite'
import { connectWallet, getConnectedAddress } from '@/lib/genlayer/client'
import { shortenAddress } from '@/lib/utils/explorer'
import type { Claim, Evidence, Review, TxState } from '@/lib/types/cite'
import { toast } from 'sonner'

interface PageProps {
  params: Promise<{ id: string }>
}

export default function ClaimRoomPage({ params }: PageProps) {
  const { id } = use(params)
  const claimId = id // string IDs like "CLM-1"
  const router = useRouter()

  const [claim, setClaim] = useState<Claim | null>(null)
  const [evidenceItems, setEvidenceItems] = useState<Array<{ id: string; evidence: Evidence }>>([])
  const [review, setReview] = useState<Review | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [reviewTxState, setReviewTxState] = useState<TxState>('idle')
  const [reviewHash, setReviewHash] = useState('')
  const [reviewExplorerUrl, setReviewExplorerUrl] = useState('')
  const [reviewError, setReviewError] = useState('')

  async function loadData() {
    setLoading(true)
    setError(null)
    try {
      const c = await getClaim(claimId)
      setClaim(c)

      const idsRaw = await getClaimEvidenceIds(claimId)
      const eids = parsePipeSeparated(idsRaw as unknown as string)
      const items = await Promise.all(
        eids.map(async (eid: string) => {
          const ev = await getEvidence(eid)
          return { id: eid, evidence: ev }
        }),
      )
      setEvidenceItems(items)

      try {
        const rawReview = await getLatestReview(claimId)
        if (rawReview) {
          const parsed = typeof rawReview === 'string' ? JSON.parse(rawReview) : rawReview
          setReview(parsed)
        } else {
          setReview(null)
        }
      } catch {
        setReview(null)
      }
    } catch (err: unknown) {
      const e = err as Error
      if (e.message?.includes('not found')) {
        setError('Claim not found on-chain.')
      } else {
        setError('Failed to load claim. Check your wallet and network.')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [id])

  async function handleRequestReview() {
    setReviewError('')
    setReviewTxState('preparing')

    try {
      let address = await getConnectedAddress()
      if (!address) {
        setReviewTxState('wallet_confirm')
        address = await connectWallet()
      }

      setReviewTxState('wallet_confirm')
      const result = await requestReview(claimId as string)
      setReviewHash(result.hash)
      setReviewExplorerUrl(result.explorerUrl)

      if (result.status === 'confirmed') {
        setReviewTxState('confirmed')
        toast.success('Review requested — GenLayer validators are judging the evidence.')
        await loadData()
      } else {
        setReviewTxState('failed')
        setReviewError('Transaction failed.')
      }
    } catch (err: unknown) {
      const e = err as Error
      setReviewTxState('failed')
      setReviewError(e.message ?? 'Unknown error')
      toast.error(e.message ?? 'Review request failed')
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 flex items-center justify-center gap-3 text-[var(--paper-muted)]">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">Loading claim room…</span>
      </div>
    )
  }

  if (error || !claim) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center space-y-4">
        <AlertCircle className="w-8 h-8 text-[var(--contradiction-red)] mx-auto" />
        <p className="text-sm text-[var(--paper-muted)]">{error ?? 'Claim not found.'}</p>
        <Link href="/claims">
          <Button variant="outline" className="border-[var(--line)] text-[var(--paper)] hover:bg-[var(--glass)] gap-2">
            <ChevronLeft className="w-4 h-4" /> Back to Claims
          </Button>
        </Link>
      </div>
    )
  }

  const strongestId = review?.strongest_evidence_id
  const weakestId = review?.weakest_evidence_id

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 gap-4">
        <div className="flex items-center gap-3">
          <Link href="/claims">
            <Button variant="ghost" size="sm" className="text-[var(--paper-muted)] hover:text-[var(--paper)] gap-1.5 h-8">
              <ChevronLeft className="w-3.5 h-3.5" /> Claims
            </Button>
          </Link>
          <span className="text-[var(--line)]">/</span>
          <span className="text-xs font-mono text-[var(--paper-muted)]">Claim #{id}</span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={loadData}
            className="text-[var(--paper-muted)] hover:text-[var(--paper)] h-8 gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </Button>
          <Link href={`/claims/${id}/evidence/new`}>
            <Button size="sm" variant="outline" className="border-[var(--line)] text-[var(--paper)] hover:bg-[var(--glass)] gap-1.5 h-8">
              <Plus className="w-3.5 h-3.5" /> Submit Evidence
            </Button>
          </Link>
          <Button
            size="sm"
            onClick={handleRequestReview}
            disabled={
              evidenceItems.length === 0 ||
              (reviewTxState !== 'idle' && reviewTxState !== 'failed' && reviewTxState !== 'confirmed')
            }
            className="bg-[var(--violet-consensus)] hover:bg-purple-500 text-white gap-1.5 h-8"
          >
            {reviewTxState === 'preparing' || reviewTxState === 'wallet_confirm' || reviewTxState === 'submitted' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : null}
            Request Review
          </Button>
        </div>
      </div>

      {/* Creator info */}
      <div className="flex items-center gap-2 mb-6 text-xs font-mono text-[var(--paper-muted)]">
        <span>Creator:</span>
        <a
          href={buildExplorerAddressUrl(claim.creator)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--proof-blue)] hover:underline flex items-center gap-1"
        >
          {shortenAddress(claim.creator)} <ExternalLink className="w-2.5 h-2.5" />
        </a>
      </div>

      {/* Transaction state for review */}
      {reviewTxState !== 'idle' && (
        <div className="mb-6">
          <TransactionState
            state={reviewTxState}
            hash={reviewHash}
            explorerUrl={reviewExplorerUrl}
            errorMessage={reviewError}
          />
        </div>
      )}

      {/* Main 3-col layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_260px] gap-6">
        {/* Claim Lens */}
        <div className="space-y-4">
          <ClaimLens claim={claim} />
          <SourceAlignmentMap evidenceItems={evidenceItems} />
        </div>

        {/* Evidence Stack */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-mono text-[var(--paper-muted)] uppercase tracking-widest">Evidence</p>
            <Link href={`/claims/${id}/evidence/new`}>
              <Button size="sm" className="h-7 text-xs bg-[var(--proof-blue)] hover:bg-blue-500 text-white gap-1">
                <Plus className="w-3 h-3" /> Add
              </Button>
            </Link>
          </div>
          <EvidenceStack evidenceItems={evidenceItems} strongestId={strongestId} weakestId={weakestId} />
        </div>

        {/* Consensus Panel */}
        <div>
          <ConsensusPanel review={review} />
        </div>
      </div>
    </div>
  )
}
