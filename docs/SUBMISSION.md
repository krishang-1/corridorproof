# Submission workstream

Deadline supplied by the team: **30 September 2026, 23:59 IST**. Portal cutoff, timezone, field limits, exact PS3 wording, deck requirements and judging rules remain unverified. Confirm them before submission. The six fields below are editable drafts, not purported portal field names.

## Suggested workflow adjustments

- Scope freeze: one corridor, two roles, three exception scenarios. New ideas go into the roadmap after the demo works.
- Two independent gates: source-backed problem credibility and tested prototype behavior. A source cannot prove our effectiveness.
- Infrastructure cutoff: keep a labelled working local demo when Linux/Docker is unavailable. Only claim live Drunix after recorded successful commits.
- Evidence gate: maintain the claims register. Keep implementation, hypothesis and unverified integration visibly distinct in deck and repository.
- Rehearsal: fresh data directory, no install step beyond Node, three-minute timed run, saved screenshot and export.
- Link gate: open GitHub and deck links while signed out. Inspect permissions and confirm no keys/data were published.
- Submission buffer: aim to finish uploads by 22:30 IST and reserve the remaining time for portal failures, edits and receipt capture. User submits final portal fields after verifying their correctness.

## Six reusable text drafts

**Title:** CorridorProof: shared evidence for cross-border payment exceptions.

**Problem:** Cross-border payment operators need to reconcile missing payout responses, recipient shortfalls and rejection/refund cases across institutions. Nexus documentation describes manual handling of investigations, recalls and disputes in its first release. The challenge is preserving attributable evidence and coordinating safe decisions when the actual payout outcome is uncertain. Demand in a specific corridor remains to be validated with operators.

**Solution:** CorridorProof records an immutable accepted amount, attributable status evidence, dual-party resolution approvals and joint closure. A timeout cannot authorize a refund. The prototype offers a local signed journal with export verification and deterministic state replay. A separate Go chaincode and Gateway CLI prepare the Drunix deployment path.

**Innovation / distinction:** Existing providers including Swift already offer case management. Our proposed distinction is joint governance of corridor exception evidence and resolution state among independent operators. This is a partner-validation hypothesis. The prototype demonstrates policy safeguards rather than claiming a new settlement rail or cheaper FX.

**Technology / Drunix:** Node.js 24, SQLite, Ed25519/SHA-256 and a browser-native dashboard support the local demo. Go Fabric-compatible chaincode derives roles from organization MSPs and enforces version/idempotency rules. The certificate-bound Gateway CLI waits for valid commit. The live Drunix network and dashboard integration are unverified. No NPCI sandbox or UPI endpoint is connected.

**Impact / business model:** Candidate users are PSP payment-operations teams. A pilot would compare staff time, counterparty contacts, evidence rework and resolution time against current workflows. Subscription plus integration is a pricing hypothesis. No operational savings, willingness-to-pay, customer adoption or market size has been validated.

## Release checklist

- [ ] Verify exact official problem statement and judging rules.
- [ ] Verify portal cutoff and field limits.
- [ ] Publish source repository to the intended account.
- [ ] Check GitHub CI status and clean-clone start.
- [ ] Ensure `.data/`, generated private keys and external credentials are absent from tracked files.
- [ ] Confirm live/mock labels match validation evidence.
- [ ] Open final pitch deck and rehearse.
- [ ] Verify source and deck links while signed out.
- [ ] Complete portal fields and upload before buffer deadline.
- [ ] Capture submission receipt.

Local build/test evidence is maintained in VALIDATION.md. A check is complete only when recorded, not because this checklist exists.
