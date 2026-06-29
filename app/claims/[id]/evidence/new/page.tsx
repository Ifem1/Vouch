'use client'

import { useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { ChevronLeft, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TransactionState } from '@/components/cite/transaction-state'
import { evidenceSchema, type EvidenceFormData } from '@/lib/validation/evidence'
import { submitEvidence } from '@/lib/genlayer/cite'
import { connectWallet, getConnectedAddress } from '@/lib/genlayer/client'
import { SOURCE_TYPE_LABELS } from '@/lib/types/cite'
import type { TxState } from '@/lib/types/cite'
import { toast } from 'sonner'

interface PageProps {
  params: Promise<{ id: string }>
}

const SUPPORT_DIRECTIONS = [
  { value: 'supports', label: 'Supports the claim', color: 'var(--source-green)' },
  { value: 'contradicts', label: 'Contradicts the claim', color: 'var(--contradiction-red)' },
  { value: 'contextual', label: 'Provides context only', color: 'var(--amber-doubt)' },
  { value: 'uncertain', label: 'Uncertain', color: 'var(--paper-muted)' },
]

export default function NewEvidencePage({ params }: PageProps) {
  const { id } = use(params)
  const router = useRouter()
  const claimId = id // string ID like "CLM-1"

  const [txState, setTxState] = useState<TxState>('idle')
  const [txHash, setTxHash] = useState('')
  const [txExplorerUrl, setTxExplorerUrl] = useState('')
  const [txError, setTxError] = useState('')

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<EvidenceFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(evidenceSchema) as any,
    defaultValues: { excerpt: '', archivedUrl: '' },
  })

  const sourceUrl = watch('sourceUrl') ?? ''
  const explanation = watch('explanation') ?? ''
  const supportDirection = watch('supportDirection')

  const onSubmit: SubmitHandler<EvidenceFormData> = async (data) => {
    setTxError('')
    setTxState('preparing')

    try {
      let address = await getConnectedAddress()
      if (!address) {
        setTxState('wallet_confirm')
        address = await connectWallet()
      }

      setTxState('wallet_confirm')
      const result = await submitEvidence({
        claimId,
        sourceUrl: data.sourceUrl,
        sourceTitle: data.sourceTitle,
        sourceType: data.sourceType,
        supportDirection: data.supportDirection,
        explanation: data.explanation,
        excerpt: data.excerpt ?? '',
        archivedUrl: data.archivedUrl ?? '',
      })

      setTxHash(result.hash)
      setTxExplorerUrl(result.explorerUrl)

      if (result.status === 'confirmed') {
        setTxState('confirmed')
        toast.success('Evidence submitted on-chain!')
        setTimeout(() => router.push(`/claims/${id}`), 2000)
      } else {
        setTxState('failed')
        setTxError('Transaction failed on-chain.')
      }
    } catch (err: unknown) {
      const e = err as Error
      setTxState('failed')
      setTxError(e.message ?? 'Unknown error')
      toast.error(e.message ?? 'Transaction failed')
    }
  }

  const selfCheckItems = [
    { q: 'Is this source primary (official docs, repo, explorer, public statement)?', pass: /github|docs|explorer|official|arxiv|genlayer/.test(sourceUrl.toLowerCase()) },
    { q: 'Does the URL look current and accessible?', pass: sourceUrl.startsWith('https://') && sourceUrl.length > 15 },
    { q: 'Does your explanation directly connect source to claim?', pass: explanation.length >= 40 },
    { q: 'Are you sure this is not a promotional or secondary source?', pass: !/medium\.com|substack|twitter\.com\/promo|youtube/i.test(sourceUrl) },
  ]

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/claims/${id}`}>
          <Button variant="ghost" size="sm" className="text-[var(--paper-muted)] hover:text-[var(--paper)] gap-1.5 h-8">
            <ChevronLeft className="w-3.5 h-3.5" /> Claim Room
          </Button>
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="font-display text-3xl text-[var(--paper)]">Submit Evidence</h1>
        <p className="text-sm text-[var(--paper-muted)] mt-1">
          Submit a public source. GenLayer validators will judge whether it actually proves the claim.
        </p>
      </div>

      {/* Source self-check */}
      {sourceUrl.length > 5 && (
        <div className="mb-6 rounded-lg border border-[var(--line)] bg-[var(--panel-soft)] p-4 space-y-2">
          <p className="text-xs font-mono text-[var(--paper-muted)] uppercase tracking-widest mb-3">Source Self-Check</p>
          {selfCheckItems.map(({ q, pass }) => (
            <div key={q} className="flex items-start gap-2">
              {pass ? (
                <CheckCircle className="w-3.5 h-3.5 text-[var(--source-green)] shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-3.5 h-3.5 text-[var(--amber-doubt)] shrink-0 mt-0.5" />
              )}
              <span className={`text-xs ${pass ? 'text-[var(--paper-muted)]' : 'text-[var(--amber-doubt)]'}`}>{q}</span>
            </div>
          ))}
        </div>
      )}

      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-5">
        <div className="rounded-lg border border-[var(--line)] bg-[var(--panel)] p-6 space-y-5">
          {/* Source URL */}
          <div className="space-y-1.5">
            <Label className="text-xs font-mono text-[var(--paper-muted)] uppercase tracking-wider">
              Source URL <span className="text-[var(--contradiction-red)]">*</span>
            </Label>
            <Input
              {...register('sourceUrl')}
              placeholder="https://docs.genlayer.com/..."
              className="bg-[var(--panel-soft)] border-[var(--line)] text-[var(--paper)] placeholder:text-[var(--paper-muted)]/50 font-mono text-xs"
            />
            {errors.sourceUrl && <p className="text-xs text-[var(--contradiction-red)]">{errors.sourceUrl.message}</p>}
          </div>

          {/* Source Title */}
          <div className="space-y-1.5">
            <Label className="text-xs font-mono text-[var(--paper-muted)] uppercase tracking-wider">
              Source Title <span className="text-[var(--contradiction-red)]">*</span>
            </Label>
            <Input
              {...register('sourceTitle')}
              placeholder="e.g. GenLayer Studio — Official Documentation"
              className="bg-[var(--panel-soft)] border-[var(--line)] text-[var(--paper)] placeholder:text-[var(--paper-muted)]/50"
            />
            {errors.sourceTitle && <p className="text-xs text-[var(--contradiction-red)]">{errors.sourceTitle.message}</p>}
          </div>

          {/* Source Type */}
          <div className="space-y-1.5">
            <Label className="text-xs font-mono text-[var(--paper-muted)] uppercase tracking-wider">
              Source Type <span className="text-[var(--contradiction-red)]">*</span>
            </Label>
            <Select onValueChange={(v) => setValue('sourceType', v as EvidenceFormData['sourceType'])}>
              <SelectTrigger className="bg-[var(--panel-soft)] border-[var(--line)] text-[var(--paper)]">
                <SelectValue placeholder="Select source type" />
              </SelectTrigger>
              <SelectContent className="bg-[var(--panel)] border-[var(--line)]">
                {Object.entries(SOURCE_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value} className="text-[var(--paper)] focus:bg-[var(--glass)]">
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.sourceType && <p className="text-xs text-[var(--contradiction-red)]">{errors.sourceType.message}</p>}
          </div>

          {/* Support Direction */}
          <div className="space-y-1.5">
            <Label className="text-xs font-mono text-[var(--paper-muted)] uppercase tracking-wider">
              Support Direction <span className="text-[var(--contradiction-red)]">*</span>
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {SUPPORT_DIRECTIONS.map(({ value, label, color }) => (
                <label
                  key={value}
                  className={`flex items-center gap-2 p-3 rounded border cursor-pointer transition-colors ${
                    supportDirection === value
                      ? 'border-current bg-[var(--glass)]'
                      : 'border-[var(--line)] hover:border-[var(--glass)]'
                  }`}
                  style={supportDirection === value ? { borderColor: color, color } : {}}
                >
                  <input
                    type="radio"
                    value={value}
                    {...register('supportDirection')}
                    className="sr-only"
                  />
                  <span className="text-xs">{label}</span>
                </label>
              ))}
            </div>
            {errors.supportDirection && (
              <p className="text-xs text-[var(--contradiction-red)]">{errors.supportDirection.message}</p>
            )}
          </div>

          {/* Explanation */}
          <div className="space-y-1.5">
            <Label className="text-xs font-mono text-[var(--paper-muted)] uppercase tracking-wider">
              Explanation <span className="text-[var(--contradiction-red)]">*</span>
            </Label>
            <Textarea
              {...register('explanation')}
              placeholder="Explain exactly how this source proves (or disproves) the claim. Be specific."
              rows={3}
              className="bg-[var(--panel-soft)] border-[var(--line)] text-[var(--paper)] placeholder:text-[var(--paper-muted)]/50 resize-none"
            />
            {errors.explanation && <p className="text-xs text-[var(--contradiction-red)]">{errors.explanation.message}</p>}
            <p className="text-xs text-[var(--paper-muted)] text-right">{explanation.length}/500</p>
          </div>

          {/* Excerpt */}
          <div className="space-y-1.5">
            <Label className="text-xs font-mono text-[var(--paper-muted)] uppercase tracking-wider">
              Excerpt (optional)
            </Label>
            <Textarea
              {...register('excerpt')}
              placeholder="Short verbatim quote from the source (keep under copyright-safe length)"
              rows={2}
              className="bg-[var(--panel-soft)] border-[var(--line)] text-[var(--paper)] placeholder:text-[var(--paper-muted)]/50 resize-none"
            />
          </div>

          {/* Archived URL */}
          <div className="space-y-1.5">
            <Label className="text-xs font-mono text-[var(--paper-muted)] uppercase tracking-wider">
              Archived URL (optional)
            </Label>
            <Input
              {...register('archivedUrl')}
              placeholder="https://web.archive.org/web/..."
              className="bg-[var(--panel-soft)] border-[var(--line)] text-[var(--paper)] placeholder:text-[var(--paper-muted)]/50 font-mono text-xs"
            />
            {errors.archivedUrl && <p className="text-xs text-[var(--contradiction-red)]">{errors.archivedUrl.message}</p>}
          </div>
        </div>

        <TransactionState state={txState} hash={txHash} explorerUrl={txExplorerUrl} errorMessage={txError} />

        <div className="flex items-center justify-between">
          <Link href={`/claims/${id}`}>
            <Button variant="outline" className="border-[var(--line)] text-[var(--paper)] hover:bg-[var(--glass)] gap-1.5">
              <ChevronLeft className="w-4 h-4" /> Cancel
            </Button>
          </Link>

          <Button
            type="submit"
            disabled={txState !== 'idle' && txState !== 'failed'}
            className="bg-[var(--proof-blue)] hover:bg-blue-500 text-white gap-1.5"
          >
            {txState === 'preparing' || txState === 'wallet_confirm' || txState === 'submitted' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : null}
            Submit Evidence On-Chain
          </Button>
        </div>
      </form>
    </div>
  )
}
