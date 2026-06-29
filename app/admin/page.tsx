'use client'

import { useState, useEffect } from 'react'
import { Loader2, Eye, AlertTriangle, Activity, Shield, Zap, Clock, Database } from 'lucide-react'
import { getAdminMonitorStats } from '@/lib/genlayer/vouch'
import { buildExplorerAddressUrl } from '@/lib/genlayer/vouch'
import type { AdminMonitorStats } from '@/lib/types/vouch'
import { weiToGEN } from '@/lib/types/vouch'
import { toast } from 'sonner'

function StatCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--fog-panel)] p-5">
      <div className="flex items-center gap-2 mb-3">
        <span style={{ color: accent ?? 'var(--bond-gold)' }}>{icon}</span>
        <span className="text-xs font-semibold text-[var(--muted-steel)] uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-2xl font-display font-bold" style={{ color: accent ?? 'var(--bond-gold)' }}>{value}</p>
    </div>
  )
}

export default function AdminPage() {
  const [stats, setStats]   = useState<AdminMonitorStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshed, setRefreshed] = useState<Date | null>(null)

  async function load() {
    try {
      const s = await getAdminMonitorStats()
      setStats(s)
      setRefreshed(new Date())
    } catch (e: unknown) {
      toast.error((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <Eye className="w-6 h-6 text-[var(--electric-violet)]" />
          <h1 className="font-display text-4xl font-bold text-[var(--paper-white)]">Observatory</h1>
        </div>
        <button onClick={load} disabled={loading}
          className="text-xs text-[var(--muted-steel)] hover:text-[var(--paper-white)] transition-colors flex items-center gap-1">
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Activity className="w-3.5 h-3.5" />}
          Refresh
        </button>
      </div>
      <p className="text-sm text-[var(--muted-steel)] mb-2">Read-only protocol monitor. No mutations available from this view.</p>
      {refreshed && <p className="text-xs text-[var(--muted-steel)] font-mono mb-10">Last refreshed: {refreshed.toLocaleTimeString()}</p>}

      {loading && !stats ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <Loader2 className="w-6 h-6 animate-spin text-[var(--electric-violet)]" />
        </div>
      ) : stats ? (
        <>
          {/* Alert strip */}
          {(stats.active_disputes > 0 || stats.stuck_withdrawals > 0 || stats.pending_verdicts > 0) && (
            <div className="rounded-xl border border-[var(--challenge-red)]/30 bg-[var(--challenge-red)]/5 p-4 mb-8 space-y-1.5">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-[var(--challenge-red)]" />
                <span className="text-sm font-semibold text-[var(--challenge-red)]">Attention Required</span>
              </div>
              {stats.active_disputes > 0 && (
                <p className="text-xs text-[var(--muted-steel)]">· {stats.active_disputes} active dispute{stats.active_disputes !== 1 ? 's' : ''} in progress</p>
              )}
              {stats.pending_verdicts > 0 && (
                <p className="text-xs text-[var(--muted-steel)]">· {stats.pending_verdicts} verdict{stats.pending_verdicts !== 1 ? 's' : ''} pending resolution</p>
              )}
              {stats.stuck_withdrawals > 0 && (
                <p className="text-xs text-[var(--muted-steel)]">· {stats.stuck_withdrawals} stuck withdrawal{stats.stuck_withdrawals !== 1 ? 's' : ''}</p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
            <StatCard icon={<Shield className="w-4 h-4" />} label="Total Capsules" value={String(stats.total_capsules)} />
            <StatCard icon={<Activity className="w-4 h-4" />} label="Active Capsules" value={String(stats.active_capsules)} accent="var(--verdict-green)" />
            <StatCard icon={<Database className="w-4 h-4" />} label="Total Bonded" value={`${weiToGEN(stats.total_bonded_wei)} GEN`} />
            <StatCard icon={<Zap className="w-4 h-4" />} label="Challenge Bonds" value={`${weiToGEN(stats.total_challenge_bonds_wei)} GEN`} accent="var(--challenge-red)" />
            <StatCard icon={<AlertTriangle className="w-4 h-4" />} label="Active Disputes" value={String(stats.active_disputes)} accent={stats.active_disputes > 0 ? 'var(--challenge-red)' : undefined} />
            <StatCard icon={<Clock className="w-4 h-4" />} label="Pending Verdicts" value={String(stats.pending_verdicts)} accent={stats.pending_verdicts > 0 ? 'var(--electric-violet)' : undefined} />
          </div>

          <div className="rounded-xl border border-[var(--line)] bg-[var(--fog-panel)] p-6 space-y-4">
            <h2 className="text-sm font-semibold text-[var(--muted-steel)] uppercase tracking-wider">Protocol Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
              {[
                { label: 'Contract Version', value: stats.contract_version },
                { label: 'Protocol Reserve', value: `${weiToGEN(stats.protocol_reserve_wei)} GEN` },
                { label: 'Stuck Withdrawals', value: String(stats.stuck_withdrawals) },
                { label: 'Active Capsules / Total', value: `${stats.active_capsules} / ${stats.total_capsules}` },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-center py-2 border-b border-[var(--line)]">
                  <span className="text-xs text-[var(--muted-steel)]">{label}</span>
                  <span className="text-xs font-mono text-[var(--paper-white)]">{value}</span>
                </div>
              ))}
            </div>

            <div className="pt-2">
              <span className="text-xs text-[var(--muted-steel)]">Contract Owner</span>
              <a href={buildExplorerAddressUrl(stats.owner)} target="_blank" rel="noopener noreferrer"
                className="text-xs font-mono text-[var(--signal-blue)] hover:text-[var(--bond-gold)] transition-colors ml-3">
                {stats.owner} ↗
              </a>
            </div>
          </div>

          <div className="mt-6 p-4 rounded-xl border border-[var(--electric-violet)]/20 bg-[var(--electric-violet)]/5">
            <p className="text-xs text-[var(--muted-steel)]">
              <strong className="text-[var(--paper-white)]">Observatory is read-only.</strong> All data is fetched live from the GenLayer contract. To interact with the protocol, use the Owner, Endorser, or Challenger dashboards with a connected wallet.
            </p>
          </div>
        </>
      ) : (
        <div className="text-center py-20 text-[var(--muted-steel)]">Failed to load protocol stats.</div>
      )}
    </div>
  )
}
