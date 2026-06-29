'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Loader2, Star, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TxLink } from '@/src/components/vouch/tx-link'
import { getEndorserDashboard, withdrawEndorsement, claimEndorsementRefund } from '@/lib/genlayer/vouch'
import { getConnectedAddress, connectWallet } from '@/lib/genlayer/client'
import type { Endorsement, TransactionResult } from '@/lib/types/vouch'
import { weiToGEN, formatDate } from '@/lib/types/vouch'
import { shortenAddress } from '@/lib/utils/explorer'
import { toast } from 'sonner'

export default function EndorserDashboardPage() {
  const [address, setAddress]       = useState<string | null>(null)
  const [endorsements, setEndorsements] = useState<Endorsement[]>([])
  const [loading, setLoading]       = useState(true)
  const [txResult, setTxResult]     = useState<TransactionResult | null>(null)

  useEffect(() => {
    getConnectedAddress().then(async addr => {
      setAddress(addr)
      if (addr) {
        try { setEndorsements(await getEndorserDashboard(addr)) }
        catch (e: unknown) { toast.error((e as Error).message) }
      }
      setLoading(false)
    })
  }, [])

  async function handleConnect() {
    try { const a = await connectWallet(); setAddress(a); window.location.reload() }
    catch (e: unknown) { toast.error((e as Error).message) }
  }

  async function handleWithdraw(eid: string) {
    try { const r = await withdrawEndorsement(eid); setTxResult(r); toast.success('Endorsement withdrawn') }
    catch (e: unknown) { toast.error((e as Error).message) }
  }

  async function handleRefund(eid: string) {
    try { const r = await claimEndorsementRefund(eid); setTxResult(r); toast.success('Refund claimed') }
    catch (e: unknown) { toast.error((e as Error).message) }
  }

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-6 h-6 animate-spin text-[var(--bond-gold)]" /></div>

  if (!address) return (
    <div className="max-w-lg mx-auto px-6 py-24 text-center">
      <Star className="w-12 h-12 text-[var(--bond-gold)] mx-auto mb-4" />
      <h1 className="font-display text-3xl font-bold text-[var(--paper-white)] mb-3">Endorser Dashboard</h1>
      <p className="text-[var(--muted-steel)] mb-6">Connect your wallet to see your endorsements.</p>
      <Button onClick={handleConnect} className="bg-[var(--bond-gold)] hover:bg-yellow-500 text-[var(--vault-black)] font-semibold h-11 px-8">Connect Wallet</Button>
    </div>
  )

  const active      = endorsements.filter(e => e.status === 'active')
  const totalLocked = active.reduce((s, e) => s + e.bond_wei, 0)

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <h1 className="font-display text-4xl font-bold text-[var(--paper-white)] mb-2">Endorser Dashboard</h1>
      <p className="text-[var(--muted-steel)] text-sm font-mono mb-10">{address}</p>

      {txResult && (
        <div className="mb-6 rounded-xl border border-[var(--verdict-green)]/30 bg-[var(--verdict-green)]/5 p-4 flex items-center justify-between">
          <span className="text-sm text-[var(--verdict-green)]">Transaction confirmed</span>
          <TxLink hash={txResult.hash} />
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-10">
        <div className="rounded-xl border border-[var(--line)] bg-[var(--fog-panel)] p-4">
          <p className="text-2xl font-display font-bold text-[var(--bond-gold)]">{active.length}</p>
          <p className="text-xs text-[var(--muted-steel)] mt-1">Active Endorsements</p>
        </div>
        <div className="rounded-xl border border-[var(--line)] bg-[var(--fog-panel)] p-4">
          <p className="text-2xl font-display font-bold text-[var(--bond-gold)]">{weiToGEN(totalLocked)}</p>
          <p className="text-xs text-[var(--muted-steel)] mt-1">GEN Locked</p>
        </div>
        <div className="rounded-xl border border-[var(--line)] bg-[var(--fog-panel)] p-4">
          <p className="text-2xl font-display font-bold text-[var(--bond-gold)]">{endorsements.length}</p>
          <p className="text-xs text-[var(--muted-steel)] mt-1">Total Endorsements</p>
        </div>
      </div>

      {endorsements.length === 0 ? (
        <div className="text-center py-16 rounded-xl border border-[var(--line)] bg-[var(--fog-panel)]">
          <Star className="w-10 h-10 text-[var(--muted-steel)] mx-auto mb-3" />
          <p className="text-[var(--muted-steel)]">No endorsements yet.</p>
          <Link href="/explore" className="inline-block mt-4">
            <Button className="bg-[var(--bond-gold)] hover:bg-yellow-500 text-[var(--vault-black)] font-semibold">Explore Capsules</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {endorsements.map(e => (
            <div key={e.endorsement_id} className={`rounded-xl border p-4 ${
              e.status === 'withdrawn' ? 'border-[var(--line)] opacity-60 bg-[var(--fog-panel)]' : 'border-[var(--bond-gold)]/20 bg-[var(--fog-panel)]'
            }`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Link href={`/capsule/${e.capsule_id}`} className="text-sm font-semibold text-[var(--signal-blue)] hover:text-[var(--bond-gold)] transition-colors">
                      {e.capsule_id} →
                    </Link>
                    <span className={`text-xs font-mono ${e.status === 'active' ? 'text-[var(--verdict-green)]' : 'text-[var(--muted-steel)]'}`}>{e.status}</span>
                  </div>
                  <p className="text-xs text-[var(--muted-steel)] font-mono">{shortenAddress(e.endorser)}</p>
                  {e.note && <p className="text-xs text-[var(--muted-steel)] mt-1 italic">"{e.note}"</p>}
                  <p className="text-xs text-[var(--muted-steel)] mt-1">{formatDate(e.created_at)}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-base font-bold font-mono text-[var(--bond-gold)]">{weiToGEN(e.bond_wei)} GEN</p>
                  <div className="flex gap-1 mt-2 justify-end">
                    {e.status === 'active' && (
                      <Button size="sm" variant="outline" onClick={() => handleWithdraw(e.endorsement_id)}
                        className="h-7 text-xs border-[var(--line)] text-[var(--muted-steel)] hover:text-[var(--paper-white)]">
                        Withdraw
                      </Button>
                    )}
                    {e.status === 'withdrawn' && !e.refund_claimed && (
                      <Button size="sm" onClick={() => handleRefund(e.endorsement_id)}
                        className="h-7 text-xs bg-[var(--verdict-green)] text-white">
                        Claim Refund
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 p-4 rounded-xl border border-[var(--bond-gold)]/20 bg-[var(--bond-gold)]/5">
        <div className="flex gap-2">
          <AlertTriangle className="w-4 h-4 text-[var(--bond-gold)] shrink-0 mt-0.5" />
          <p className="text-xs text-[var(--muted-steel)]">
            Your endorsement bond may be affected if the endorsed capsule is challenged and a verdict is issued. Withdraw before a challenge opens if you want to exit cleanly.
          </p>
        </div>
      </div>
    </div>
  )
}
