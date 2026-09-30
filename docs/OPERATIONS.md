# Operations expansion

## Implemented components

| Component | Behavior | Storage and authority |
| --- | --- | --- |
| Operations queue | Work lane, missing approval/closure owners, age, idle time, review flags, denied actions, exact shortfall and unresolved synthetic commitments | Read model derived from ledger state/events plus local held-report warnings; not a new consensus state |
| Status adapter | Synthetic ACCC/RJCT/BLCK observations; PDNG/ACWP/over-credit held; reference and amount validation | JSON status rehearsal, not ISO 20022 XML or authenticated rail evidence |
| Durable status inbox | Message ID binds to normalized contents; exact replay; held/denied/uncertain/recorded disposition | Ignored `status-inbox.json`; local adapter bookkeeping. Ready observations use the existing contract |
| Case dossier | Case state/events, adapter reports, operations context, digest and full workspace | Downloadable convenience packet; mode-specific verification still required |
| Organization comparison | Fresh Org1 and Org2 reads, canonical digests, record counts | Live authenticated queries; sequential reads can differ during a concurrent commit |

## Endpoints

- `GET /api/operations`: prioritized work queue and totals.
- `GET /api/status-reports`: retained local inbox dispositions.
- `POST /api/status-reports/preview`: receiver-only validation and deterministic preview, without ledger mutation.
- `POST /api/status-reports/apply`: receiver-only explicit recording or retained hold. Saves the original command before submitting; uses existing idempotency/commit handling.
- `GET /api/cases/:id/packet`: case dossier, including full workspace verification context.
- `GET /api/consistency`: fresh live organization snapshot comparison. Local mode returns unsupported.

Example synthetic report:

```json
{
  "messageId": "MSG-DEMO-0001",
  "caseId": "CP-001",
  "quoteId": "Q-CP-001",
  "statusCode": "ACCC",
  "currency": "INR",
  "amountMinor": 608000,
  "source": "SYNTHETIC_RECEIVER",
  "synthetic": true
}
```

Case/quote must exist and match. Credited amounts are INR minor units; rejected, blocked, pending and unposted reports use zero credited amount. ACWP is not beneficiary credit. Over-credit has no automatic transition in this contract. Unknown codes are rejected for adapter review.

## Verification

`npm test` includes normalization, wrong-reference and invalid-amount rejection, duplicate/restart behavior, conflict holds, approval ownership, ageing, dossier context, consistency mismatch and HTTP workflow. `node scripts/operations-live-check.js` runs the new path against the explicitly live backend and saves `submission/drunix-operations-evidence.json`.

The Go financial contract is unchanged by this expansion. The existing role, version, idempotency and approval rules apply to normalized observations. No chaincode upgrade is required.

## Operational limitations

Inbox dispositions are local mutable bookkeeping, not independently witnessed evidence. Holds do not automatically reopen or freeze a previously resolved ledger case. A conflict flag is advisory and never overrides contract permissions. There is no arbitration, notification dispatch, production login, independent credential custody or real payment connector. The review threshold is a fixed fifteen-minute prototype policy, not a Nexus SLA. Commitment totals are not balances, exposure valuation or money held.
