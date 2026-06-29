import { ExternalLink } from 'lucide-react'
import { buildExplorerTxUrl } from '@/lib/genlayer/vouch'

interface Props {
  hash:   string
  label?: string
}

export function TxLink({ hash, label }: Props) {
  return (
    <a
      href={buildExplorerTxUrl(hash)}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-xs font-mono text-[var(--signal-blue)] hover:text-[var(--bond-gold)] transition-colors"
    >
      <ExternalLink className="w-3 h-3" />
      {label ?? `${hash.slice(0, 8)}…${hash.slice(-6)}`}
    </a>
  )
}
