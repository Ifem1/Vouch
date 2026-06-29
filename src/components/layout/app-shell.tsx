'use client'

import { TopCommand } from './top-command'

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen">
      <TopCommand />
      <main className="flex-1">{children}</main>
      <footer className="border-t border-[var(--line)] py-6 px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-[var(--muted-steel)] font-mono">
            Vouch · GEN-Backed Reputation Protocol · Powered by{' '}
            <a href="https://genlayer.com" target="_blank" rel="noopener noreferrer"
              className="text-[var(--bond-gold)] hover:underline">
              GenLayer
            </a>{' '}
            · StudioNet
          </p>
          <div className="flex items-center gap-4">
            <a href="/explore" className="text-xs text-[var(--muted-steel)] hover:text-[var(--paper-white)] transition-colors">Explore</a>
            <a href="/create"  className="text-xs text-[var(--muted-steel)] hover:text-[var(--paper-white)] transition-colors">Create</a>
            <a href="/admin"   className="text-xs text-[var(--muted-steel)] hover:text-[var(--paper-white)] transition-colors">Observatory</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
