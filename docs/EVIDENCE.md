# Claims and evidence register

Checked 30 September 2026. Official documentation describes design and intended behavior, which does not automatically establish the deployed release status in a specific corridor.

| Claim | Primary source | What it establishes | What it does not establish |
| --- | --- | --- | --- |
| Exception coordination is a real documented requirement | [Nexus: Key Points, Exceptions and disputes](https://docs.nexusglobalpayments.org/payment-processing/key-points) | First-release documentation describes manual investigations, recall requests and disputes, with possible future message automation. | Current production release status, Indian PSP workload, our product demand. |
| A missing response needs scheme-specific handling | [Nexus: Time-critical vs non-time-critical payments](https://docs.nexusglobalpayments.org/payment-processing/time-critical-vs-non-time-critical-payments) | Status/cancellation behavior depends on payment priority and scheme process. | A universal timeout duration or universal refund permission. Our unknown-state rule is a conservative prototype policy. |
| Richer messages still need operational integration | [FSB Deputy Secretary General remarks, 8 July 2026](https://www.fsb.org/2026/07/cross-border-payments-towards-the-next-chapter/) | Speaker identifies data quality and inconsistent exchanges as frictions, with end-to-end operational use still needed. Remarks explicitly do not necessarily represent the FSB or its members. | Measured savings from CorridorProof or proof that a blockchain is required. |
| Fee/amount commitments already exist in standards | [Nexus: Fees](https://docs.nexusglobalpayments.org/payment-processing/fees) | Documented fee calculation and recipient-amount handling. | Novelty of a rate lock or fee display. Quote amounts in this demo are synthetic. |
| Status evidence has semantic distinctions | [Nexus: pacs.002](https://docs.nexusglobalpayments.org/messaging-and-translation/message-pacs.002-payment-status-report) | Standards distinguish credit, rejection and blocked outcomes. | This app's JSON commands are not an ISO 20022 implementation or certification. |
| Established competitors already solve investigations | [Swift Case Management](https://www.swift.com/products/case-management), [Swift exceptions and investigations](https://www.swift.com/news-events/news/transforming-exceptions-and-investigations) | Existing investigation/case management category, including structured communication. | An uncontested market gap. Do not call competitors merely trackers. |
| Drunix provides a multi-party test network | [NPCI official test-network README](https://github.com/npci/drunix/blob/main/drunix-network/test-network/README.md) | Linux/Docker/Go/jq requirements and default two-organization network. | That this Windows session successfully started it. |

## Product gap hypothesis

For a partner pair that currently exchanges manual exception records and needs independent governance, a shared case state plus attributable evidence and mutually approved resolution could reduce duplicate reconciliation and unsafe follow-up actions. This is an inference from the documented operations requirement. It remains a commercial hypothesis until operators confirm an unmet need relative to their current service desk, Nexus roadmap, Swift and a shared database.

## Sellable proposition

**“When a cross-border payout outcome is uncertain, both operations teams work from the same attributable evidence before anyone approves a refund or correction.”**

The demo backs the safeguard with a visible denied refund, two-party approvals, restart persistence and local signed export verification and live authenticated ledger comparison. These establish bounded software behavior on synthetic data. They do not establish reduced fraud, guaranteed settlement, lower FX spreads, regulatory compliance or actual cost savings.

## Claims excluded from submission

No “atomic settlement across two rails,” “UPI fraud eliminated,” “FX fee reduction,” “Nexus has no investigations product,” “first-ever case manager,” “production Drunix deployment,” national-scale throughput, billion-dollar TAM or percentage savings. UPI volumes are not the addressable market for this B2B exception tool. Source descriptions of future plans are not an implementation guarantee.

## Next credibility gate

Interview sender and receiver operations together. Map ten de-identified real exceptions against existing workflows. If a trusted database is acceptable, benchmark it and keep it as a lower-complexity deployment option. Choose Drunix only if independent write governance is a real partner requirement. Run a shadow pilot before permitting financial action.

## Observed live implementation

The local Drunix test network now backs the browser. Public API, browser and resilience evidence distinguish VALID envelope commits from denied business actions. Both SQL iterator fixes are disclosed; no external payment rail or independent institutional custody was tested. These measurements substantiate bounded policy behavior, not commercial demand or savings.
