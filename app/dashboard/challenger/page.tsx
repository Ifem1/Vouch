'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Loader2, Swords } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ChallengeScar } from '@/src/components/vouch/challenge-scar'
import { VerdictSeal } from '@/src/components/vouch/verdict-seal'
import { TxLink } from '@/src/components/vouch/tx-link'
import { getChallengerDashboard, requestChallengeVerdict, resolveChallenge, claimChallengeReward, getVerdict } from '@/lib/genlayer/vouch'
import { getConnectedAddress, connectWallet } from '@/lib/genlayer/client'
import type { Challenge, Verdict, TransactionResult } from '@/lib/types/vouch'
import { weiToGEN } from '@/lib/types/vouch'
import { toast } from 'sonner'

export default function ChallengerDashboardPage() {
  const [address, setAddress]       = useState<string | null>(null)
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [verdicts, setVerdicts]     = useState<Record<string, Verdict>>({})
  const [loading, setLoading]       = useState(true)
  const [txResult, setTxResult]     = useState<TransactionResult | null>(null)
  const [submitting, setSubmitting] = useState<string | null>(null)

  useEffect(() => {
    getConnectedAddress().then(async addr => {
      setAddress(addr)
      if (addr) {
        try {
          const chals = await getChallengerDashboard(addr)
          setChallenges(chals)
          const vMap: Record<string, Verdict> = {}
          await Promise.all(chals.filter(c => c.verdict_id).map(async c => {
            try { vMap[c.challenge_id] = await getVerdict(c.verdict_id!) } catch {}
          }))
          setVerdicts(vMap)
        } catch (e: unknown) { toast.error((e as Error).message) }
      }
      setLoading(false)
    })
  }, [])

  async function handleConnect() {
    try { const a = await connectWallet(); setAddress(a); window.location.reload() }
    catch (e: unknown) { toast.error((e as Error).message) }
  }

  async function act(fn: () => Promise<TransactionResult>, label: string, id: string) {
    setSubmitting(id)
    try { const r = await fn(); setTxResult(r); toast.success(label) }
    catch (e: unknown) { toast.error((e as Error).message) }
    finally { setSubmitting(null) }
  }

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-6 h-6 animate-spin text-[var(--bond-gold)]" /></div>

  if (!address) return (
    <div className="max-w-lg mx-auto px-6 py-24 text-center">
      <Swords className="w-12 h-12 text-[var(--challenge-red)] mx-auto mb-4" />
      <h1 className="font-display text-3xl font-bold text-[var(--paper-white)] mb-3">Challenger Dashboard</h1>
      <p className="text-[var(--muted-steel)] mb-6">Connect your wallet to see your challenges.</p>
      <Button onClick={handleConnect} className="bg-[var(--bond-gold)] hover:bg-yellow-500 text-[var(--vault-black)] font-semibold h-11 px-8">Connect Wallet</Button>
    </div>
  )

  const totalBond = challenges.reduce((s, c) => s + c.challenge_bond, 0)
  const won       = challenges.filter(c => c.reward_status === 'won').length

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <h1 className="font-display text-4xl font-bold text-[var(--paper-white)] mb-2">Challenger Dashboard</h1>
      <p className="text-[var(--muted-steel)] text-sm font-mono mb-10">{address}</p>

      {txResult && (
        <div className="mb-6 rounded-xl border border-[var(--verdict-green)]/30 bg-[var(--verdict-green)]/5 p-4 flex items-center justify-between">
          <span className="text-sm text-[var(--verdict-green)]">Transaction confirmed</span>
          <TxLink hash={txResult.hash} />
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-10">
        <div className="rounded-xl border border-[var(--line)] bg-[var(--fog-panel)] p-4">
          <p className="text-2xl font-display font-bold text-[var(--challenge-red)]">{challenges.length}</p>
          <p className="text-xs text-[var(--muted-steel)] mt-1">Challenges Filed</p>
        </div>
        <div className="rounded-xl border border-[var(--line)] bg-[var(--fog-panel)] p-4">
          <p className="text-2xl font-display font-bold text-[var(--bond-gold)]">{weiToGEN(totalBond)}</p>
          <p className="text-xs text-[var(--muted-steel)] mt-1">GEN in Challenge Bonds</p>
        </div>
        <div className="rounded-xl border border-[var(--line)] bg-[var(--fog-panel)] p-4">
          <p className="text-2xl font-display font-bold text-[var(--verdict-green)]">{won}</p>
          <p className="text-xs text-[var(--muted-steel)] mt-1">Challenges Won</p>
        </div>
      </div>

      {challenges.length === 0 ? (
        <div className="text-center py-16 rounded-xl border border-[var(--line)] bg-[var(--fog-panel)]">
          <Swords className="w-10 h-10 text-[var(--muted-steel)] mx-auto mb-3" />
          <p className="text-[var(--muted-steel)]">No challenges filed yet.</p>
          <Link href="/explore" className="inline-block mt-4">
            <Button variant="outline" className="border-[var(--line)] text-[var(--paper-white)] hover:bg-[var(--glass)]">Explore Capsules</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {challenges.map(ch => (
            <div key={ch.challenge_id} className="space-y-3">
              <ChallengeScar challenge={ch} verdict={verdicts[ch.challenge_id]} />

              {/* Action buttons */}
              <div className="flex gap-2 flex-wrap">
                <Link href={`/capsule/${ch.capsule_id}`}>
                  <Button size="sm" variant="outline" className="h-8 border-[var(--line)] text-[var(--muted-steel)] hover:text-[var(--paper-white)] text-xs">
                    View Capsule →
                  </Button>
                </Link>
                {ch.status === 'open' && (
                  <Button size="sm" onClick={() => act(() => requestChallengeVerdict(ch.challenge_id), 'Verdict requested', ch.challenge_id)}
                    disabled={submitting === ch.challenge_id}
                    className="h-8 bg-[var(--electric-violet)] hover:opacity-90 text-white text-xs">
                    {submitting === ch.challenge_id ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                    Request Verdict
                  </Button>
                )}
                {ch.status === 'verdict_pending' && (
                  <Button size="sm" onClick={() => act(() => resolveChallenge(ch.challenge_id), 'Challenge resolved', ch.challenge_id)}
                    disabled={submitting === ch.challenge_id}
                    className="h-8 bg-[var(--signal-blue)] hover:opacity-90 text-white text-xs">
                    {submitting === ch.challenge_id ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                    Resolve Challenge
                  </Button>
                )}
                {ch.status === 'resolved' && !ch.reward_claimed && (
                  <Button size="sm" onClick={() => act(() => claimChallengeReward(ch.challenge_id), 'Reward claimed', ch.challenge_id)}
                    disabled={submitting === ch.challenge_id}
                    className="h-8 bg-[var(--verdict-green)] hover:opacity-90 text-white text-xs">
                    {submitting === ch.challenge_id ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                    Claim Reward
                  </Button>
                )}
              </div>

              {verdicts[ch.challenge_id] && <VerdictSeal verdict={verdicts[ch.challenge_id]} />}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
