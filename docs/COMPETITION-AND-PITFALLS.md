# Competitive position and iterative audit

Checked 30 September 2026. This audit separates source-backed requirements, implemented behavior and untested commercial propositions. It does not constitute a production security or regulatory review.

## High-level product pitch

Cross-border payment providers need to agree what happened when a payout response is missing, an amount is short, or a payment is rejected or blocked. Nexus's first-release documentation explicitly describes manual investigation, recall and dispute handling. Swift already offers structured case management and automation. The opportunity is therefore a qualified corridor's remaining integration and governance need, not a newly discovered investigations category.

CorridorProof records the accepted recipient commitment, binds observations to that case, applies deterministic resolution rules and requires both organizations' business approvals before permitted synthetic execution. Drunix supplies certificate-bound contract execution and jointly endorsed state. The operations desk then exposes the next owner, outstanding votes, review age and retained evidence.

The proposed buyer is a sender/receiver PSP pair or corridor operator. A subscription with integration/support is a hypothesis. A useful first engagement is a shadow pilot with de-identified exceptions and no permission to move funds. Measure staff effort, repeated evidence requests, approval waiting and closure completeness against both the incumbent workflow and a central database baseline.

## Pass 1: market and novelty

| Alternative | Established capability / rationale | CorridorProof position | Qualification question |
| --- | --- | --- | --- |
| [Swift Case Management](https://www.swift.com/products/case-management) | Business validation, payment-status pre-checks, pre-population, routing, reminders and end-to-end investigation tracking | Potential integration component for a partner-defined joint decision policy; not proven superior to Swift | Can the partner already implement the required approvals and evidence controls through its existing Swift workflow? |
| [Nexus Service Desk and message evolution](https://docs.nexusglobalpayments.org/payment-processing/key-points) | Documented investigation, recall and dispute process; first-release manual handling and possible future message automation | Explore a complementary operational decision record; no current Nexus connector or certification | What remains unmet after the partner's actual Nexus process and roadmap are considered? |
| A trusted central database and workflow engine | Can implement roles, signatures, append-only records, idempotency, approvals and dashboards | Often the simpler choice when participants accept one authoritative operator | Is independent write governance a real requirement, or would an agreed central operator suffice? |
| Existing internal reconciliation systems and bilateral processes | Avoid replacement/integration cost and use established staff authority | Must demonstrate lower effort or better decision controls in the partner's actual workflow | Is the delay caused by tooling, unavailable bank evidence, compliance decisions or unwilling counterparties? |

**Implemented distinction:** the prototype combines immutable accepted quote terms, attributable observations and business denials, deterministic financial action gating, two-party approval, exact submission recovery and a Drunix endorsement policy in an inspectable workflow. This is a product combination and deployment proposition, not a claim of a new blockchain invention or exclusive competitor deficiency. Dashboards, fee displays, hashes, duplicate checks and approval workflows are individually common.

**Conditional advantage:** jointly governed writes may matter to independent participants unwilling to delegate unilateral case edit authority. It is useful only if they want and can operate that governance. No commercial moat, price advantage, savings percentage, partner adoption or head-to-head superiority has been established.

## Pass 2: domain and trust boundaries

| Priority | Pitfall | Current response | Required next gate |
| --- | --- | --- | --- |
| Critical | A signed report can still be false, misbound or stale | Synthetic-only adapter validates case/quote/currency/amount; certificate attribution does not establish external truth | Authenticated scheme ingress, UETR/payment binding, source authorization, freshness and independent reconciliation |
| Critical | Application approval is mistaken for settlement | All execution is synthetic; timeout cannot authorize refund; no external payment worker exists | Scheme-specific adapter, rail idempotency, durable outbox/inquiry and recovery tests for success with lost acknowledgment; no cross-rail atomicity claim |
| Critical | One laptop holds both organizations' keys | Generated test certificates demonstrate MSP checks and endorsement, not institutional independence | Separate institutional custody, authenticated users, maker/checker separation, certificate lifecycle and independent deployments |
| High | Both parties refuse or delay an approval | Case remains unresolved; next owner and review flags are advisory | Agreed escalation/arbitration, compliance authority, participant exit and availability commitments; never an invented unilateral refund escape |
| High | A conflicting held report is assumed to freeze all future financial actions | Held inbox records do not mutate contract state; conflict review lane warns operators | Partner decision on whether a formally authorized dispute should become ledger state and block selected actions, with governed resolution and tests |
| High | Scheme-specific cancellation rules conflict with the prototype | Generic conservative unknown-state policy; no universal timeout or refund rule claimed | Map payment priority, finality, reversals and supported amounts to the actual corridor rulebook before financial use |
| High | Shared immutable data exposes sensitive details | Demo contains only synthetic identifiers and amounts; private collections are not implemented | Minimize on-chain fields; protected off-chain evidence, selective access, retention and jurisdiction-specific review |
| High | Participants change chaincode or endorsement governance unilaterally | Current deployment uses a stated Org1 AND Org2 policy | Define and test channel/chaincode upgrade authority, key compromise response, organization removal and policy change governance |
| Medium | A dossier checksum is mistaken for independent cryptographic provenance | Includes full workspace; live comparison depends on a current authenticated query | Independently anchored checkpoints/completeness and a suitable block/inclusion verifier if required; do not use a hash as proof of bank truth |

## Pass 3: implementation and commercial delivery

| Priority | Pitfall | Current response | Required next gate |
| --- | --- | --- | --- |
| High | Ledger performance becomes an unsupported sales claim | Live receipts, an actual MVCC conflict, MSP rejection and restart behavior were tested; no load benchmark | Representative concurrent workloads, multi-host availability, query latency and recovery measurements; do not copy upstream throughput aspirations into our results |
| High | Prototype workspace stops scaling or reveals too much in exports | Export fails at the 1,000-record boundary rather than silently truncating; dossier includes full workspace | Indexed per-case retrieval, durable pagination, scoped exports and explicit completeness guarantees |
| High | Local JSON bookkeeping fails under storage loss or multiple API workers | Original commands and report identities are saved before submit; same-process races are guarded and tested | Transactional durable adapter storage, fsync/recovery policy, cross-process uniqueness and storage fault tests |
| High | Dependency on repaired infrastructure is hidden | Pinned Drunix source, two SQL iterator patches and binary hash are disclosed | Reproducible patched image/build, upstream disposition, clean-environment recovery and supported upgrade path |
| High | Incumbent feature parity eliminates willingness to buy | Market gap remains a partner-qualified hypothesis | Interview both sides, compare existing product configuration and central database, and stop the ledger proposition if independent governance is unnecessary |
| High | Integration/procurement cost exceeds exception savings | No price or ROI percentage claimed | Measure exception frequency, operator effort and implementation/support cost; identify the budget owner and procurement path |
| Medium | Review flags are presented as a scheme SLA or actual balances | Fixed 15-minute prototype review threshold; totals are synthetic commitments | Partner-configurable calendar/priority thresholds and approved definitions; no balances or loss valuation claim |
| Medium | The submission promises a broader payment product than demonstrated | Exception decision component; real payment rails are not connected | Confirm fit against the exact hackathon brief and judging rubric; disclose required integrations instead of claiming simulated settlement is live |

## Further changes worth making

For the hackathon, keep the tested financial contract stable and improve explicit Drunix mapping, competition, evidence and demo narration. More unrelated features would make the proposition harder to assess without resolving the commercial uncertainty.

Before a shadow pilot, prioritize real message identity/freshness mapping, protected adapter storage, authenticated operator roles and separate institutional custody. Decide with partners whether held contradictions need a governed on-ledger dispute state. Establish evidence access and an escalation process before automating resolutions.

Before live financial execution, validate scheme semantics and add an idempotent outbox/inquiry adapter with fault injection. Then measure performance and availability on independent infrastructure. Execution readiness, legal authority and commercial adoption are separate gates.

## Go / no-go criteria

- **Continue** if both corridor parties demonstrate a material unmet evidence/approval problem, require joint write governance and accept the operating agreements and integration cost.
- **Use a simpler database deployment** if the workflow is valuable but a trusted central operator is acceptable. Preserve policy and adapter controls; do not force a blockchain justification.
- **Stop or reposition** if incumbent tooling already meets the need, authoritative evidence cannot be obtained, or approval deadlock outweighs coordination benefits.

Platform capabilities are described in [NPCI's Drunix architecture](https://github.com/npci/drunix/blob/main/docs/drunix-arch.md). Actual project results are in [VALIDATION.md](VALIDATION.md); broader source qualification is in [MARKET-GAP.md](MARKET-GAP.md).
