'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ChevronRight, ChevronLeft, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TransactionState } from '@/components/cite/transaction-state'
import { ClaimSharpnessMeter } from '@/components/cite/claim-sharpness-meter'
import { claimSchema, type ClaimFormData } from '@/lib/validation/claim'
import { createClaim } from '@/lib/genlayer/cite'
import { connectWallet, getConnectedAddress } from '@/lib/genlayer/client'
import { CLAIM_TYPE_LABELS, EVIDENCE_STANDARD_LABELS } from '@/lib/types/cite'
import type { TxState } from '@/lib/types/cite'
import { toast } from 'sonner'

const STEPS = ['State the Claim', 'Evidence Standard', 'Context & Exclusions', 'Review & Submit']

export default function NewClaimPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [txState, setTxState] = useState<TxState>('idle')
  const [txHash, setTxHash] = useState('')
  const [txExplorerUrl, setTxExplorerUrl] = useState('')
  const [txError, setTxError] = useState('')

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    trigger,
    formState: { errors },
  } = useForm<ClaimFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(claimSchema) as any,
    defaultValues: {
      context: '',
      excludedSources: '',
      preferredSources: '',
    },
  })

  const statement = watch('statement') ?? ''
  const title = watch('title') ?? ''
  const claimType = watch('claimType')
  const evidenceStandard = watch('evidenceStandard')

  async function goNext() {
    let fields: (keyof ClaimFormData)[] = []
    if (step === 0) fields = ['title', 'statement', 'claimType']
    if (step === 1) fields = ['evidenceStandard', 'deadline']
    const valid = await trigger(fields)
    if (valid) setStep((s) => Math.min(s + 1, STEPS.length - 1))
  }

  const onSubmit: SubmitHandler<ClaimFormData> = async (data) => {
    setTxError('')
    setTxState('preparing')

    try {
      let address = await getConnectedAddress()
      if (!address) {
        setTxState('wallet_confirm')
        address = await connectWallet()
      }

      setTxState('wallet_confirm')
      const deadline = Math.floor(new Date(data.deadline).getTime() / 1000)

      const result = await createClaim({
        title: data.title,
        statement: data.statement,
        claimType: data.claimType,
        evidenceStandard: data.evidenceStandard,
        context: data.context ?? '',
        excludedSources: data.excludedSources ?? '',
        preferredSources: data.preferredSources ?? '',
        deadline,
      })

      setTxState('submitted')
      setTxHash(result.hash)
      setTxExplorerUrl(result.explorerUrl)

      if (result.status === 'confirmed') {
        setTxState('confirmed')
        toast.success('Claim created on-chain!')
        setTimeout(() => router.push('/claims'), 2000)
      } else {
        setTxState('failed')
        setTxError('Transaction failed on-chain.')
      }
    } catch (err: unknown) {
      const error = err as Error
      setTxState('failed')
      setTxError(error.message ?? 'Unknown error')
      toast.error(error.message ?? 'Transaction failed')
    }
  }

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="font-display text-3xl text-[var(--paper)]">Create Claim</h1>
        <p className="text-sm text-[var(--paper-muted)] mt-1">
          State a precise, falsifiable claim. GenLayer validators will judge whether evidence actually proves it.
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono border transition-colors ${
                i === step
                  ? 'border-[var(--proof-blue)] bg-[var(--proof-blue)]/10 text-[var(--proof-blue)]'
                  : i < step
                    ? 'border-[var(--source-green)] bg-[var(--source-green)]/10 text-[var(--source-green)]'
                    : 'border-[var(--line)] text-[var(--paper-muted)]'
              }`}
            >
              {i < step ? '✓' : i + 1}
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`h-px w-8 transition-colors ${i < step ? 'bg-[var(--source-green)]' : 'bg-[var(--line)]'}`}
              />
            )}
          </div>
        ))}
        <span className="ml-2 text-xs font-mono text-[var(--paper-muted)]">{STEPS[step]}</span>
      </div>

      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-6">
        {/* Step 0: Claim */}
        {step === 0 && (
          <div className="space-y-5 rounded-lg border border-[var(--line)] bg-[var(--panel)] p-6">
            <div className="space-y-1.5">
              <Label className="text-xs font-mono text-[var(--paper-muted)] uppercase tracking-wider">
                Claim Title <span className="text-[var(--contradiction-red)]">*</span>
              </Label>
              <Input
                {...register('title')}
                placeholder="Short label for this claim"
                className="bg-[var(--panel-soft)] border-[var(--line)] text-[var(--paper)] placeholder:text-[var(--paper-muted)]/50"
              />
              {errors.title && <p className="text-xs text-[var(--contradiction-red)]">{errors.title.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-mono text-[var(--paper-muted)] uppercase tracking-wider">
                Exact Claim Statement <span className="text-[var(--contradiction-red)]">*</span>
              </Label>
              <Textarea
                {...register('statement')}
                placeholder="State exactly what you claim — specific subject, action, and assertion. Avoid vague language."
                rows={4}
                className="bg-[var(--panel-soft)] border-[var(--line)] text-[var(--paper)] placeholder:text-[var(--paper-muted)]/50 resize-none"
              />
              {errors.statement && <p className="text-xs text-[var(--contradiction-red)]">{errors.statement.message}</p>}
              <p className="text-xs text-[var(--paper-muted)] text-right">{statement.length}/600</p>
            </div>

            {statement.length > 0 && <ClaimSharpnessMeter statement={statement} title={title} />}

            <div className="space-y-1.5">
              <Label className="text-xs font-mono text-[var(--paper-muted)] uppercase tracking-wider">
                Claim Type <span className="text-[var(--contradiction-red)]">*</span>
              </Label>
              <Select onValueChange={(v) => setValue('claimType', v as ClaimFormData['claimType'])}>
                <SelectTrigger className="bg-[var(--panel-soft)] border-[var(--line)] text-[var(--paper)]">
                  <SelectValue placeholder="Select claim type" />
                </SelectTrigger>
                <SelectContent className="bg-[var(--panel)] border-[var(--line)]">
                  {Object.entries(CLAIM_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value} className="text-[var(--paper)] focus:bg-[var(--glass)]">
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.claimType && <p className="text-xs text-[var(--contradiction-red)]">{errors.claimType.message}</p>}
            </div>
          </div>
        )}

        {/* Step 1: Evidence Standard */}
        {step === 1 && (
          <div className="space-y-5 rounded-lg border border-[var(--line)] bg-[var(--panel)] p-6">
            <div className="space-y-1.5">
              <Label className="text-xs font-mono text-[var(--paper-muted)] uppercase tracking-wider">
                Evidence Standard <span className="text-[var(--contradiction-red)]">*</span>
              </Label>
              <p className="text-xs text-[var(--paper-muted)]">
                How strong does the evidence need to be to prove this claim?
              </p>
              <div className="space-y-2 pt-1">
                {Object.entries(EVIDENCE_STANDARD_LABELS).map(([value, label]) => (
                  <label
                    key={value}
                    className={`flex items-center gap-3 p-3 rounded border cursor-pointer transition-colors ${
                      evidenceStandard === value
                        ? 'border-[var(--proof-blue)] bg-[var(--proof-blue)]/5'
                        : 'border-[var(--line)] hover:border-[var(--proof-blue)]/40'
                    }`}
                  >
                    <input
                      type="radio"
                      value={value}
                      {...register('evidenceStandard')}
                      className="accent-[var(--proof-blue)]"
                    />
                    <span className="text-xs text-[var(--paper)]">{label}</span>
                  </label>
                ))}
              </div>
              {errors.evidenceStandard && (
                <p className="text-xs text-[var(--contradiction-red)]">{errors.evidenceStandard.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-mono text-[var(--paper-muted)] uppercase tracking-wider">
                Deadline <span className="text-[var(--contradiction-red)]">*</span>
              </Label>
              <Input
                type="date"
                {...register('deadline')}
                min={tomorrowStr}
                className="bg-[var(--panel-soft)] border-[var(--line)] text-[var(--paper)]"
              />
              {errors.deadline && <p className="text-xs text-[var(--contradiction-red)]">{errors.deadline.message}</p>}
            </div>
          </div>
        )}

        {/* Step 2: Context */}
        {step === 2 && (
          <div className="space-y-5 rounded-lg border border-[var(--line)] bg-[var(--panel)] p-6">
            <div className="space-y-1.5">
              <Label className="text-xs font-mono text-[var(--paper-muted)] uppercase tracking-wider">
                Context (optional)
              </Label>
              <Textarea
                {...register('context')}
                placeholder="Additional background that helps validators understand the claim domain."
                rows={3}
                className="bg-[var(--panel-soft)] border-[var(--line)] text-[var(--paper)] placeholder:text-[var(--paper-muted)]/50 resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-mono text-[var(--paper-muted)] uppercase tracking-wider">
                Preferred Sources (optional)
              </Label>
              <Textarea
                {...register('preferredSources')}
                placeholder="e.g. Official docs, GitHub repository, transaction hash"
                rows={2}
                className="bg-[var(--panel-soft)] border-[var(--line)] text-[var(--paper)] placeholder:text-[var(--paper-muted)]/50 resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-mono text-[var(--paper-muted)] uppercase tracking-wider">
                Excluded Sources (optional)
              </Label>
              <Textarea
                {...register('excludedSources')}
                placeholder="e.g. Social media posts, promotional pages, unofficial summaries"
                rows={2}
                className="bg-[var(--panel-soft)] border-[var(--line)] text-[var(--paper)] placeholder:text-[var(--paper-muted)]/50 resize-none"
              />
            </div>
          </div>
        )}

        {/* Step 3: Review */}
        {step === 3 && (
          <div className="space-y-4 rounded-lg border border-[var(--line)] bg-[var(--panel)] p-6">
            <p className="text-xs font-mono text-[var(--paper-muted)] uppercase tracking-widest">Review Claim</p>

            <div className="space-y-3 text-sm">
              <ReviewRow label="Title">{title}</ReviewRow>
              <ReviewRow label="Statement">{statement}</ReviewRow>
              <ReviewRow label="Type">{CLAIM_TYPE_LABELS[claimType as keyof typeof CLAIM_TYPE_LABELS] ?? claimType}</ReviewRow>
              <ReviewRow label="Evidence Standard">
                {EVIDENCE_STANDARD_LABELS[evidenceStandard as keyof typeof EVIDENCE_STANDARD_LABELS] ?? evidenceStandard}
              </ReviewRow>
            </div>

            {statement.length > 0 && <ClaimSharpnessMeter statement={statement} title={title} />}

            <TransactionState
              state={txState}
              hash={txHash}
              explorerUrl={txExplorerUrl}
              errorMessage={txError}
            />
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => setStep((s) => Math.max(s - 1, 0))}
            disabled={step === 0}
            className="border-[var(--line)] text-[var(--paper)] hover:bg-[var(--glass)] gap-1.5"
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </Button>

          {step < STEPS.length - 1 ? (
            <Button
              type="button"
              onClick={goNext}
              className="bg-[var(--proof-blue)] hover:bg-blue-500 text-white gap-1.5"
            >
              Continue <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              type="submit"
              disabled={txState !== 'idle' && txState !== 'failed'}
              className="bg-[var(--proof-blue)] hover:bg-blue-500 text-white gap-1.5"
            >
              {txState === 'preparing' || txState === 'wallet_confirm' || txState === 'submitted' || txState === 'waiting' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : null}
              Submit Claim On-Chain
            </Button>
          )}
        </div>
      </form>
    </div>
  )
}

function ReviewRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-[var(--line)] pb-2">
      <p className="text-xs font-mono text-[var(--paper-muted)] mb-0.5">{label}</p>
      <p className="text-sm text-[var(--paper)]">{children}</p>
    </div>
  )
}
