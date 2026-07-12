# Vouch — Reputation Bond Protocol

> Put your GEN where your reputation is.

Vouch is a GenLayer-powered reputation bond protocol. Users create capability capsules backed by a GEN bond, others endorse or challenge them, and GenLayer's AI validators reach on-chain consensus on whether a challenge is valid.

## Why GenLayer

Traditional reputation systems are off-chain and unverifiable. Vouch uses GenLayer Intelligent Contracts to run nondeterministic AI consensus: multiple independent validators evaluate challenge evidence and agree on a verdict before it is stored on-chain — making reputation economically accountable.

## How It Works

1. **Creator** stakes a GEN bond on a capability claim (capsule)
2. **Endorsers** add their own GEN bonds to signal trust
3. **Challengers** open a challenge with evidence and a bond
4. **GenLayer validators** reach AI consensus on the verdict
5. Winners keep their bond + a share of the loser's bond

## Architecture

```
/contracts/VouchReputation.py     GenLayer Intelligent Contract
/app/                             Next.js App Router pages
/src/components/vouch/            CapsuleCard, ChallengeScar, VerdictSeal, etc.
/src/lib/genlayer/                SDK client, chain config, contract interaction
/src/lib/types/                   TypeScript types
```

## Contract Methods

| Method | Type | Description |
|--------|------|-------------|
| `create_capsule(...)` | write | Create a reputation capsule with a GEN bond |
| `endorse_capsule(capsule_id, bond_wei, note)` | write | Endorse a capsule with a GEN bond |
| `open_challenge(capsule_id, type, summary, evidence_urls, bond_wei)` | write | Challenge a capsule |
| `request_challenge_verdict(challenge_id)` | write | Trigger AI validator consensus |
| `resolve_challenge(challenge_id)` | write | Finalise the verdict on-chain |
| `claim_challenge_reward(challenge_id)` | write | Claim reward if challenge was upheld |
| `withdraw_endorsement(endorsement_id)` | write | Withdraw an active endorsement |
| `get_capsule(capsule_id)` | view | Read a capsule |
| `get_public_capsules(offset, limit)` | view | Browse public capsules |
| `get_capsules_by_owner(address)` | view | Get capsules by owner |
| `get_capsule_challenges(capsule_id)` | view | Get challenges for a capsule |
| `get_capsule_endorsements(capsule_id)` | view | Get endorsements for a capsule |
| `get_challenger_dashboard(address)` | view | Challenger's open/resolved challenges |
| `get_endorser_dashboard(address)` | view | Endorser's active positions |
| `get_wallet_activity(address, limit)` | view | Full activity log for a wallet |

## Frontend Routes

| Route | Description |
|-------|-------------|
| `/` | Landing — hero, how it works |
| `/explore` | Browse public capsules |
| `/create` | Create a new reputation capsule |
| `/capsule/[id]` | Capsule detail — endorse or challenge |
| `/dashboard/owner` | Your capsules and bond positions |
| `/dashboard/endorser` | Your active endorsements |
| `/dashboard/challenger` | Your challenges and verdicts |
| `/wallet` | Full wallet activity log |
| `/admin` | Observatory — protocol health stats |

## Environment Variables

```env
NEXT_PUBLIC_GENLAYER_CHAIN_ID=61999
NEXT_PUBLIC_GENLAYER_RPC_URL=https://studio.genlayer.com/api
NEXT_PUBLIC_GENLAYER_EXPLORER_URL=https://explorer-studio.genlayer.com
NEXT_PUBLIC_VOUCH_CONTRACT_ADDRESS=0xd3FDb88478331a3B003A19C0819634B5100c110d
```

Copy `.env.example` to `.env.local` and fill in `NEXT_PUBLIC_VOUCH_CONTRACT_ADDRESS` after deploying.

## Local Setup

```bash
git clone https://github.com/Ifem1/Vouch.git
cd Vouch
npm install
cp .env.example .env.local
# Add your contract address to .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## StudioNet Deployment

1. Open [GenLayer Studio](https://studio.genlayer.com)
2. Paste the contents of `contracts/VouchReputation.py`
3. Deploy to StudioNet (chain ID 61999)
4. Copy the deployed contract address
5. Set `NEXT_PUBLIC_VOUCH_CONTRACT_ADDRESS=<address>` in `.env.local`
6. Restart the dev server

## Stack

- **Next.js 16** (App Router, TypeScript)
- **Tailwind CSS** + **shadcn/ui**
- **genlayer-js** (SDK for StudioNet interaction)
- **GenLayer Intelligent Contract** (Python, TreeMap storage, AI consensus)
- **StudioNet** — Chain ID 61999
