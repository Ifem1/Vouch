'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Shield, Plus, Compass, ChevronDown, Loader2, Activity, Swords, Star, Wallet, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { connectWallet, getCurrentChainId, clearWalletConnected, getConnectedAddress } from '@/lib/genlayer/client'
import { CHAIN_ID } from '@/lib/genlayer/chains'
import { shortenAddress } from '@/lib/utils/explorer'
import { toast } from 'sonner'

export function TopCommand() {
  const pathname = usePathname()
  const [address, setAddress]           = useState<string | null>(null)
  const [wrongNetwork, setWrongNetwork] = useState(false)
  const [connecting, setConnecting]     = useState(false)
  const [dashOpen, setDashOpen]         = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !window.ethereum) return
    // Restore session on refresh if user connected in this tab
    getConnectedAddress().then(addr => {
      if (addr) {
        setAddress(addr)
        getCurrentChainId().then(id => setWrongNetwork(id !== null && id !== CHAIN_ID))
      }
    })
    const onAccounts = (accs: unknown) => {
      const addr = (accs as string[])[0] ?? null
      if (!addr) clearWalletConnected()
      setAddress(addr)
    }
    const onChain = (chainId: unknown) => setWrongNetwork(parseInt(chainId as string, 16) !== CHAIN_ID)
    window.ethereum.on('accountsChanged', onAccounts)
    window.ethereum.on('chainChanged', onChain)
    return () => {
      window.ethereum?.removeListener('accountsChanged', onAccounts)
      window.ethereum?.removeListener('chainChanged', onChain)
    }
  }, [])

  function handleDisconnect() {
    clearWalletConnected()
    setAddress(null)
    setWrongNetwork(false)
    toast.success('Wallet disconnected')
  }

  async function handleConnect() {
    setConnecting(true)
    try {
      const addr = await connectWallet()
      setAddress(addr)
      const chainId = await getCurrentChainId()
      setWrongNetwork(chainId !== null && chainId !== CHAIN_ID)
      toast.success('Wallet connected to StudioNet')
    } catch (err: unknown) {
      toast.error((err as Error).message ?? 'Failed to connect wallet')
    } finally {
      setConnecting(false)
    }
  }

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  const dashLinks = [
    { href: '/dashboard/owner',      label: 'Owner',      icon: Shield },
    { href: '/dashboard/endorser',   label: 'Endorser',   icon: Star },
    { href: '/dashboard/challenger', label: 'Challenger',  icon: Swords },
    { href: '/wallet',               label: 'Wallet',     icon: Wallet },
  ]

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--line)] bg-[var(--fog-panel)]/95 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 rounded-md bg-[var(--bond-gold)]/15 border border-[var(--bond-gold)]/30 flex items-center justify-center">
            <Shield className="w-4 h-4 text-[var(--bond-gold)]" />
          </div>
          <span className="font-display font-bold text-lg text-[var(--paper-white)] tracking-tight">Vouch</span>
          <span className="hidden sm:inline text-xs text-[var(--muted-steel)] font-mono border border-[var(--line)] rounded px-1.5 py-0.5">
            StudioNet
          </span>
        </Link>

        {/* Nav */}
        <nav className="hidden sm:flex items-center gap-1">
          <Link
            href="/explore"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm transition-colors ${
              isActive('/explore')
                ? 'bg-[var(--glass)] text-[var(--paper-white)]'
                : 'text-[var(--muted-steel)] hover:text-[var(--paper-white)] hover:bg-[var(--glass)]'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            Explore
          </Link>

          {address && (
            <div className="relative">
              <button
                onClick={() => setDashOpen(o => !o)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm transition-colors ${
                  dashLinks.some(d => isActive(d.href))
                    ? 'bg-[var(--glass)] text-[var(--paper-white)]'
                    : 'text-[var(--muted-steel)] hover:text-[var(--paper-white)] hover:bg-[var(--glass)]'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                Dashboard
                <ChevronDown className="w-3 h-3" />
              </button>
              {dashOpen && (
                <div
                  className="absolute top-full left-0 mt-1 w-44 rounded-lg border border-[var(--line)] bg-[var(--fog-panel)] shadow-xl overflow-hidden z-50"
                  onMouseLeave={() => setDashOpen(false)}
                >
                  {dashLinks.map(({ href, label, icon: Icon }) => (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setDashOpen(false)}
                      className={`flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                        isActive(href)
                          ? 'bg-[var(--glass)] text-[var(--paper-white)]'
                          : 'text-[var(--muted-steel)] hover:text-[var(--paper-white)] hover:bg-[var(--glass)]'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {wrongNetwork && (
            <span className="hidden sm:inline text-xs text-[var(--challenge-red)] font-mono border border-[var(--challenge-red)]/30 rounded px-2 py-0.5">
              Wrong Network
            </span>
          )}
          {address ? (
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline text-xs font-mono text-[var(--muted-steel)] border border-[var(--line)] rounded px-2 py-1">
                {shortenAddress(address)}
              </span>
              <Link href="/create">
                <Button size="sm" className="bg-[var(--bond-gold)] hover:bg-yellow-500 text-[var(--vault-black)] font-semibold gap-1.5 h-8">
                  <Plus className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Create</span>
                </Button>
              </Link>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDisconnect}
                title="Disconnect wallet"
                className="h-8 w-8 p-0 text-[var(--muted-steel)] hover:text-[var(--challenge-red)] hover:bg-[var(--glass)]"
              >
                <LogOut className="w-3.5 h-3.5" />
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={handleConnect}
              disabled={connecting}
              className="h-8 border-[var(--line)] text-[var(--paper-white)] hover:bg-[var(--glass)] gap-1.5"
            >
              {connecting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Connect Wallet
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
