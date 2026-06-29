'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Loader2, Wallet, ArrowUpRight, ArrowDownLeft, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { WalletExposurePanel } from '@/src/components/vouch/wallet-exposure-panel'
import { getWalletActivity } from '@/lib/genlayer/vouch'
import { getConnectedAddress, connectWallet } from '@/lib/genlayer/client'
import type { ActivityRecord } from '@/lib/types/vouch'
import { weiToGEN, formatDate } from '@/lib/types/vouch'
import { toast } from 'sonner'

const TYPE_ICON: Record<string, React.ReactNode> = {
  create_capsule:       <ArrowUpRight className="w-3.5 h-3.5 text-[var(--signal-blue)]" />,
  endorse_capsule:      <ArrowUpRight className="w-3.5 h-3.5 text-[var(--bond-gold)]" />,
  open_challenge:       <Zap className="w-3.5 h-3.5 text-[var(--challenge-red)]" />,
  withdraw_endorsement: <ArrowDownLeft className="w-3.5 h-3.5 text-[var(--verdict-green)]" />,
  claim_refund:         <ArrowDownLeft className="w-3.5 h-3.5 text-[var(--verdict-green)]" />,
  claim_reward:         <ArrowDownLeft className="w-3.5 h-3.5 text-[var(--verdict-green)]" />,
  withdraw_bond:        <ArrowDownLeft className="w-3.5 h-3.5 text-[var(--verdict-green)]" />,
  retire_capsule:       <ArrowUpRight className="w-3.5 h-3.5 text-[var(--muted-steel)]" />,
}

function isOutgoing(rec: ActivityRecord): boolean {
  return ['create_capsule', 'endorse_capsule', 'open_challenge', 'increase_bond', 'renew_capsule'].includes(rec.type)
}

export default function WalletPage() {
  const [address, setAddress]   = useState<string | null>(null)
  const [activity, setActivity] = useState<ActivityRecord[]>([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    getConnectedAddress().then(async addr => {
      setAddress(addr)
      if (addr) {
        try { setActivity(await getWalletActivity(addr)) }
        catch (e: unknown) { toast.error((e as Error).message) }
      }
      setLoading(false)
    })
  }, [])

  async function handleConnect() {
    try { const a = await connectWallet(); setAddress(a); window.location.reload() }
    catch (e: unknown) { toast.error((e as Error).message) }
  }

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-6 h-6 animate-spin text-[var(--bond-gold)]" /></div>

  if (!address) return (
    <div className="max-w-lg mx-auto px-6 py-24 text-center">
      <Wallet className="w-12 h-12 text-[var(--bond-gold)] mx-auto mb-4" />
      <h1 className="font-display text-3xl font-bold text-[var(--paper-white)] mb-3">Wallet Activity</h1>
      <p className="text-[var(--muted-steel)] mb-6">Connect your wallet to see your GEN exposure and transaction history.</p>
      <Button onClick={handleConnect} className="bg-[var(--bond-gold)] hover:bg-yellow-500 text-[var(--vault-black)] font-semibold h-11 px-8">Connect Wallet</Button>
    </div>
  )

  const totalOut = activity.filter(isOutgoing).reduce((s, a) => s + (a.bond_wei ?? a.amount_wei ?? 0), 0)
  const totalIn  = activity.filter(a => !isOutgoing(a)).reduce((s, a) => s + (a.bond_wei ?? a.amount_wei ?? 0), 0)

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <h1 className="font-display text-4xl font-bold text-[var(--paper-white)] mb-2">Wallet Activity</h1>
      <p className="text-[var(--muted-steel)] text-sm font-mono mb-10">{address}</p>

      <WalletExposurePanel activity={activity} />

      <div className="grid grid-cols-2 gap-4 mb-10 mt-6">
        <div className="rounded-xl border border-[var(--line)] bg-[var(--fog-panel)] p-4">
          <p className="text-2xl font-display font-bold text-[var(--challenge-red)]">{weiToGEN(totalOut)}</p>
          <p className="text-xs text-[var(--muted-steel)] mt-1">GEN Committed</p>
        </div>
        <div className="rounded-xl border border-[var(--line)] bg-[var(--fog-panel)] p-4">
          <p className="text-2xl font-display font-bold text-[var(--verdict-green)]">{weiToGEN(totalIn)}</p>
          <p className="text-xs text-[var(--muted-steel)] mt-1">GEN Returned</p>
        </div>
      </div>

      <h2 className="text-sm font-semibold text-[var(--muted-steel)] uppercase tracking-wider mb-4">Transaction History</h2>

      {activity.length === 0 ? (
        <div className="text-center py-16 rounded-xl border border-[var(--line)] bg-[var(--fog-panel)]">
          <Wallet className="w-10 h-10 text-[var(--muted-steel)] mx-auto mb-3" />
          <p className="text-[var(--muted-steel)]">No activity yet.</p>
          <Link href="/explore" className="inline-block mt-4">
            <Button className="bg-[var(--bond-gold)] hover:bg-yellow-500 text-[var(--vault-black)] font-semibold">Explore Capsules</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {activity.map((a, i) => {
            const wei   = a.bond_wei ?? a.amount_wei ?? a.additional_wei
            const out   = isOutgoing(a)
            return (
              <div key={i} className="flex items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--fog-panel)] p-3">
                <div className="shrink-0 w-7 h-7 rounded-full bg-[var(--fog-panel-soft)] flex items-center justify-center">
                  {TYPE_ICON[a.type] ?? <Zap className="w-3.5 h-3.5 text-[var(--muted-steel)]" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-[var(--paper-white)] capitalize">{a.type.replace(/_/g, ' ')}</span>
                    {a.capsule_id && (
                      <Link href={`/capsule/${a.capsule_id}`} className="text-xs text-[var(--signal-blue)] hover:text-[var(--bond-gold)] transition-colors truncate">
                        {a.capsule_id} →
                      </Link>
                    )}
                  </div>
                  <p className="text-xs text-[var(--muted-steel)] font-mono">{formatDate(a.ts)}</p>
                </div>
                {wei !== undefined && wei > 0 && (
                  <p className={`shrink-0 text-sm font-bold font-mono ${out ? 'text-[var(--challenge-red)]' : 'text-[var(--verdict-green)]'}`}>
                    {out ? '-' : '+'}{weiToGEN(wei)} GEN
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
