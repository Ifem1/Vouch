'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, ExternalLink, Shield, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { GENBondRail } from '@/src/components/vouch/gen-bond-rail'
import { EvidenceStack } from '@/src/components/vouch/evidence-stack'
import { EndorsementStack } from '@/src/components/vouch/endorsement-stack'
import { ChallengeScar } from '@/src/components/vouch/challenge-scar'
import { VerdictSeal } from '@/src/components/vouch/verdict-seal'
import { ReputationHeatRing } from '@/src/components/vouch/reputation-heat-ring'
import { TxLink } from '@/src/components/vouch/tx-link'
import {
  getCapsule, getCapsuleChallenges, getCapsuleEndorsements, getVerdict,
  endorseCapsule, openChallenge, buildExplorerAddressUrl,
} from '@/lib/genlayer/vouch'
import type { Capsule, Challenge, Endorsement, Verdict, TransactionResult } from '@/lib/types/vouch'
import { CATEGORY_LABELS, STATUS_LABELS, formatDate, weiToGEN, genToWei } from '@/lib/types/vouch'
import { shortenAddress } from '@/lib/utils/explorer'
import { toast } from 'sonner'

export default function CapsuleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  const [capsule, setCapsule]         = useState<Capsule | null>(null)
  const [challenges, setChallenges]   = useState<Challenge[]>([])
  const [endorsements, setEndorsements] = useState<Endorsement[]>([])
  const [verdict, setVerdict]         = useState<Verdict | null>(null)
  const [address, setAddress]         = useState<string | null>(null)
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState<string | null>(null)

  const [endorseOpen, setEndorseOpen] = useState(false)
  const [challengeOpen, setChallengeOpen] = useState(false)
  const [txResult, setTxResult]       = useState<TransactionResult | null>(null)
  const [submitting, setSubmitting]   = useState(false)

  // Endorse form
  const [endorseGEN, setEndorseGEN]   = useState('1')
  const [endorseNote, setEndorseNote] = useState('')

  // Challenge form
  const [chalType, setChalType]       = useState<string>('false_claim')
  const [chalSummary, setChalSummary] = useState('')
  const [chalEvidence, setChalEvidence] = useState('')
  const [chalGEN, setChalGEN]         = useState('2')

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        // Read wallet address directly — bypass session gate so the capsule
        // page always shows action buttons when a wallet is unlocked.
        let addr: string | null = null
        if (typeof window !== 'undefined' && window.ethereum) {
          try {
            const accs = (await window.ethereum.request({ method: 'eth_accounts' })) as string[]
            addr = accs[0] ?? null
          } catch { /* no wallet */ }
        }
        const [cap, chals, ends] = await Promise.all([
          getCapsule(id),
          getCapsuleChallenges(id),
          getCapsuleEndorsements(id),
        ])
        setCapsule(cap)
        setChallenges(chals)
        setEndorsements(ends)
        setAddress(addr)
        if (cap.latest_verdict_id) {
          const v = await getVerdict(cap.latest_verdict_id)
          setVerdict(v)
        }
      } catch (e: unknown) {
        setError((e as Error).message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  async function reload() {
    try {
      const [cap, chals, ends] = await Promise.all([
        getCapsule(id),
        getCapsuleChallenges(id),
        getCapsuleEndorsements(id),
      ])
      setCapsule(cap)
      setChallenges(chals)
      setEndorsements(ends)
      if (cap.latest_verdict_id) {
        const v = await getVerdict(cap.latest_verdict_id)
        setVerdict(v)
      }
    } catch { /* silent */ }
  }

  async function handleEndorse() {
    if (!capsule) return
    setSubmitting(true)
    try {
      const result = await endorseCapsule(capsule.capsule_id, genToWei(parseFloat(endorseGEN)), endorseNote)
      setTxResult(result)
      setEndorseOpen(false)
      toast.success('Endorsement submitted!')
      await reload()
    } catch (e: unknown) {
      toast.error((e as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleChallenge() {
    if (!capsule) return
    const urls = chalEvidence.split('\n').map(s => s.trim()).filter(Boolean)
    if (!urls.length) { toast.error('Add at least one evidence URL'); return }
    setSubmitting(true)
    try {
      const result = await openChallenge(capsule.capsule_id, chalType, chalSummary, urls, genToWei(parseFloat(chalGEN)))
      setTxResult(result)
      setChallengeOpen(false)
      toast.success('Challenge opened! Redirecting to your dashboard…')
      setTimeout(() => router.push('/dashboard/challenger'), 1500)
    } catch (e: unknown) {
      toast.error((e as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-6 h-6 animate-spin text-[var(--bond-gold)]" />
    </div>
  )

  if (error || !capsule) return (
    <div className="max-w-3xl mx-auto px-6 py-20 text-center">
      <AlertTriangle className="w-10 h-10 text-[var(--challenge-red)] mx-auto mb-4" />
      <p className="text-[var(--paper-white)] text-lg">{error ?? 'Capsule not found'}</p>
    </div>
  )

  const canEndorse = address && address !== capsule.owner && capsule.status === 'active'
  const canChallenge = address && !['retired','slashed','expired'].includes(capsule.status)

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      {/* Tx result banner */}
      {txResult && (
        <div className="mb-6 rounded-xl border border-[var(--verdict-green)]/30 bg-[var(--verdict-green)]/5 p-4 flex items-center justify-between">
          <span className="text-sm text-[var(--verdict-green)]">Transaction confirmed</span>
          <TxLink hash={txResult.hash} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header */}
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <Badge variant="outline" className="border-[var(--line)] text-[var(--muted-steel)]">
                {CATEGORY_LABELS[capsule.category]}
              </Badge>
              <span className={`text-xs font-mono px-2 py-0.5 rounded-full border status-${capsule.status}`} style={{ borderColor: 'currentColor' }}>
                {STATUS_LABELS[capsule.status]}
              </span>
              <span className="text-xs text-[var(--muted-steel)] font-mono">{capsule.capsule_id}</span>
            </div>
            <h1 className="font-display text-3xl font-bold text-[var(--paper-white)] mb-2">{capsule.claim_title}</h1>
            <div className="flex items-center gap-2 text-xs text-[var(--muted-steel)]">
              <span>Owner</span>
              <a href={buildExplorerAddressUrl(capsule.owner)} target="_blank" rel="noopener noreferrer"
                className="font-mono flex items-center gap-1 hover:text-[var(--bond-gold)] transition-colors">
                {shortenAddress(capsule.owner)} <ExternalLink className="w-3 h-3" />
              </a>
              <span>·</span>
              <span>Expires {formatDate(capsule.expires_at)}</span>
            </div>
          </div>

          {/* Claim body */}
          <div className="rounded-xl border border-[var(--line)] bg-[var(--fog-panel)] p-5">
            <h2 className="text-sm font-semibold text-[var(--muted-steel)] uppercase tracking-wider mb-3">Capability Claim</h2>
            <p className="text-[var(--paper-white)] leading-relaxed">{capsule.claim_body}</p>
          </div>

          {/* Scope */}
          {capsule.scope_boundaries && (
            <div className="rounded-xl border border-[var(--line)] bg-[var(--fog-panel)] p-5">
              <h2 className="text-sm font-semibold text-[var(--muted-steel)] uppercase tracking-wider mb-3">Scope Boundaries</h2>
              <p className="text-sm text-[var(--muted-steel)] leading-relaxed">{capsule.scope_boundaries}</p>
            </div>
          )}

          {/* Evidence */}
          <EvidenceStack urls={capsule.public_evidence_urls} />

          {/* Endorsements */}
          <EndorsementStack endorsements={endorsements} />

          {/* Verdict */}
          {verdict && <VerdictSeal verdict={verdict} />}

          {/* Challenges */}
          {challenges.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-[var(--muted-steel)] uppercase tracking-wider">Challenges ({challenges.length})</h2>
              {challenges.map(ch => <ChallengeScar key={ch.challenge_id} challenge={ch} verdict={ch.verdict_id === verdict?.verdict_id ? verdict ?? undefined : undefined} />)}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-4">
          <ReputationHeatRing capsule={capsule} />
          <GENBondRail bondWei={capsule.bond_amount} activeBond={capsule.active_bond} tier={capsule.bond_tier} />

          {/* Actions */}
          <div className="space-y-2">
            {canEndorse && (
              <Button onClick={() => setEndorseOpen(true)} className="w-full bg-[var(--bond-gold)] hover:bg-yellow-500 text-[var(--vault-black)] font-semibold gap-2">
                <Shield className="w-4 h-4" /> Endorse Capsule
              </Button>
            )}
            {canChallenge && (
              <Button onClick={() => setChallengeOpen(true)} variant="outline" className="w-full border-[var(--challenge-red)]/40 text-[var(--challenge-red)] hover:bg-[var(--challenge-red)]/10 gap-2">
                Challenge Capsule
              </Button>
            )}
            {!address && (
              <p className="text-xs text-center text-[var(--muted-steel)]">Connect wallet to endorse or challenge</p>
            )}
          </div>

          {/* Meta */}
          <div className="rounded-xl border border-[var(--line)] bg-[var(--fog-panel)] p-4 space-y-2 text-xs text-[var(--muted-steel)]">
            <div className="flex justify-between"><span>Created</span><span className="font-mono">{formatDate(capsule.created_at)}</span></div>
            <div className="flex justify-between"><span>Bond</span><span className="font-mono text-[var(--bond-gold)]">{weiToGEN(capsule.bond_amount)} GEN</span></div>
            <div className="flex justify-between"><span>Endorsements</span><span className="font-mono">{capsule.endorsement_count}</span></div>
            <div className="flex justify-between"><span>Challenges</span><span className={`font-mono ${capsule.challenge_count > 0 ? 'text-[var(--challenge-red)]' : ''}`}>{capsule.challenge_count}</span></div>
            <div className="flex justify-between"><span>Visibility</span><span className="font-mono capitalize">{capsule.visibility_mode}</span></div>
          </div>
        </div>
      </div>

      {/* Endorse Dialog */}
      <Dialog open={endorseOpen} onOpenChange={setEndorseOpen}>
        <DialogContent className="bg-[var(--fog-panel)] border-[var(--line)] text-[var(--paper-white)]">
          <DialogHeader><DialogTitle className="font-display">Endorse Capsule</DialogTitle></DialogHeader>
          <p className="text-xs text-[var(--muted-steel)]">Your GEN bond signals economic trust in this claim. It is at risk if the capsule is slashed.</p>
          <div className="space-y-4 mt-2">
            <div>
              <Label className="text-[var(--muted-steel)] text-xs mb-1">Bond Amount (GEN, min 1)</Label>
              <Input type="number" min="1" step="1" value={endorseGEN} onChange={e => setEndorseGEN(e.target.value)}
                className="bg-[var(--fog-panel-soft)] border-[var(--line)] text-[var(--paper-white)]" />
            </div>
            <div>
              <Label className="text-[var(--muted-steel)] text-xs mb-1">Note (optional)</Label>
              <Textarea value={endorseNote} onChange={e => setEndorseNote(e.target.value)} placeholder="Why are you endorsing this capsule?"
                className="bg-[var(--fog-panel-soft)] border-[var(--line)] text-[var(--paper-white)] placeholder:text-[var(--muted-steel)]" rows={3} />
            </div>
            <Button onClick={handleEndorse} disabled={submitting} className="w-full bg-[var(--bond-gold)] hover:bg-yellow-500 text-[var(--vault-black)] font-semibold">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Endorse with {endorseGEN} GEN
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Challenge Dialog */}
      <Dialog open={challengeOpen} onOpenChange={setChallengeOpen}>
        <DialogContent className="bg-[var(--fog-panel)] border-[var(--line)] text-[var(--paper-white)]">
          <DialogHeader><DialogTitle className="font-display">Challenge Capsule</DialogTitle></DialogHeader>
          <p className="text-xs text-[var(--muted-steel)]">Your GEN bond is forfeit if the challenge is dismissed. Submit credible evidence only.</p>
          <div className="space-y-4 mt-2">
            <div>
              <Label className="text-[var(--muted-steel)] text-xs mb-1">Challenge Type</Label>
              <Select value={chalType} onValueChange={(v) => { if (v) setChalType(v) }}>
                <SelectTrigger className="bg-[var(--fog-panel-soft)] border-[var(--line)] text-[var(--paper-white)]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[var(--fog-panel)] border-[var(--line)]">
                  {['false_claim','impersonation','evidence_fabrication','scope_mismatch','expired_capability','conduct_violation'].map(t => (
                    <SelectItem key={t} value={t} className="text-[var(--paper-white)]">{t.replace(/_/g, ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[var(--muted-steel)] text-xs mb-1">Challenge Summary</Label>
              <Textarea value={chalSummary} onChange={e => setChalSummary(e.target.value)} placeholder="Describe why this capsule's claim is inaccurate…"
                className="bg-[var(--fog-panel-soft)] border-[var(--line)] text-[var(--paper-white)] placeholder:text-[var(--muted-steel)]" rows={3} />
            </div>
            <div>
              <Label className="text-[var(--muted-steel)] text-xs mb-1">Evidence URLs (one per line)</Label>
              <Textarea value={chalEvidence} onChange={e => setChalEvidence(e.target.value)} placeholder="https://..."
                className="bg-[var(--fog-panel-soft)] border-[var(--line)] text-[var(--paper-white)] placeholder:text-[var(--muted-steel)] font-mono text-xs" rows={4} />
            </div>
            <div>
              <Label className="text-[var(--muted-steel)] text-xs mb-1">Challenge Bond (GEN, min 2)</Label>
              <Input type="number" min="2" step="1" value={chalGEN} onChange={e => setChalGEN(e.target.value)}
                className="bg-[var(--fog-panel-soft)] border-[var(--line)] text-[var(--paper-white)]" />
            </div>
            <Button onClick={handleChallenge} disabled={submitting} className="w-full border-[var(--challenge-red)] text-[var(--challenge-red)] hover:bg-[var(--challenge-red)]/10" variant="outline">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Open Challenge with {chalGEN} GEN
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
