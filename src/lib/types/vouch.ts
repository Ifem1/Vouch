export type CapsuleStatus =
  | 'active' | 'under_review' | 'challenged' | 'upheld'
  | 'downgraded' | 'suspended' | 'slashed' | 'expired' | 'retired'

export type BondTier = 'micro' | 'standard' | 'high_trust' | 'institutional'
export type VisibilityMode = 'public' | 'private'

export type CapsuleCategory =
  | 'engineering' | 'design' | 'research' | 'operations'
  | 'community' | 'ai_agent' | 'identity' | 'other'

export type VerdictStatus =
  | 'trustworthy' | 'weakly_supported' | 'overstated' | 'contradicted'
  | 'unverifiable' | 'impersonation_risk' | 'material_breach'
  | 'invalid_challenge' | 'insufficient_evidence'

export type VerdictAction =
  | 'keep_active' | 'downgrade' | 'suspend' | 'slash_partial'
  | 'slash_full' | 'expire_without_slash' | 'dismiss_challenge'

export type ClaimAlignment   = 'full' | 'partial' | 'weak' | 'none' | 'contradicted'
export type EvidenceStrength = 'high' | 'medium' | 'low' | 'insufficient'
export type Materiality      = 'high' | 'medium' | 'low' | 'none'

export type ChallengeType =
  | 'false_claim' | 'impersonation' | 'evidence_fabrication'
  | 'scope_mismatch' | 'expired_capability' | 'conduct_violation'

export type ChallengeStatus = 'open' | 'verdict_pending' | 'resolved'

export interface Capsule {
  capsule_id:    string
  owner:         string
  claim_title:   string
  claim_body:    string
  category:      CapsuleCategory
  scope_boundaries: string
  public_evidence_urls: string[]
  private_evidence_commitment_hash?: string
  bond_amount:   number
  active_bond:   number
  bond_tier:     BondTier
  created_at:    number
  expires_at:    number
  status:        CapsuleStatus
  latest_verdict_id: string | null
  endorsement_count: number
  challenge_count:   number
  visibility_mode:   VisibilityMode
}

export interface Endorsement {
  endorsement_id: string
  capsule_id:     string
  endorser:       string
  bond_wei:       number
  note:           string
  status:         'active' | 'withdrawn'
  created_at:     number
  unlocked_at:    number | null
  refund_claimed?: boolean
}

export interface Challenge {
  challenge_id:      string
  capsule_id:        string
  challenger:        string
  challenge_type:    ChallengeType
  challenge_summary: string
  evidence_urls:     string[]
  challenge_bond:    number
  status:            ChallengeStatus
  verdict_id:        string | null
  created_at:        number
  resolved_at:       number | null
  reward_claimed?:   boolean
  reward_status?:    'won' | 'forfeited' | 'returned'
}

export interface Verdict {
  verdict_id:          string
  capsule_id:          string
  challenge_id:        string | null
  verdict_status:      VerdictStatus
  confidence:          number
  claim_alignment:     ClaimAlignment
  evidence_strength:   EvidenceStrength
  materiality:         Materiality
  action:              VerdictAction
  slash_bps:           number
  public_reason_short: string
  created_at:          number
}

export interface AdminMonitorStats {
  total_capsules:            number
  active_capsules:           number
  total_bonded_wei:          number
  total_challenge_bonds_wei: number
  active_disputes:           number
  pending_verdicts:          number
  stuck_withdrawals:         number
  protocol_reserve_wei:      number
  contract_version:          string
  owner:                     string
}

export interface ActivityRecord {
  type:           string
  capsule_id?:    string
  challenge_id?:  string
  endorsement_id?: string
  bond_wei?:      number
  amount_wei?:    number
  additional_wei?: number
  action?:        string
  verdict_status?: string
  status?:        string
  ts:             number
}

export interface TransactionResult {
  hash:        string
  status:      'confirmed' | 'failed' | 'pending'
  explorerUrl: string
}

// ── constants ────────────────────────────────────────────────────

export const BOND_TIER_GEN: Record<BondTier, number> = {
  micro: 1, standard: 10, high_trust: 50, institutional: 200,
}

export const BOND_TIER_LABELS: Record<BondTier, string> = {
  micro: 'Micro Bond', standard: 'Standard Bond',
  high_trust: 'High Trust Bond', institutional: 'Institutional Bond',
}

export const STATUS_LABELS: Record<CapsuleStatus, string> = {
  active: 'Active', under_review: 'Under Review', challenged: 'Challenged',
  upheld: 'Upheld', downgraded: 'Downgraded', suspended: 'Suspended',
  slashed: 'Slashed', expired: 'Expired', retired: 'Retired',
}

export const VERDICT_LABELS: Record<VerdictStatus, string> = {
  trustworthy: 'Trustworthy', weakly_supported: 'Weakly Supported',
  overstated: 'Overstated', contradicted: 'Contradicted',
  unverifiable: 'Unverifiable', impersonation_risk: 'Impersonation Risk',
  material_breach: 'Material Breach', invalid_challenge: 'Invalid Challenge',
  insufficient_evidence: 'Insufficient Evidence',
}

export const CATEGORY_LABELS: Record<CapsuleCategory, string> = {
  engineering: 'Engineering', design: 'Design', research: 'Research',
  operations: 'Operations', community: 'Community', ai_agent: 'AI Agent',
  identity: 'Identity', other: 'Other',
}

export const CHALLENGE_TYPE_LABELS: Record<ChallengeType, string> = {
  false_claim: 'False Claim', impersonation: 'Impersonation',
  evidence_fabrication: 'Evidence Fabrication', scope_mismatch: 'Scope Mismatch',
  expired_capability: 'Expired Capability', conduct_violation: 'Conduct Violation',
}

// ── helpers ──────────────────────────────────────────────────────

export function weiToGEN(wei: number): string {
  return (wei / 1e18).toFixed(2)
}

export function genToWei(gen: number): number {
  return Math.floor(gen * 1e18)
}

export function bondTierFromAmount(wei: number): BondTier {
  if (wei >= 200e18) return 'institutional'
  if (wei >= 50e18)  return 'high_trust'
  if (wei >= 10e18)  return 'standard'
  return 'micro'
}

export function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

export function isExpired(capsule: Capsule): boolean {
  return Date.now() > capsule.expires_at
}

export function daysUntilExpiry(capsule: Capsule): number {
  return Math.ceil((capsule.expires_at - Date.now()) / (1000 * 60 * 60 * 24))
}
