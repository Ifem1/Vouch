import { ExternalLink, Link2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface Props {
  urls:   string[]
  label?: string
}

function safeDomain(url: string): string {
  try { return new URL(url).hostname.replace('www.', '') }
  catch { return url.slice(0, 30) }
}

function safePath(url: string): string {
  try {
    const u = new URL(url)
    return (u.pathname + u.search).slice(0, 50) || '/'
  } catch { return '' }
}

export function EvidenceStack({ urls, label = 'Evidence' }: Props) {
  if (urls.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--line)] bg-[var(--fog-panel)] p-4">
        <div className="flex items-center gap-2 mb-2">
          <Link2 className="w-4 h-4 text-[var(--muted-steel)]" />
          <span className="text-sm font-semibold text-[var(--paper-white)]">{label}</span>
        </div>
        <p className="text-xs text-[var(--muted-steel)]">No evidence submitted.</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--fog-panel)] p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Link2 className="w-4 h-4 text-[var(--signal-blue)]" />
          <span className="text-sm font-semibold text-[var(--paper-white)]">{label}</span>
        </div>
        <Badge variant="outline" className="text-xs border-[var(--line)] text-[var(--muted-steel)]">
          {urls.length} {urls.length === 1 ? 'source' : 'sources'}
        </Badge>
      </div>
      <div className="space-y-2">
        {urls.map((url, i) => (
          <a
            key={i}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-2 p-2.5 rounded-lg bg-[var(--fog-panel-soft)] hover:bg-[var(--glass)] border border-[var(--line)] transition-colors group"
          >
            <ExternalLink className="w-3.5 h-3.5 text-[var(--signal-blue)] mt-0.5 shrink-0 group-hover:text-[var(--bond-gold)] transition-colors" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-[var(--signal-blue)] group-hover:text-[var(--bond-gold)] transition-colors">
                {safeDomain(url)}
              </p>
              <p className="text-xs text-[var(--muted-steel)] font-mono truncate">{safePath(url)}</p>
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}
