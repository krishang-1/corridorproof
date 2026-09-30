# Market gap and product position

Research checked 30 September 2026. Distinguish documented payment-system requirements, observed prototype behavior and a commercial hypothesis.

## The relevant market

CorridorProof addresses payment providers' **exception operations**, after an accepted payment commitment encounters uncertain, partial, rejected or blocked outcomes. Candidate buyers are a sender/receiver PSP pair or their corridor operator. Users include reconciliation, payment operations, compliance and audit teams.

The product does not sell currency, transfer value, originate consumer remittances or replace an instant payment system. Payment volumes and total remittance value cannot be treated as its addressable software revenue. A defensible market estimate needs the number of qualified corridor operators, exception workload, procurement budgets and willingness to adopt joint governance; none has been measured here.

## What primary sources actually establish

| Source | Supported observation | Product implication / inference | Limit |
| --- | --- | --- | --- |
| [Nexus key points](https://docs.nexusglobalpayments.org/payment-processing/key-points) | Its first-release documentation describes manual investigations, recalls and disputes, and possible future message automation | There is a documented inter-party exception process to support | Does not establish present deployment or a buyer's unmet need |
| [Nexus payment priority](https://docs.nexusglobalpayments.org/payment-processing/time-critical-vs-non-time-critical-payments) and [pacs.002](https://docs.nexusglobalpayments.org/messaging-and-translation/message-pacs.002-payment-status-report) | Pending, credited, unposted, rejected and blocked outcomes differ; timeout handling depends on priority and scheme | Normalize status carefully and avoid treating missing response as proof of rejection | Our JSON adapter is not a certified implementation of these schemes |
| [Swift Case Management](https://www.swift.com/products/case-management) | Validation, tracker-based responses, routing, reminders and tracking already exist | Generic case management is crowded; qualify a narrower integration/governance requirement | No claim that Swift lacks safe rules, automation or ledger initiatives |
| [FSB cross-border programme](https://www.fsb.org/work-of-the-fsb/financial-innovation-and-structural-change/cross-border-payments/) | Cost, speed, transparency and access are programme objectives | Measure exception coordination and transparency as narrow contributions | Does not establish our financial savings or settlement-speed impact |

## The narrow gap we intend to validate

**A corridor pair may have adequate payment rails and investigation messaging yet still want a jointly governed operational record of the accepted commitment, evidence and permitted financial resolution.**

That proposition is an inference, not a discovered universally unserved market. The deployment decision depends on whether a partner accepts a central case operator. If it does, an ordinary shared database may be simpler. If both institutions require their own identities, ledger copies and jointly accepted updates, Drunix can supply a governance mechanism. Institutional separation still needs deployment and agreements beyond this laptop.

## Why each issue deserves attention

### 1. Unknown outcome versus definitive rejection

A transport failure does not itself reveal the beneficiary account state. The operator needs authoritative status before selecting a follow-up action. Within our contract, unknown is held for reconciliation and cannot authorize refund. This can demonstrate refusal of an unsafe action; it does not prove real-world loss prevention, since a provider can pay outside the application and the source evidence is synthetic.

### 2. Correct evidence attached to the wrong commitment

Before taking an observation into case policy, the adapter checks the case reference, quote reference, destination currency and integer amount. It binds the message ID to normalized contents. Reusing an ID with changed content is rejected. Pending/unposted and over-credit cases are held. This improves the prototype's handling of inputs rather than inventing a new status standard.

Production work includes UETR mapping, scheme-specific message validation, bank-authenticated ingress, replay windows, source authorization and explicit correction/cancellation semantics. The current packet uses synthetic JSON and does not parse ISO 20022 XML.

### 3. Conflicting evidence and stalled approvals

Accepted contract state determines missing approvals and the next organizational owner. Ledger conflicts and held contradictory inbox reports flag review. A prototype fifteen-minute idle threshold highlights stalled cases. These are advisory operational labels; they do not change ledger status, authorize money movement or implement contractual scheme deadlines.

Two-party approval also creates a liveness tradeoff: a party can refuse to cooperate. Escalation, arbitration, participant exit and compliance authority require an agreed governance process. More automation must not create a unilateral escape from required approvals.

### 4. Uncertain ledger submission

The gateway can lose its response after submission. Creating a new request immediately could duplicate a decision. The application saves the exact command before submitting, retains an uncertain outcome and blocks replacement commands for that case. Reconciliation uses the original identity and payload. Known invalid commits, such as MVCC conflicts, require a refreshed decision.

The report inbox separately retains its command so report replay remains exact after an adapter restart. Its local bookkeeping is not an independently governed ledger. Only applied observations and contract actions are ledger events.

### 5. Explaining and inspecting the outcome

The case dossier brings together the original commitment, present case state, accepted/denied events, adapter report dispositions and operational context. It includes the full workspace so users retain verification context instead of mistaking a sliced hash chain for a complete proof.

Local signed-mode verification and current live comparison have different guarantees. A packet digest detects a change only against a separately retained expected digest; it does not independently identify a bank or prove ledger inclusion. Sequential cross-organization queries can differ if a new commit arrives between reads. Evidence origin also does not establish external truth.

## Where we complement existing infrastructure

Use the app alongside status sources and an existing investigation service. A future connector would map authenticated evidence into its policy and feed permitted resolutions into an idempotent payment adapter. The pilot should test the integration value before replacing an existing workflow. We do not claim compatibility certification, an active Swift/Nexus connection or a production NPCI sandbox.

## Commercial qualification and measurement

1. Interview sender and receiver operations together; map their present evidence and approval workflow.
2. Replay de-identified cases including unknown, partial, rejected, blocked and contradictory outcomes.
3. Establish whether the problem is tooling, missing evidence, governance, human authority or the rail itself. Software cannot remove every delay.
4. Compare CorridorProof with the existing workflow and a central database baseline.
5. Measure staff minutes per case, evidence requests, rework, approval waiting, time to agreed outcome, completeness of closure and denied unsafe attempts. Separate rail latency from operator coordination.
6. Establish willingness to adopt independent identities/nodes, procurement budget and accountable governance before live financial integration.

Subscription plus integration/support is a pricing hypothesis. No customer adoption, cost reduction percentage or production fraud prevention has been demonstrated. The defendable claim tonight is a working, inspectable implementation of specified decision safeguards on a local Drunix network.
