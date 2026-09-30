# CorridorProof — product walkthrough and pitch

## The 30-second pitch

When a cross-border payout times out, the sending provider cannot safely assume it failed. CorridorProof gives sending and receiving operations teams one shared case: the recorded recipient commitment, attributed status evidence, permitted next action, approvals and closure. Its deterministic rules prevent a timeout from authorizing a refund and require both organizations to approve corrections or refunds. Drunix records the decisions under joint endorsement. Payment rails still move money; our prototype uses synthetic evidence and simulated execution.

## The actual gap

Nexus's public documentation describes manual investigations, recalls and disputes in its first-release design, with possible future messaging automation. This establishes a documented coordination requirement, not the current deployment status of every corridor. [Primary source](https://docs.nexusglobalpayments.org/payment-processing/key-points)

Swift already offers Case Management, so we cannot sell generic tracking or investigation automation as new. Our proposed wedge is a specific corridor pair that still needs shared decision governance and evidence integration across its organizations. The first commercial task is to confirm that its existing service desk, Swift/Nexus capabilities or shared database do not already solve that requirement. [Competitor source](https://www.swift.com/products/case-management)

## What happens in the product

1. **Record a commitment.** Sender operations records a synthetic agreed SGD/INR quote, source principal, source fee and recipient commitment. The recorded quote stays immutable. Creating a case does not initiate a payment, negotiate an FX price or obtain customer consent.
2. **Observe the outcome.** Receiver operations supplies synthetic credit, definitive rejection or compliance-block evidence. Missing acknowledgment records uncertainty, rather than presumed failure. The prototype does not contact a bank or decode an ISO 20022 message.
3. **Gate the resolution.** Unknown outcome means reconcile. A shortfall means both parties approve the exact recipient correction. Definitive rejection permits dual-party refund review. Compliance block means manual review, with no automatic refund or release.
4. **Record execution evidence.** The approved party records a synthetic correction or refund. This updates case state but moves no money. A real adapter would need bank-authenticated evidence, idempotent rail execution and reconciliation after missing acknowledgments.
5. **Agree closure.** Both organizations acknowledge the resolved result. An unresolved or blocked case cannot simply be closed.
6. **Inspect the record.** Operations can browse cases and evidence, inspect transaction receipts and export the record. Local signed-journal verification and live ledger comparison have different trust boundaries; transaction IDs alone are not block-signature proofs.

## The strongest demo

Sender records a missing response. A refund attempt is denied and recorded. Receiver later records full credit against the original commitment. Both parties close the case. The result is one evidenced credit and no permitted refund in that uncertain interval. This proves a bounded decision safeguard, not prevented real fraud or faster external settlement.

The shortfall demo shows the exact difference in the same destination currency, both organizations' votes and controlled correction evidence. The rejection demo shows that refund approval becomes available only after receiver rejection. A compliance block remains explicitly unresolved.

## Why Drunix, and why not a database?

The workflow itself can run in a database. Drunix is justified if independent participants need their own authoritative copies and jointly governed writes instead of one operator's unilateral edit authority. The contract derives sender/receiver role from certificate MSPs, and the deployed policy requires Org1 AND Org2 endorsement. These are different controls: caller authorization determines who can submit an action; endorsement determines which organizations attest its execution.

A generated certificate selector on one laptop is a demonstration of these mechanisms, not production user authentication or actual independent institutions. A neutral trusted database remains a valid and potentially simpler option if partners accept a central operator.

## The buyer and business model

Candidate buyer: remittance/PSP corridor operations teams or their corridor operator. Initial offering: a shared exception-resolution component, integrated with their existing status/evidence systems. Subscription plus integration/support is a pricing hypothesis.

A shadow pilot should compare operator minutes, counterparty contacts, evidence rework and completeness of closure against existing workflows. Separate ledger processing time from human waiting and rail settlement time. No savings percentage, willingness to pay, signed partner, market size or regulatory approval has been established.

## Questions a judge should ask

- **What proves the bank's statement is true?** Attribution proves origin and unchanged content. External truth needs bank/rail-authenticated status and reconciliation; this build uses synthetic evidence.
- **What if a provider refuses approval?** The case stays unresolved. Escalation/arbitration and participant-exit policy must be agreed by partners. We do not invent a compliance-release or unilateral money-movement exception.
- **What if the network connection fails after submit?** Retain the exact request and uncertain outcome. Reconcile through an exact replay rather than create a replacement action. Confirmation requires a VALID commit receipt.
- **Does this lower remittance fees?** No. It targets coordination effort and unsafe follow-up decisions, not FX pricing.
- **Why would someone pay instead of use Swift?** Only if a qualified corridor has an unmet integration/governance need. That is the partner-validation gate, not a proven competitive advantage.
- **What did the prototype actually prove?** Use the current validation record and saved receipts. Distinguish software tests, actual local ledger behavior and unperformed commercial/production checks.

## Submission positioning

Title: **CorridorProof: Shared Evidence and Safe Resolution for Cross-Border Payment Exceptions**.

Problem: uncertain outcomes and inter-organization exception coordination.

Mechanism: deterministic action gating, attributable evidence, dual approval, jointly governed ledger state and explicit reconciliation.

Impact hypothesis: fewer manual handoffs and less unsafe resolution behavior. A pilot must measure whether the implementation improves a provider's current workflow.
