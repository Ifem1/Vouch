# More information requested — GEN bonding flow

The GEN bonding flow has now been implemented end to end and deployed on StudioNet.

## Deployed contract

- Contract address: `0xd3FDb88478331a3B003A19C0819634B5100c110d`
- Network: GenLayer StudioNet (`61999`)
- Production application: https://vouch-app-tau.vercel.app

## Payable escrow

All operations that create or add economic exposure are payable:

- `create_capsule`
- `increase_capsule_bond`
- `renew_capsule`
- `endorse_capsule`
- `open_challenge`

The contract reads `gl.message.value` and requires it to exactly equal the declared `u256` wei amount. A caller can no longer create accounting-only bonds by supplying a number while sending zero GEN.

The frontend sends the corresponding amount through the transaction `value` field. GEN inputs use JavaScript `bigint`, and decimal GEN values are converted to wei without `number`, `parseFloat`, or floating-point `1e18` arithmetic.

## Slashing and settlement

Challenge resolution uses deterministic integer arithmetic:

```text
slashedWei = activeBondWei * slashBps // 10,000
```

The result is capped at the capsule's active bond. Resolution records liabilities but does not automatically pay a participant. This avoids coupling verdict execution to an immediate external payout.

## Claim-based refunds and rewards

Payouts are claimed in separate transactions:

- Capsule owners use `withdraw_unlocked_bond` for remaining unlocked GEN.
- Endorsers withdraw first and then use `claim_endorsement_refund`.
- Successful challengers use `claim_challenge_reward` to claim their challenge bond plus the amount slashed from the capsule.
- Neutral outcomes return the challenge bond.
- Dismissed or failed challenges forfeit the challenge bond to the protocol reserve.

Every claim updates the claim flag or balance before emitting the native GEN transfer, preventing duplicate claims.

## Evidence web access

During challenge adjudication, validators fetch the submitted supporting and challenge evidence URLs with GenLayer web access. Fetching is restricted to HTTP(S), limited to ten URLs per side, and capped at 12,000 characters per response. Unavailable evidence is recorded for the evaluator instead of crashing settlement.

Web access is isolated from financial accounting. Once a verdict is finalized, escrow, slashing, reserve, and claim calculations are deterministic integer operations.

## Live verification performed

The deployed contract and production frontend were tested against StudioNet with real signed transactions:

- A capsule was created with exactly 1 GEN.
- The wallet decreased by 1 GEN and the contract increased by 1 GEN.
- The capsule was read back from the contract and rendered by the production frontend.
- A deliberately mismatched zero-value transaction was correctly rolled back with `Transaction value must exactly equal declared wei amount`.
- Retirement and unlocked-bond withdrawal updated the capsule's active bond to zero and emitted a finalized 1 GEN payout child transaction.
- A second capsule was created and challenged with a 2 GEN bond.
- Validators ran the web-backed verdict flow and created `VRD-1`.
- The challenge was resolved and its dismissed outcome was recorded as forfeited to the protocol reserve.
- The production Observatory read counters, bonds, disputes, verdicts, and reserve data from the deployed contract.
- Production Next.js builds and TypeScript checks pass.

The two rollback transactions visible in the explorer were intentional negative-path tests: one used mismatched transaction value, and one attempted to challenge a retired capsule. Both demonstrate that contract validation is enforced.

## StudioNet limitation

StudioNet finalizes emitted native-transfer child transactions, but its simulated EVM layer does not reliably reflect the recipient credit in the displayed wallet balance. StudioNet also retained attached simulated value during an intentionally rolled-back payable test. These are hosted Studio simulation behaviors, not application accounting paths.

For production-like certification of recipient balance changes, the same payout tests should be repeated after deployment to GenLayer Bradbury. On StudioNet, contract escrow receipt, deterministic accounting, emitted payout messages, child-transaction finalization, state readback, and frontend rendering have all been verified.

## Result

The original zero-value/accounting-only bonding concern is resolved. Bonds are backed by payable GEN escrow, and the repository now contains complete claim-based slashing, refund, and reward paths with exact bigint handling.
