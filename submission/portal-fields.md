# Proposal Title
CorridorProof — Shared Evidence and Safe Resolution for Cross-Border Payment Exceptions

# Problem Understanding
Cross-border payment exceptions require parties to agree what happened before correcting or refunding a payment. A timeout does not prove rejection: refunding while the beneficiary may already have been credited can create duplicate financial exposure. Nexus documents manual investigations, recalls and disputes in its first-release model. Existing services such as Swift Case Management already address investigations, so our proposed gap is narrower: shared evidence and jointly enforced resolution rules for independent corridor operators. Demand for this exact product remains a partner-validation hypothesis.

# Solution Description
CorridorProof provides a shared exception workspace for a synthetic Singapore-to-India corridor. Parties record an agreed quote, contribute status evidence, inspect the resolution history and approve permitted actions. Deterministic policy holds unknown outcomes for reconciliation, calculates an exact shortfall correction, requires both organizations to approve corrections or refunds, and routes compliance blocks to manual review. Both parties acknowledge closure. An operations layer identifies missing approvals, next owners and review-due cases. A durable synthetic status inbox normalizes payout statuses, rejects changed message contents and holds contradictory or unposted reports. Case dossiers retain full verification context, and live organization snapshots can be compared. A Drunix ledger supplies certificate-bound institutional roles and joint endorsement. Payment execution and bank evidence are simulated.

# Implementation Approach
Implement the resolution policy in Go chaincode and expose it through a local Node.js API and browser dashboard. The test network uses two organizational identities and an endorsement policy requiring both organizations. The gateway checks transaction validation before reporting success. Persist command identities before submission so uncertain outcomes can be reconciled using the exact original request. Validate the timeout, shortfall, receiver rejection, compliance block and conflicting-evidence scenarios; compare reads across organizations. Keep a separately labelled local signed demo for infrastructure recovery. Include reproducible tests, decisions, limitations and transaction evidence in the repository. Live dashboard verification passed five scenarios with 36 VALID commits and matching reads across organizations. Additional checks demonstrated an actual MVCC conflict, rejected untrusted MSP identity, and persistence after both lite peers restarted. The pinned Drunix source requires two disclosed SQL bookmark fixes for this workload.

# Technology Stack
Drunix local test network; Go chaincode; Fabric-compatible Gateway SDK; Docker Desktop with Ubuntu on WSL2; YugabyteDB network state stores; Node.js 24 HTTP API; browser JavaScript, HTML and CSS; deterministic operations read models and a durable JSON status adapter. The separate local demo uses SQLite, Ed25519 signatures and a hash-linked event journal. Synthetic payment adapters avoid any claim of a live NPCI, UPI or banking integration.

# Expected Impact
The demonstrable benefit is a policy that refuses automatic refunds while payment status is unknown, requires joint approval for permitted financial resolutions and leaves inspectable evidence of accepted and denied decisions. A partner pilot should measure time to agree an outcome, investigation effort, unresolved-case age and attempted unsafe actions against the existing workflow. We do not claim measured savings, cheaper FX, production fraud prevention or atomic settlement. A centrally governed database is a valid alternative; Drunix is appropriate when independent parties require joint control over accepted state changes.

# GitHub Repository URL
https://github.com/krishang-1/corridorproof

# Pitch Deck URL
https://github.com/krishang-1/corridorproof/blob/main/submission/CorridorProof-pitch-expanded.pdf

## Source references and submission checks
- Nexus payment-processing documentation: https://docs.nexusglobalpayments.org/payment-processing/key-points
- Swift Case Management: https://www.swift.com/products/case-management
- Field word limits, official problem-statement selection and submission cutoff remain unverified until the portal URL is supplied.
- Readiness target: 23:00 IST. Use the public deck URL only after its publication is verified.
