'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { ArrowRight, Shield, Star, Swords, Zap, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getAdminMonitorStats } from '@/lib/genlayer/vouch'
import { weiToGEN } from '@/lib/types/vouch'
import type { AdminMonitorStats } from '@/lib/types/vouch'

const DEMO_CAPSULES = [
  {
    title: 'I can audit GenLayer Intelligent Contracts',
    category: 'Engineering',
    tier: 'High Trust Bond',
    gen: '50',
    status: 'active',
    endorsements: 4,
  },
  {
    title: 'This AI agent safely handles support-ticket triage',
    category: 'AI Agent',
    tier: 'Standard Bond',
    gen: '10',
    status: 'upheld',
    endorsements: 2,
  },
  {
    title: 'I am a reliable frontend implementer for StudioNet dApps',
    category: 'Engineering',
    tier: 'Institutional Bond',
    gen: '200',
    status: 'challenged',
    endorsements: 7,
  },
]

const WHY_BADGES_FAILED = [
  'Fully centralised — issuer can revoke or edit',
  'Easy to fake — no economic skin',
  'Too generic — not tied to specific claims',
  'Based on stars instead of evidence',
  'Not challengeable by anyone',
  'Not economically accountable',
  'Not portable across communities',
]

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--fog-panel)] p-4 text-center">
      <p className="text-2xl font-display font-bold text-[var(--bond-gold)]">{value}</p>
      <p className="text-xs text-[var(--paper-white)] mt-1">{label}</p>
      {sub && <p className="text-xs text-[var(--muted-steel)] mt-0.5">{sub}</p>}
    </div>
  )
}

