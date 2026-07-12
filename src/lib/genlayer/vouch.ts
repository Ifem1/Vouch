'use client'

import { GENLAYER_STUDIONET } from './chains'
import { ensureStudioNet, WalletError } from './client'
import type {
  Capsule, Endorsement, Challenge, Verdict,
  AdminMonitorStats, ActivityRecord, TransactionResult,
} from '@/lib/types/vouch'

export const VOUCH_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_VOUCH_CONTRACT_ADDRESS ?? ''

export function getVouchContractAddress(): string {
  if (!VOUCH_CONTRACT_ADDRESS)
    throw new Error('Vouch contract address not configured. Set NEXT_PUBLIC_VOUCH_CONTRACT_ADDRESS in .env.local')
  return VOUCH_CONTRACT_ADDRESS
}

export function buildExplorerTxUrl(hash: string): string {
  return `${GENLAYER_STUDIONET.explorerUrl}/tx/${hash}`
}

export function buildExplorerAddressUrl(address: string): string {
  return `${GENLAYER_STUDIONET.explorerUrl}/address/${address}`
}

async function getGenLayerClient(withProvider = false) {
  const { createClient } = await import('genlayer-js')
  const { studionet }    = await import('genlayer-js/chains')

  if (withProvider && typeof window !== 'undefined' && window.ethereum) {
    const accounts = (await window.ethereum.request({ method: 'eth_accounts' })) as string[]
    const account  = accounts[0] as `0x${string}` | undefined
    return createClient({
      chain:    studionet,
      endpoint: GENLAYER_STUDIONET.rpcUrl,
      provider: window.ethereum as NonNullable<Parameters<typeof createClient>[0]>['provider'],
      ...(account ? { account } : {}),
    })
  }

  return createClient({
    chain:    studionet,
    endpoint: GENLAYER_STUDIONET.rpcUrl,
  })
}

async function sendWrite(method: string, args: unknown[], valueWei: bigint = BigInt(0)): Promise<TransactionResult> {
  if (typeof window === 'undefined' || !window.ethereum)
    throw new WalletError('No wallet detected. Install MetaMask or a compatible wallet.', 'NO_WALLET')

  await ensureStudioNet()

  const accounts = (await window.ethereum.request({ method: 'eth_accounts' })) as string[]
  if (!accounts || accounts.length === 0)
    throw new WalletError('Wallet not connected', 'NOT_CONNECTED')

  const contractAddress = getVouchContractAddress()
  const client          = await getGenLayerClient(true)

  const hash = await client.writeContract({
    address:      contractAddress as `0x${string}`,
    functionName: method,
    args:         args as Parameters<typeof client.writeContract>[0]['args'],
    value:        valueWei,
  })

  const receipt = await client.waitForTransactionReceipt({ hash: hash as `0x${string}` & { length: 66 } })
  const success = receipt.txExecutionResult === 1 || receipt.txExecutionResult === 0

  return {
    hash:        hash as string,
    status:      success ? 'confirmed' : 'failed',
    explorerUrl: buildExplorerTxUrl(hash as string),
  }
}

async function sendRead<T>(method: string, args: unknown[]): Promise<T> {
  const contractAddress = getVouchContractAddress()
  const client          = await getGenLayerClient()
  const result          = await client.readContract({
    address:      contractAddress as `0x${string}`,
    functionName: method,
    args:         args as Parameters<typeof client.readContract>[0]['args'],
  })
  return result as T
}

// ── capsule writes ────────────────────────────────────────────────

export interface CreateCapsuleInput {
  claimTitle:   string
  claimBody:    string
  category:     string
  scopeBoundaries: string
  publicEvidenceUrls: string[]
  privateEvidenceCommitmentHash: string
  expiresAtMs:  number
  visibilityMode: string
  bondAmountWei: bigint
}

export async function createCapsule(input: CreateCapsuleInput): Promise<TransactionResult> {
  return sendWrite('create_capsule', [
    input.claimTitle, input.claimBody, input.category, input.scopeBoundaries,
    JSON.stringify(input.publicEvidenceUrls), input.privateEvidenceCommitmentHash,
    input.expiresAtMs, input.visibilityMode, input.bondAmountWei,
  ], input.bondAmountWei)
}

export async function increaseCapsuleBond(capsuleId: string, additionalWei: bigint): Promise<TransactionResult> {
  return sendWrite('increase_capsule_bond', [capsuleId, additionalWei], additionalWei)
}

