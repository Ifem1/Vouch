'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Loader2, Shield, AlertTriangle, Clock, RefreshCw, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CapsuleCard } from '@/src/components/vouch/capsule-card'
import { TxLink } from '@/src/components/vouch/tx-link'
import { getCapsulesByOwner, retireCapsule, withdrawUnlockedBond } from '@/lib/genlayer/vouch'
import { getConnectedAddress, connectWallet } from '@/lib/genlayer/client'
import type { Capsule, TransactionResult } from '@/lib/types/vouch'
import { weiToGEN, daysUntilExpiry, STATUS_LABELS } from '@/lib/types/vouch'
import { toast } from 'sonner'

export default function OwnerDashboardPage() {
  const [address, setAddress]   = useState<string | null>(null)
  const [capsules, setCapsules] = useState<Capsule[]>([])
  const [loading, setLoading]   = useState(true)
  const [txResult, setTxResult] = useState<TransactionResult | null>(null)

  useEffect(() => {
    getConnectedAddress().then(async addr => {
      setAddress(addr)
      if (addr) {
        try { setCapsules(await getCapsulesByOwner(addr)) }
        catch (e: unknown) { toast.error((e as Error).message) }
      }
      setLoading(false)
    })
  }, [])

  async function handleConnect() {
    try { const a = await connectWallet(); setAddress(a); window.location.reload() }
    catch (e: unknown) { toast.error((e as Error).message) }
  }

  async function handleRetire(capsuleId: string) {
    try {
      const result = await retireCapsule(capsuleId)
      setTxResult(result)
      toast.success('Capsule retired')
    } catch (e: unknown) { toast.error((e as Error).message) }
  }

  async function handleWithdraw(capsuleId: string, activeBond: number) {
    try {
      const result = await withdrawUnlockedBond(capsuleId, BigInt(activeBond))
      setTxResult(result)
      toast.success('Bond withdrawn')
    } catch (e: unknown) { toast.error((e as Error).message) }
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-6 h-6 animate-spin text-[var(--bond-gold)]" />
    </div>
  )

  if (!address) return (
    <div className="max-w-lg mx-auto px-6 py-24 text-center">
      <Shield className="w-12 h-12 text-[var(--bond-gold)] mx-auto mb-4" />
      <h1 className="font-display text-3xl font-bold text-[var(--paper-white)] mb-3">Owner Dashboard</h1>
      <p className="text-[var(--muted-steel)] mb-6">Connect your wallet to see your capsules.</p>
      <Button onClick={handleConnect} className="bg-[var(--bond-gold)] hover:bg-yellow-500 text-[var(--vault-black)] font-semibold h-11 px-8">Connect Wallet</Button>
    </div>
  )

  const totalBond        = capsules.reduce((s, c) => s + c.active_bond, 0)
  const challenged       = capsules.filter(c => c.status === 'challenged')
  const nearExpiry       = capsules.filter(c => daysUntilExpiry(c) <= 7 && !['retired','slashed','expired'].includes(c.status))
  const withdrawable     = capsules.filter(c => ['retired','expired','upheld','downgraded'].includes(c.status) && c.active_bond > 0)

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="font-display text-4xl font-bold text-[var(--paper-white)] mb-1">Owner Dashboard</h1>
          <p className="text-[var(--muted-steel)] text-sm font-mono">{address}</p>
        </div>
        <Link href="/create">
          <Button className="bg-[var(--bond-gold)] hover:bg-yellow-500 text-[var(--vault-black)] font-semibold gap-2">
            <Plus className="w-4 h-4" /> New Capsule
          </Button>
        </Link>
      </div>

      {txResult && (
        <div className="mb-6 rounded-xl border border-[var(--verdict-green)]/30 bg-[var(--verdict-green)]/5 p-4 flex items-center justify-between">
          <span className="text-sm text-[var(--verdict-green)]">Transaction confirmed</span>
          <TxLink hash={txResult.hash} />
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
        {[
          { label: 'Capsules', value: String(capsules.length) },
          { label: 'Active Bond', value: `${weiToGEN(totalBond)} GEN` },
          { label: 'Under Challenge', value: String(challenged.length), red: challenged.length > 0 },
          { label: 'Near Expiry', value: String(nearExpiry.length), amber: nearExpiry.length > 0 },
        ].map(({ label, value, red, amber }) => (
          <div key={label} className="rounded-xl border border-[var(--line)] bg-[var(--fog-panel)] p-4">
            <p className={`text-2xl font-display font-bold ${red ? 'text-[var(--challenge-red)]' : amber ? 'text-[var(--bond-gold)]' : 'text-[var(--bond-gold)]'}`}>{value}</p>
            <p className="text-xs text-[var(--muted-steel)] mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Challenge alerts */}
      {challenged.length > 0 && (
        <div className="rounded-xl border border-[var(--challenge-red)]/30 bg-[var(--challenge-red)]/5 p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-[var(--challenge-red)]" />
            <h2 className="text-sm font-semibold text-[var(--challenge-red)]">Active Challenges ({challenged.length})</h2>
          </div>
          <div className="space-y-2">
            {challenged.map(c => (
              <Link key={c.capsule_id} href={`/capsule/${c.capsule_id}`} className="flex items-center justify-between p-3 rounded-lg bg-[var(--fog-panel)] hover:bg-[var(--fog-panel-soft)] transition-colors">
                <span className="text-sm text-[var(--paper-white)]">{c.claim_title}</span>
                <span className="text-xs font-mono text-[var(--challenge-red)]">challenged →</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Near expiry */}
      {nearExpiry.length > 0 && (
        <div className="rounded-xl border border-[var(--bond-gold)]/30 bg-[var(--bond-gold)]/5 p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-[var(--bond-gold)]" />
            <h2 className="text-sm font-semibold text-[var(--bond-gold)]">Expiring Soon ({nearExpiry.length})</h2>
          </div>
          {nearExpiry.map(c => (
            <div key={c.capsule_id} className="flex items-center justify-between p-3 rounded-lg bg-[var(--fog-panel)] mb-2">
              <span className="text-sm text-[var(--paper-white)]">{c.claim_title}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--bond-gold)] font-mono">{daysUntilExpiry(c)}d left</span>
                <Link href={`/capsule/${c.capsule_id}`}>
                  <Button size="sm" className="h-7 bg-[var(--bond-gold)] text-[var(--vault-black)] font-semibold gap-1">
                    <RefreshCw className="w-3 h-3" /> Renew
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Withdrawable */}
      {withdrawable.length > 0 && (
        <div className="rounded-xl border border-[var(--verdict-green)]/30 bg-[var(--verdict-green)]/5 p-4 mb-8">
          <h2 className="text-sm font-semibold text-[var(--verdict-green)] mb-3">Withdrawable Bond</h2>
          {withdrawable.map(c => (
            <div key={c.capsule_id} className="flex items-center justify-between p-3 rounded-lg bg-[var(--fog-panel)] mb-2">
              <div>
                <span className="text-sm text-[var(--paper-white)] block">{c.claim_title}</span>
                <span className="text-xs text-[var(--muted-steel)] font-mono">{STATUS_LABELS[c.status]}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-[var(--verdict-green)] font-mono">{weiToGEN(c.active_bond)} GEN</span>
                <Button size="sm" onClick={() => handleWithdraw(c.capsule_id, c.active_bond)}
                  className="h-7 bg-[var(--verdict-green)] text-white font-semibold">
                  Withdraw
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* All capsules */}
      <h2 className="text-sm font-semibold text-[var(--muted-steel)] uppercase tracking-wider mb-4">All Capsules ({capsules.length})</h2>
      {capsules.length === 0 ? (
        <div className="text-center py-16 rounded-xl border border-[var(--line)] bg-[var(--fog-panel)]">
          <Shield className="w-10 h-10 text-[var(--muted-steel)] mx-auto mb-3" />
          <p className="text-[var(--muted-steel)]">No capsules yet.</p>
          <Link href="/create" className="inline-block mt-4">
            <Button className="bg-[var(--bond-gold)] hover:bg-yellow-500 text-[var(--vault-black)] font-semibold">Create your first capsule</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {capsules.map(c => (
            <div key={c.capsule_id} className="flex gap-4 items-start">
              <div className="flex-1">
                <CapsuleCard capsule={c} />
              </div>
              <div className="shrink-0 flex flex-col gap-2 pt-1">
                {['active','upheld','downgraded'].includes(c.status) && (
                  <Button size="sm" variant="outline" onClick={() => handleRetire(c.capsule_id)}
                    className="border-[var(--line)] text-[var(--muted-steel)] hover:text-[var(--challenge-red)] hover:border-[var(--challenge-red)]/40 text-xs h-8">
                    Retire
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 p-4 rounded-xl border border-[var(--line)] bg-[var(--fog-panel)]">
        <p className="text-xs text-[var(--muted-steel)]">
          <strong className="text-[var(--paper-white)]">Private notes</strong> — Vouch does not store private notes on-chain. Use your own secure note-taking tools. Only commitment hashes are stored.
        </p>
      </div>
    </div>
  )
}