export default function HomePage() {
  const [stats, setStats] = useState<AdminMonitorStats | null>(null)

  useEffect(() => {
    getAdminMonitorStats().then(setStats).catch(() => {})
  }, [])

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative min-h-[90vh] flex flex-col items-center justify-center px-6 text-center overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(var(--paper-white) 1px, transparent 1px), linear-gradient(90deg, var(--paper-white) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-[var(--bond-gold)]/5 blur-[140px] pointer-events-none" />

        <div className="relative z-10 max-w-3xl mx-auto space-y-8">
          <Badge variant="outline" className="font-mono text-xs border-[var(--line)] text-[var(--muted-steel)] gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--verdict-green)] animate-pulse" />
            StudioNet · GenLayer · GEN Protocol
          </Badge>

          <div className="space-y-4">
            <h1 className="font-display text-5xl sm:text-6xl md:text-7xl text-[var(--paper-white)] leading-none tracking-tight">
              Put GEN behind
              <br />
              <span className="text-[var(--bond-gold)]">what you claim.</span>
            </h1>
            <p className="text-xl text-[var(--muted-steel)] max-w-xl mx-auto leading-relaxed">
              Reputation you can challenge. Trust you can price. Claims you can verify.
            </p>
            <p className="text-sm text-[var(--muted-steel)] max-w-lg mx-auto">
              Vouch is a GEN-backed reputation bond protocol. Create focused capability capsules, lock GEN behind them, receive endorsements, face evidence-based challenges, and let GenLayer judge whether your reputation still holds.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/create">
              <Button className="bg-[var(--bond-gold)] hover:bg-yellow-500 text-[var(--vault-black)] font-semibold gap-2 h-12 px-8 text-base">
                Create Capsule
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/explore">
              <Button variant="outline" className="border-[var(--line)] text-[var(--paper-white)] hover:bg-[var(--glass)] h-12 px-8 text-base">
                Explore Capsules
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 px-6 border-t border-[var(--line)]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16 space-y-3">
            <p className="text-xs font-mono text-[var(--muted-steel)] uppercase tracking-widest">The Protocol</p>
            <h2 className="font-display text-3xl sm:text-4xl text-[var(--paper-white)]">How Vouch works</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { step: '01', icon: <Shield className="w-5 h-5 text-[var(--bond-gold)]" />, title: 'Create a Capsule + Bond GEN', desc: 'State a specific capability claim. Lock GEN behind it. No bond means no active capsule.' },
              { step: '02', icon: <Star className="w-5 h-5 text-[var(--verdict-green)]" />, title: 'Receive GEN Endorsements', desc: 'Community members bond GEN behind your capsule. Their stake means their endorsement has economic weight.' },
              { step: '03', icon: <Swords className="w-5 h-5 text-[var(--challenge-red)]" />, title: 'Face Challenges, GenLayer Judges', desc: 'Anyone with contrary evidence can challenge your capsule by bonding GEN. GenLayer validators judge and issue a verifiable verdict.' },
            ].map(({ step, icon, title, desc }) => (
              <div key={step} className="rounded-xl border border-[var(--line)] bg-[var(--fog-panel)] p-6 space-y-3 relative">
                <span className="absolute top-4 right-4 text-xs font-mono text-[var(--muted-steel)] opacity-30">{step}</span>
                <div className="w-9 h-9 rounded-lg bg-[var(--glass)] border border-[var(--line)] flex items-center justify-center">{icon}</div>
                <h3 className="text-sm font-semibold text-[var(--paper-white)]">{title}</h3>
                <p className="text-xs text-[var(--muted-steel)] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why badges failed */}
      <section className="py-24 px-6 border-t border-[var(--line)] bg-[var(--fog-panel)]">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <div className="space-y-5">
              <p className="text-xs font-mono text-[var(--muted-steel)] uppercase tracking-widest">Why badges failed</p>
              <h2 className="font-display text-3xl text-[var(--paper-white)]">Normal reputation is weak.</h2>
              <ul className="space-y-2 text-sm">
                {WHY_BADGES_FAILED.map(item => (
                  <li key={item} className="flex items-start gap-2 text-[var(--muted-steel)]">
                    <AlertTriangle className="w-3.5 h-3.5 text-[var(--challenge-red)] shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
              <p className="text-sm text-[var(--muted-steel)]">
                Vouch fixes this. Reputation is claim-specific, evidence-backed, GEN-bonded, challengeable, and GenLayer-judged.
              </p>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-mono text-[var(--muted-steel)] mb-4">Example Capsules</p>
              {DEMO_CAPSULES.map(cap => (
                <div key={cap.title} className={`rounded-xl border p-4 bg-[var(--fog-panel-soft)] ${
                  cap.status === 'challenged' ? 'border-[var(--challenge-red)]/30' :
                  cap.status === 'upheld' ? 'border-[var(--verdict-green)]/30' :
                  'border-[var(--line)]'
                }`}>
                  <p className="text-xs font-semibold text-[var(--paper-white)] mb-2 leading-snug">{cap.title}</p>
                  <div className="flex items-center justify-between text-xs text-[var(--muted-steel)]">
                    <div className="flex items-center gap-2">
                      <span className="border border-[var(--line)] px-1.5 py-0.5 rounded">{cap.category}</span>
                      <span className="flex items-center gap-1"><Shield className="w-3 h-3 text-[var(--bond-gold)]" />{cap.gen} GEN</span>
                      <span className="flex items-center gap-1"><Star className="w-3 h-3" />{cap.endorsements}</span>
                    </div>
                    <span className={`font-mono ${cap.status === 'challenged' ? 'text-[var(--challenge-red)]' : cap.status === 'upheld' ? 'text-[var(--verdict-green)]' : 'text-[var(--verdict-green)]'}`}>
                      {cap.status}
                    </span>
                  </div>
                </div>
              ))}
              <p className="text-[10px] font-mono text-[var(--muted-steel)] text-center">Preview fixtures — not on-chain</p>
            </div>
          </div>
        </div>
      </section>

      {/* Live stats */}
      <section className="py-24 px-6 border-t border-[var(--line)]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10 space-y-2">
            <p className="text-xs font-mono text-[var(--muted-steel)] uppercase tracking-widest">Protocol Stats</p>
            <h2 className="font-display text-2xl text-[var(--paper-white)]">Live on StudioNet</h2>
          </div>
          {stats ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard label="Capsules" value={String(stats.total_capsules)} />
              <StatCard label="GEN Bonded" value={weiToGEN(stats.total_bonded_wei)} sub="GEN" />
              <StatCard label="Active Disputes" value={String(stats.active_disputes)} />
              <StatCard label="Pending Verdicts" value={String(stats.pending_verdicts)} />
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {['Capsules', 'GEN Bonded', 'Active Disputes', 'Pending Verdicts'].map(l => (
                <div key={l} className="rounded-xl border border-[var(--line)] bg-[var(--fog-panel)] p-4 text-center animate-pulse">
                  <div className="h-7 bg-[var(--fog-panel-soft)] rounded mb-2" />
                  <p className="text-xs text-[var(--muted-steel)]">{l}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA banner */}
      <section className="py-20 px-6 border-t border-[var(--line)] bg-[var(--fog-panel)]">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-[var(--bond-gold)]/15 border border-[var(--bond-gold)]/30 flex items-center justify-center">
            <CheckCircle2 className="w-7 h-7 text-[var(--bond-gold)]" />
          </div>
          <h2 className="font-display text-3xl sm:text-4xl text-[var(--paper-white)]">
            Back your reputation with GEN.
          </h2>
          <p className="text-[var(--muted-steel)] max-w-md mx-auto">
            Not with a badge. Not with a star rating. With economic skin in the game, on-chain, verifiable by anyone.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link href="/create">
              <Button className="bg-[var(--bond-gold)] hover:bg-yellow-500 text-[var(--vault-black)] font-semibold gap-2 h-11 px-8">
                Create Your Capsule <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/explore">
              <Button variant="outline" className="border-[var(--line)] text-[var(--paper-white)] hover:bg-[var(--glass)] h-11 px-8">
                Explore Capsules
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
