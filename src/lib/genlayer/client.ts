'use client'

import { GENLAYER_STUDIONET, CHAIN_ID } from './chains'

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
      on: (event: string, handler: (...args: unknown[]) => void) => void
      removeListener: (event: string, handler: (...args: unknown[]) => void) => void
      isMetaMask?: boolean
    }
  }
}

export class WalletError extends Error {
  constructor(
    message: string,
    public code?: string,
  ) {
    super(message)
    this.name = 'WalletError'
  }
}

export async function connectWallet(): Promise<string> {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new WalletError('No wallet detected. Install MetaMask or a compatible wallet.', 'NO_WALLET')
  }

  const accounts = (await window.ethereum.request({
    method: 'eth_requestAccounts',
  })) as string[]

  if (!accounts || accounts.length === 0) {
    throw new WalletError('No accounts returned.', 'NO_ACCOUNTS')
  }

  await ensureStudioNet()
  markWalletConnected()
  return accounts[0]
}

export async function ensureStudioNet(): Promise<void> {
  if (!window.ethereum) throw new WalletError('No wallet', 'NO_WALLET')

  const chainIdHex = (await window.ethereum.request({ method: 'eth_chainId' })) as string
  const currentChainId = parseInt(chainIdHex, 16)

  if (currentChainId === CHAIN_ID) return

  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: `0x${CHAIN_ID.toString(16)}` }],
    })
  } catch (switchError: unknown) {
    const err = switchError as { code?: number }
    if (err.code === 4902) {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: `0x${CHAIN_ID.toString(16)}`,
            chainName: GENLAYER_STUDIONET.name,
            rpcUrls: [GENLAYER_STUDIONET.rpcUrl],
            blockExplorerUrls: [GENLAYER_STUDIONET.explorerUrl],
            nativeCurrency: GENLAYER_STUDIONET.nativeCurrency,
          },
        ],
      })
    } else {
      throw new WalletError('Failed to switch network.', 'SWITCH_FAILED')
    }
  }
}

const SESSION_KEY = 'vouch_wallet_connected'

export function markWalletConnected(): void {
  if (typeof window !== 'undefined') sessionStorage.setItem(SESSION_KEY, '1')
}

export function clearWalletConnected(): void {
  if (typeof window !== 'undefined') sessionStorage.removeItem(SESSION_KEY)
}

export async function getConnectedAddress(): Promise<string | null> {
  if (typeof window === 'undefined' || !window.ethereum) return null
  // Only restore the session if the user explicitly connected in this tab.
  // This prevents MetaMask's pre-authorized accounts from silently showing
  // up on page load without the user clicking "Connect Wallet".
  if (!sessionStorage.getItem(SESSION_KEY)) return null
  try {
    const accounts = (await window.ethereum.request({ method: 'eth_accounts' })) as string[]
    return accounts[0] ?? null
  } catch {
    return null
  }
}

export async function getCurrentChainId(): Promise<number | null> {
  if (typeof window === 'undefined' || !window.ethereum) return null
  try {
    const chainIdHex = (await window.ethereum.request({ method: 'eth_chainId' })) as string
    return parseInt(chainIdHex, 16)
  } catch {
    return null
  }
}
