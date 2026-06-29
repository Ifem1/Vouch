import { Library, ExternalLink } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

const DEMO_SOURCES = [
  {
    url: 'https://docs.genlayer.com/developers/intelligent-contracts/tools/genlayer-studio',
    host: 'docs.genlayer.com',
    title: 'GenLayer Studio — Official Documentation',
    type: 'official_docs',
    usedIn: 3,
    accepted: 3,
    contradicted: 0,
  },
  {
    url: 'https://github.com/genlayerlabs/genlayer-js',
    host: 'github.com',
    title: 'genlayer-js — GenLayer Labs',
    type: 'github_repository',
    usedIn: 2,
    accepted: 2,
    contradicted: 0,
  },
  {
    url: 'https://explorer-studio.genlayer.com',
    host: 'explorer-studio.genlayer.com',
    title: 'GenLayer StudioNet Explorer',
    type: 'explorer_transaction',
    usedIn: 5,
    accepted: 4,
    contradicted: 1,
  },
  {
    url: 'https://docs.genlayer.com/developers/intelligent-contracts/introduction',
    host: 'docs.genlayer.com',
    title: 'Intelligent Contracts — Introduction',
    type: 'documentation_page',
    usedIn: 2,
    accepted: 1,
    contradicted: 0,
  },
]

export default function SourcesPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-8 flex items-start gap-3">
        <Library className="w-6 h-6 text-[var(--proof-blue)] mt-1" />
        <div>
          <h1 className="font-display text-3xl text-[var(--paper)]">Source Library</h1>
          <p className="text-sm text-[var(--paper-muted)] mt-1">
            Public sources that have been submitted as evidence across claim rooms.
          </p>
        </div>
      </div>

      <div className="mb-4 flex items-center gap-2 text-xs font-mono text-[var(--amber-doubt)] border border-[var(--amber-doubt)]/30 rounded px-3 py-2 bg-[var(--amber-doubt)]/5">
        Demo fixture data — connect a deployed contract to see live source stats.
      </div>

      <div className="rounded-lg border border-[var(--line)] overflow-hidden">
        <div className="grid grid-cols-[1fr_100px_80px_80px_80px] text-[10px] font-mono text-[var(--paper-muted)] uppercase tracking-widest border-b border-[var(--line)] bg-[var(--panel-soft)] px-4 py-2">
          <span>Source</span>
          <span>Type</span>
          <span className="text-right">Claims</span>
          <span className="text-right text-[var(--source-green)]">Accepted</span>
          <span className="text-right text-[var(--contradiction-red)]">Contradicted</span>
        </div>

        {DEMO_SOURCES.map((src) => (
          <div
            key={src.url}
            className="grid grid-cols-[1fr_100px_80px_80px_80px] items-center px-4 py-4 border-b border-[var(--line)] hover:bg-[var(--glass)] transition-colors"
          >
            <div className="space-y-0.5 min-w-0">
              <a
                href={src.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[var(--paper)] hover:text-[var(--proof-blue)] flex items-center gap-1 truncate"
              >
                {src.title}
                <ExternalLink className="w-2.5 h-2.5 shrink-0" />
              </a>
              <span className="text-[10px] font-mono text-[var(--paper-muted)]">{src.host}</span>
            </div>
            <div>
              <Badge variant="outline" className="text-[9px] font-mono border-[var(--line)] text-[var(--paper-muted)]">
                {src.type.replace(/_/g, ' ')}
              </Badge>
            </div>
            <span className="text-xs font-mono text-[var(--paper-muted)] text-right">{src.usedIn}</span>
            <span className="text-xs font-mono text-[var(--source-green)] text-right">{src.accepted}</span>
            <span className="text-xs font-mono text-[var(--contradiction-red)] text-right">{src.contradicted}</span>
          </div>
        ))}
      </div>

      {DEMO_SOURCES.length === 0 && (
        <div className="py-20 text-center">
          <p className="text-sm text-[var(--paper-muted)]">The source library is still quiet.</p>
        </div>
      )}
    </div>
  )
}