export async function retireCapsule(capsuleId: string): Promise<TransactionResult> {
  return sendWrite('retire_capsule', [capsuleId])
}

export async function renewCapsule(
  capsuleId: string, newExpiresAtMs: number,
  updatedEvidenceUrls: string[], additionalBondWei: bigint,
): Promise<TransactionResult> {
  return sendWrite('renew_capsule', [capsuleId, newExpiresAtMs, JSON.stringify(updatedEvidenceUrls), additionalBondWei], additionalBondWei)
}

// ── endorsement writes ────────────────────────────────────────────

export async function endorseCapsule(capsuleId: string, bondWei: bigint, note: string): Promise<TransactionResult> {
  return sendWrite('endorse_capsule', [capsuleId, bondWei, note], bondWei)
}

export async function withdrawEndorsement(endorsementId: string): Promise<TransactionResult> {
  return sendWrite('withdraw_endorsement', [endorsementId])
}

export async function claimEndorsementRefund(endorsementId: string): Promise<TransactionResult> {
  return sendWrite('claim_endorsement_refund', [endorsementId])
}

// ── challenge writes ──────────────────────────────────────────────

export async function openChallenge(
  capsuleId: string, challengeType: string, challengeSummary: string,
  evidenceUrls: string[], challengeBondWei: bigint,
): Promise<TransactionResult> {
  return sendWrite('open_challenge', [capsuleId, challengeType, challengeSummary, JSON.stringify(evidenceUrls), challengeBondWei], challengeBondWei)
}

export async function requestChallengeVerdict(challengeId: string): Promise<TransactionResult> {
  return sendWrite('request_challenge_verdict', [challengeId])
}

export async function resolveChallenge(challengeId: string): Promise<TransactionResult> {
  return sendWrite('resolve_challenge', [challengeId])
}

export async function claimChallengeReward(challengeId: string): Promise<TransactionResult> {
  return sendWrite('claim_challenge_reward', [challengeId])
}

// ── bond writes ───────────────────────────────────────────────────

export async function withdrawUnlockedBond(capsuleId: string, amountWei: bigint): Promise<TransactionResult> {
  return sendWrite('withdraw_unlocked_bond', [capsuleId, amountWei])
}

// ── reads ─────────────────────────────────────────────────────────

export async function getCapsule(capsuleId: string): Promise<Capsule> {
  const raw = await sendRead<string>('get_capsule', [capsuleId])
  return JSON.parse(raw)
}

export async function getCapsuleOwnerView(capsuleId: string, requester: string): Promise<Capsule> {
  const raw = await sendRead<string>('get_capsule_owner_view', [capsuleId, requester])
  return JSON.parse(raw)
}

export async function getPublicCapsules(offset: number, limit: number): Promise<Capsule[]> {
  const raw = await sendRead<string>('get_public_capsules', [offset, limit])
  return JSON.parse(raw)
}

export async function getCapsulesByOwner(ownerAddress: string): Promise<Capsule[]> {
  const raw = await sendRead<string>('get_capsules_by_owner', [ownerAddress])
  return JSON.parse(raw)
}

export async function getCapsuleChallenges(capsuleId: string): Promise<Challenge[]> {
  const raw = await sendRead<string>('get_capsule_challenges', [capsuleId])
  return JSON.parse(raw)
}

export async function getCapsuleEndorsements(capsuleId: string): Promise<Endorsement[]> {
  const raw = await sendRead<string>('get_capsule_endorsements', [capsuleId])
  return JSON.parse(raw)
}

export async function getVerdict(verdictId: string): Promise<Verdict> {
  const raw = await sendRead<string>('get_verdict', [verdictId])
  return JSON.parse(raw)
}

export async function getEndorserDashboard(address: string): Promise<Endorsement[]> {
  const raw = await sendRead<string>('get_endorser_dashboard', [address])
  return JSON.parse(raw)
}

export async function getChallengerDashboard(address: string): Promise<Challenge[]> {
  const raw = await sendRead<string>('get_challenger_dashboard', [address])
  return JSON.parse(raw)
}

export async function getWalletActivity(address: string, limit = 50): Promise<ActivityRecord[]> {
  const raw = await sendRead<string>('get_wallet_activity', [address, limit])
  return JSON.parse(raw)
}

export async function getAdminMonitorStats(): Promise<AdminMonitorStats> {
  const raw = await sendRead<string>('get_admin_monitor_stats', [])
  return JSON.parse(raw)
}
