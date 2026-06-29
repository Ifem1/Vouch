'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Plus, Trash2, Shield, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { TxLink } from '@/src/components/vouch/tx-link'
import { createCapsule } from '@/lib/genlayer/vouch'
import { getConnectedAddress, connectWallet } from '@/lib/genlayer/client'
import { BOND_TIER_GEN, BOND_TIER_LABELS, CATEGORY_LABELS, genToWei } from '@/lib/types/vouch'
import type { BondTier, CapsuleCategory, TransactionResult } from '@/lib/types/vouch'
import { toast } from 'sonner'

const schema = z.object({
  claimTitle:       z.string().min(5, 'At least 5 characters'),
  claimBody:        z.string().min(20, 'At least 20 characters'),
  category:         z.string(),
  scopeBoundaries:  z.string(),
  visibilityMode:   z.enum(['public', 'private']),
  privateHash:      z.string(),
})

type FormData = z.infer<typeof schema>

const BOND_TIERS: { tier: BondTier; desc: string }[] = [
  { tier: 'micro',        desc: '1 GEN — minimal skin, personal claim' },
  { tier: 'standard',     desc: '10 GEN — professional capability' },
  { tier: 'high_trust',   desc: '50 GEN — strong claim with evidence' },
  { tier: 'institutional',desc: '200 GEN — institutional-level trust' },
]

const CATEGORIES: CapsuleCategory[] = ['engineering','design','research','operations','community','ai_agent','identity','other']

