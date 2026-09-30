# Three-minute live demo

Keep the live Drunix label and synthetic-payment boundary visible. Use a new case ID to avoid replaying an already closed case. The local fallback has different evidence controls and must retain its own label.

**0:00–0:25 — Problem.** “Nexus documentation describes manual investigations, recalls and disputes in its first-release model. We focus on safely agreeing a resolution when the payout outcome is uncertain. Swift already serves the investigation category; our partner hypothesis is joint governance of the evidence and resolution.”

**0:25–1:30 — Unknown outcome.** As Sender create a synthetic timeout case with an accepted quote. Record missing response, then test blocked refund. Show unchanged unknown outcome and the denied action's VALID commit receipt. “A valid transaction recorded the denial; it did not permit a refund.”

**1:30–2:10 — Late credit.** Switch to Receiver, record synthetic full credit. Acknowledge closure as Receiver: the case remains open. Switch to Sender and acknowledge: CLOSED. “Both parties acknowledged the same credited outcome. No refund was recorded.”

**2:10–2:35 — Evidence.** Compare with live ledger, then test altered evidence. “This is an online comparison with the current authenticated query, not an offline block proof. The stored evidence was not changed.”

**2:35–3:00 — Governance.** “A trusted shared database is valid when both parties accept one operator. Drunix is useful when independent operators require joint control of accepted changes. Our local network demonstrates AND endorsement and policy behavior with generated test identities; real institutional independence and payment integration remain pilot work.”

Backup scenarios: shortfall requires both approvals before Receiver records the exact correction; definitive rejection requires both approvals before Sender records refund; compliance blocks remain manual review. All money movement is simulated.

Receipts: `submission/drunix-dashboard-evidence.json`, `drunix-browser-evidence.json` and `drunix-resilience-evidence.json`. SQL bookmark fixes are disclosed under `infra/`. Do not describe this as an unmodified production Drunix deployment.
