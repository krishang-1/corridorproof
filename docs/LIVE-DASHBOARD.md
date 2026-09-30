# Live dashboard operation

The application has two explicit backends. `npm start` defaults to the signed SQLite demo. `CORRIDORPROOF_LEDGER=drunix` selects the certificate-bound Drunix gateway. A failed live query does not switch to local data. All payment evidence and execution remain synthetic.

## Windows gateway

Build `gateway/gateway.exe` from the gateway module with Go. The binary is ignored by Git. Provision the **generated test-network User1** certificate, private key and peer TLS CA into ignored `.data-live/certs/Org1MSP/` and `Org2MSP/`. Each directory contains `client.pem`, `client-key.pem` and `tls-ca.crt`. Never commit these private keys or use production credentials in this setup.

From the project directory:

```powershell
$env:CORRIDORPROOF_LEDGER = 'drunix'
$env:CORRIDORPROOF_DATA = (Join-Path (Get-Location) '.data-live')
$env:CP_GATEWAY_BIN = (Join-Path (Get-Location) 'gateway/gateway.exe')
$env:CP_CERT_ROOT = (Join-Path (Get-Location) '.data-live/certs')
npm.cmd start
```

Org1 uses `localhost:7051` and Org2 `localhost:9051` with TLS hostnames `peer0.org1.example.com` and `peer0.org2.example.com`. The existing Drunix test network must expose those ports and have the `mychannel` channel and `corridorproof` chaincode. The backend assigns a generated certificate from the local operator's selected role. This is a development harness with no production user login or independent credential custody.

The alternative WSL bridge uses `CP_INFRA_DIR` (default `/home/krish/corridorproof-infra`) and `CP_WSL_DISTRO` (default `Ubuntu`) when native gateway variables are absent. It expects the project clone, generated network artifacts and compiled `gateway-cli` under that infrastructure directory.

## Commit outcomes

Successful submissions require a `VALID` commit receipt. Business-rule denials can themselves commit as valid ledger transactions so their denial evidence is retained. A valid envelope does not mean a refused financial action was allowed.

Before a command is submitted, its exact request identity and bytes are saved to ignored `.data-live/requests.json`. An uncertain outcome blocks replacement commands for the case. Reconciliation replays the exact request; chaincode idempotency preserves the original business result. A known invalid commit, such as `MVCC_READ_CONFLICT`, permits a new decision after refreshing state. Creation uses a unique case ID and requires checking the ledger after a timeout; it does not execute payment.

## Evidence and limits

Drunix's SQL implementation at the pinned source defaults ordinary range scans to ten records. Chaincode version 1.2 uses explicit query pages of 1,000 and refuses workspace export at that limit instead of presenting a partial result as complete. This is a bounded demonstration workspace; production needs indexed retrieval, durable pagination and independently verified completeness.

Live exports are compared with the current workspace through the authenticated gateway. The comparison detects altered or missing supplied records relative to that query. Older exports can differ after subsequent commits. Transaction IDs are references, not standalone block-signature or inclusion proofs. The separately labelled local export verifier uses signatures and locally trusted keys.

`/api/health` identifies the configured backend; it does not independently prove network connectivity. A successful workspace query is required before the UI enables case actions. See the final validation report for checks actually completed.

## Recovery

Start existing database containers and wait for SQL readiness before starting peers. Yugabyte binds to its container hostname in this test network, so checking only `127.0.0.1:5433` inside it can give a misleading failure. Use its hostname/address. Lifecycle approval and definition commit use committing-peer endpoints `7061` and `9061`, matching the official deployment script. Gateway application requests use lite-peer endpoints.

Do not use `network.sh down`, factory reset or volume removal to recover this demo. Generated test credentials, local request state and ledger data must remain private. Temporary CPU limits and stopped unrelated containers should be documented and restored deliberately after the work is finished.

## Required pinned-source bookmark repair

Expanded workspace queries exposed two upstream SQL iterator defects at `ddc0eae778158d3f8a96605cfeda383ae5eafcfc`: a missing-row type assertion panic in `NextKey`, and a raw key passed where an encoded namespace key was required in `GetBookmarkAndClose`. `infra/drunix-empty-bookmark.patch` and `infra/drunix-bookmark-namespace.patch` repair these paths. Run the preserving `infra/recover-empty-bookmark.sh` in Ubuntu after preparing the pinned source and toolchain. It rebuilds and replaces only the two existing lite peers' binaries, preserving containers and volumes.

Verified binary SHA-256: `92a9f9bbc93ef4b18fa1918741af99f5f5ddea199be669ad3f138799e2932db4`, version metadata `ddc0eae-bookmark-fix`. Container restart preserves this binary; container recreation from the original image does not. A reproducible production image and wider upstream regression suite remain future work.