export default function CreateCapsulePage() {
  const router  = useRouter()
  const [step, setStep]         = useState(1)
  const [address, setAddress]   = useState<string | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [evidenceUrls, setEvidenceUrls] = useState<string[]>([''])
  const [bondTier, setBondTier] = useState<BondTier>('micro')
  const [expiryDays, setExpiryDays] = useState(90)
  const [txResult, setTxResult] = useState<TransactionResult | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const { register, handleSubmit, formState: { errors }, watch } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { category: 'engineering', visibilityMode: 'public', scopeBoundaries: '', privateHash: '' },
  })

  const watchedVis = watch('visibilityMode')

  useEffect(() => { getConnectedAddress().then(setAddress) }, [])

  async function handleConnect() {
    setConnecting(true)
    try { const addr = await connectWallet(); setAddress(addr) }
    catch (e: unknown) { toast.error((e as Error).message) }
    finally { setConnecting(false) }
  }

  async function onSubmit(data: FormData) {
    const urls = evidenceUrls.filter(u => u.trim())
    if (data.visibilityMode === 'public' && !urls.length) {
      toast.error('Public capsules need at least one evidence URL')
      return
    }
    setSubmitting(true)
    try {
      const expiresAtMs = Date.now() + expiryDays * 24 * 60 * 60 * 1000
      const result = await createCapsule({
        claimTitle:   data.claimTitle,
        claimBody:    data.claimBody,
        category:     data.category,
        scopeBoundaries: data.scopeBoundaries,
        publicEvidenceUrls: urls,
        privateEvidenceCommitmentHash: data.privateHash,
        expiresAtMs,
        visibilityMode: data.visibilityMode,
        bondAmountWei:  genToWei(BOND_TIER_GEN[bondTier]),
      })
      setTxResult(result)
      toast.success('Capsule created!')
    } catch (e: unknown) {
      toast.error((e as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  if (!address) return (
    <div className="max-w-lg mx-auto px-6 py-24 text-center">
      <Shield className="w-12 h-12 text-[var(--bond-gold)] mx-auto mb-4" />
      <h1 className="font-display text-3xl font-bold text-[var(--paper-white)] mb-3">Connect your wallet</h1>
      <p className="text-[var(--muted-steel)] mb-6">You need a wallet to create a GEN-backed capsule.</p>
      <Button onClick={handleConnect} disabled={connecting} className="bg-[var(--bond-gold)] hover:bg-yellow-500 text-[var(--vault-black)] font-semibold h-11 px-8">
        {connecting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
        Connect Wallet
      </Button>
    </div>
  )

  if (txResult) return (
    <div className="max-w-lg mx-auto px-6 py-24 text-center">
      <CheckCircle2 className="w-14 h-14 text-[var(--verdict-green)] mx-auto mb-4" />
      <h1 className="font-display text-3xl font-bold text-[var(--paper-white)] mb-2">Capsule Created!</h1>
      <p className="text-[var(--muted-steel)] mb-4">Your GEN-backed reputation capsule is live on StudioNet.</p>
      <div className="flex justify-center mb-6">
        <TxLink hash={txResult.hash} label="View transaction" />
      </div>
      <div className="flex gap-3 justify-center">
        <Button onClick={() => router.push('/dashboard/owner')} className="bg-[var(--bond-gold)] hover:bg-yellow-500 text-[var(--vault-black)] font-semibold">
          My Dashboard
        </Button>
        <Button variant="outline" onClick={() => router.push('/explore')} className="border-[var(--line)] text-[var(--paper-white)] hover:bg-[var(--glass)]">
          Explore Capsules
        </Button>
      </div>
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <div className="mb-10">
        <h1 className="font-display text-4xl font-bold text-[var(--paper-white)] mb-2">Create a Capsule</h1>
        <p className="text-[var(--muted-steel)]">Stake your reputation with GEN. Make a specific, evidence-backed claim.</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-10">
        {[1,2,3,4].map(s => (
          <div key={s} className={`flex items-center gap-2 ${s < 4 ? 'flex-1' : ''}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
              s < step ? 'bg-[var(--verdict-green)] text-white' :
              s === step ? 'bg-[var(--bond-gold)] text-[var(--vault-black)]' :
              'bg-[var(--fog-panel-soft)] text-[var(--muted-steel)]'
            }`}>{s < step ? '✓' : s}</div>
            {s < 4 && <div className={`flex-1 h-0.5 rounded ${s < step ? 'bg-[var(--verdict-green)]' : 'bg-[var(--line)]'}`} />}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Step 1: Claim */}
        {step === 1 && (
          <div className="space-y-5">
            <h2 className="font-display text-xl font-semibold text-[var(--paper-white)]">Define your claim</h2>
            <div>
              <Label className="text-[var(--muted-steel)] text-xs mb-1.5">Claim Title</Label>
              <Input {...register('claimTitle')} placeholder="I can audit GenLayer Intelligent Contracts"
                className="bg-[var(--fog-panel)] border-[var(--line)] text-[var(--paper-white)] placeholder:text-[var(--muted-steel)]" />
              {errors.claimTitle && <p className="text-xs text-[var(--challenge-red)] mt-1">{errors.claimTitle.message}</p>}
            </div>
            <div>
              <Label className="text-[var(--muted-steel)] text-xs mb-1.5">Claim Body</Label>
              <Textarea {...register('claimBody')} placeholder="Describe the specific capability in detail. What can you do, for whom, at what level?"
                className="bg-[var(--fog-panel)] border-[var(--line)] text-[var(--paper-white)] placeholder:text-[var(--muted-steel)]" rows={5} />
              {errors.claimBody && <p className="text-xs text-[var(--challenge-red)] mt-1">{errors.claimBody.message}</p>}
            </div>
            <div>
              <Label className="text-[var(--muted-steel)] text-xs mb-1.5">Category</Label>
              <select {...register('category')} className="w-full bg-[var(--fog-panel)] border border-[var(--line)] text-[var(--paper-white)] text-sm rounded-lg px-3 py-2">
                {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-[var(--muted-steel)] text-xs mb-1.5">Scope Boundaries <span className="text-[var(--muted-steel)]">(optional)</span></Label>
              <Textarea {...register('scopeBoundaries')} placeholder="What is NOT covered by this claim? Define the limits clearly."
                className="bg-[var(--fog-panel)] border-[var(--line)] text-[var(--paper-white)] placeholder:text-[var(--muted-steel)]" rows={3} />
            </div>
            <Button type="button" onClick={() => setStep(2)} className="w-full bg-[var(--bond-gold)] hover:bg-yellow-500 text-[var(--vault-black)] font-semibold">
              Next: Evidence
            </Button>
          </div>
        )}

        {/* Step 2: Evidence */}
        {step === 2 && (
          <div className="space-y-5">
            <h2 className="font-display text-xl font-semibold text-[var(--paper-white)]">Submit evidence</h2>
            <div>
              <Label className="text-[var(--muted-steel)] text-xs mb-2">Visibility</Label>
              <div className="flex gap-3">
                {(['public','private'] as const).map(v => (
                  <label key={v} className={`flex-1 rounded-xl border p-3 cursor-pointer transition-colors ${
                    watchedVis === v ? 'border-[var(--bond-gold)] bg-[var(--bond-gold)]/10' : 'border-[var(--line)] bg-[var(--fog-panel)]'
                  }`}>
                    <input type="radio" value={v} {...register('visibilityMode')} className="sr-only" />
                    <p className="text-sm font-semibold text-[var(--paper-white)] capitalize mb-1">{v}</p>
                    <p className="text-xs text-[var(--muted-steel)]">{v === 'public' ? 'Visible to everyone. Requires evidence URLs.' : 'Only you can see details.'}</p>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-[var(--muted-steel)] text-xs mb-2">Public Evidence URLs {watchedVis === 'public' && <span className="text-[var(--challenge-red)]">*</span>}</Label>
              <div className="space-y-2">
                {evidenceUrls.map((url, i) => (
                  <div key={i} className="flex gap-2">
                    <Input value={url} onChange={e => { const a = [...evidenceUrls]; a[i] = e.target.value; setEvidenceUrls(a) }}
                      placeholder="https://github.com/..."
                      className="flex-1 bg-[var(--fog-panel)] border-[var(--line)] text-[var(--paper-white)] placeholder:text-[var(--muted-steel)] font-mono text-sm" />
                    {evidenceUrls.length > 1 && (
                      <Button type="button" variant="outline" size="sm" onClick={() => setEvidenceUrls(evidenceUrls.filter((_, j) => j !== i))}
                        className="border-[var(--line)] text-[var(--challenge-red)] hover:bg-[var(--challenge-red)]/10 h-10 w-10 p-0">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => setEvidenceUrls([...evidenceUrls, ''])}
                  className="border-[var(--line)] text-[var(--muted-steel)] hover:bg-[var(--glass)] gap-1.5">
                  <Plus className="w-3.5 h-3.5" /> Add URL
                </Button>
              </div>
            </div>
            <div>
              <Label className="text-[var(--muted-steel)] text-xs mb-1.5">Private Evidence Commitment Hash <span className="text-[var(--muted-steel)]">(optional)</span></Label>
              <Input {...register('privateHash')} placeholder="SHA-256 hash of private evidence document"
                className="bg-[var(--fog-panel)] border-[var(--line)] text-[var(--paper-white)] placeholder:text-[var(--muted-steel)] font-mono text-sm" />
              <p className="text-xs text-[var(--muted-steel)] mt-1">Only the hash is stored on-chain. The document stays off-chain under your control.</p>
            </div>
            <div className="flex gap-3">
              <Button type="button" onClick={() => setStep(1)} variant="outline" className="flex-1 border-[var(--line)] text-[var(--paper-white)] hover:bg-[var(--glass)]">Back</Button>
              <Button type="button" onClick={() => setStep(3)} className="flex-1 bg-[var(--bond-gold)] hover:bg-yellow-500 text-[var(--vault-black)] font-semibold">Next: Bond</Button>
            </div>
          </div>
        )}

        {/* Step 3: Bond */}
        {step === 3 && (
          <div className="space-y-5">
            <h2 className="font-display text-xl font-semibold text-[var(--paper-white)]">Choose your bond</h2>
            <p className="text-xs text-[var(--muted-steel)]">Higher bonds signal more economic skin. They do not guarantee higher quality — challengers judge that.</p>
            <div className="space-y-3">
              {BOND_TIERS.map(({ tier, desc }) => (
                <label key={tier} className={`flex items-center gap-4 rounded-xl border p-4 cursor-pointer transition-colors ${
                  bondTier === tier ? 'border-[var(--bond-gold)] bg-[var(--bond-gold)]/10' : 'border-[var(--line)] bg-[var(--fog-panel)] hover:border-[var(--bond-gold)]/40'
                }`}>
                  <input type="radio" value={tier} checked={bondTier === tier} onChange={() => setBondTier(tier)} className="sr-only" />
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center tier-${tier}`} style={{ background: 'var(--fog-panel-soft)' }}>
                    <Shield className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-[var(--paper-white)]">{BOND_TIER_LABELS[tier]}</p>
                    <p className="text-xs text-[var(--muted-steel)]">{desc}</p>
                  </div>
                  <span className={`text-lg font-display font-bold tier-${tier}`}>{BOND_TIER_GEN[tier]} GEN</span>
                </label>
              ))}
            </div>
            <div>
              <Label className="text-[var(--muted-steel)] text-xs mb-1.5">Expiry (days from now)</Label>
              <Input type="number" min="30" max="1095" value={expiryDays} onChange={e => setExpiryDays(Number(e.target.value))}
                className="bg-[var(--fog-panel)] border-[var(--line)] text-[var(--paper-white)]" />
            </div>
            <div className="flex gap-3">
              <Button type="button" onClick={() => setStep(2)} variant="outline" className="flex-1 border-[var(--line)] text-[var(--paper-white)] hover:bg-[var(--glass)]">Back</Button>
              <Button type="button" onClick={() => setStep(4)} className="flex-1 bg-[var(--bond-gold)] hover:bg-yellow-500 text-[var(--vault-black)] font-semibold">Review</Button>
            </div>
          </div>
        )}

        {/* Step 4: Review */}
        {step === 4 && (
          <div className="space-y-5">
            <h2 className="font-display text-xl font-semibold text-[var(--paper-white)]">Review & Submit</h2>
            <div className="rounded-xl border border-[var(--bond-gold)]/30 bg-[var(--bond-gold)]/5 p-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-[var(--muted-steel)]">Bond</span><span className="font-bold text-[var(--bond-gold)]">{BOND_TIER_GEN[bondTier]} GEN</span></div>
              <div className="flex justify-between"><span className="text-[var(--muted-steel)]">Tier</span><span className="text-[var(--paper-white)]">{BOND_TIER_LABELS[bondTier]}</span></div>
              <div className="flex justify-between"><span className="text-[var(--muted-steel)]">Expires in</span><span className="text-[var(--paper-white)]">{expiryDays} days</span></div>
              <div className="flex justify-between"><span className="text-[var(--muted-steel)]">Visibility</span><span className="text-[var(--paper-white)] capitalize">{watch('visibilityMode')}</span></div>
              <div className="flex justify-between"><span className="text-[var(--muted-steel)]">Evidence URLs</span><span className="text-[var(--paper-white)]">{evidenceUrls.filter(u => u.trim()).length}</span></div>
            </div>
            <div className="rounded-xl border border-[var(--challenge-red)]/20 bg-[var(--challenge-red)]/5 p-4 flex gap-3">
              <AlertTriangle className="w-4 h-4 text-[var(--challenge-red)] shrink-0 mt-0.5" />
              <p className="text-xs text-[var(--muted-steel)]">Your bond is locked until the capsule expires, is retired, or a challenge verdict unlocks it. A successful challenge may slash part or all of your bond.</p>
            </div>
            <div className="flex gap-3">
              <Button type="button" onClick={() => setStep(3)} variant="outline" className="flex-1 border-[var(--line)] text-[var(--paper-white)] hover:bg-[var(--glass)]">Back</Button>
              <Button type="submit" disabled={submitting} className="flex-1 bg-[var(--bond-gold)] hover:bg-yellow-500 text-[var(--vault-black)] font-bold">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Shield className="w-4 h-4 mr-2" />}
                Create &amp; Bond {BOND_TIER_GEN[bondTier]} GEN
              </Button>
            </div>
          </div>
        )}
      </form>
    </div>
  )
}
