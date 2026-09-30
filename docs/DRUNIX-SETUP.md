# Drunix integration gate

## Evidence from this Windows session

Official repository inspected at commit `ddc0eae778158d3f8a96605cfeda383ae5eafcfc`.

- Docker Desktop 4.47.0 / Linux engine 28.4.0 and Ubuntu WSL2 are now available. Docker `hello-world` successfully ran inside Ubuntu on 30 September 2026.
- Earlier sandbox commands returned `E_ACCESSDENIED`; running the user-authorized setup in the actual Windows user context resolved service access.
- Desktop startup additionally failed on stale `dockerInference` and `userAnalyticsOtlpHttp.sock` socket entries. Docker was stopped, those exact entries were moved to `.stale-corridorproof*` backup names through Ubuntu, and Desktop restarted. No factory reset or volume deletion was performed. This is an observed local repair, not a general Docker recommendation.
- Go 1.27.1 for Linux was downloaded from go.dev and verified against its published SHA-256; Linux build tools and jq were installed. Official Drunix binaries were built in `/home/krish/corridorproof-infra/drunix` and the network images downloaded.
- **Live local test-network deployment passed.** `mychannel` was created, both organizations joined, and chaincode `corridorproof` version 1.0 / sequence 1 was installed, approved by both organizations, and committed with `AND('Org1MSP.peer','Org2MSP.peer')` endorsement.
- `scripts/live-check.py` passed five shared conformance scenarios, exact request replay, stale-version denial and matching reads through both organizations' User1 certificates. All 46 submitted transactions returned `VALID` commit receipts. Timeout/late-credit, shortfall/correction and rejection/refund cases reached CLOSED. Compliance block stayed MANUAL_REVIEW; contradictory rejection was denied after credit.
- Receipts are saved in `submission/drunix-live-evidence.json`. These are real local ledger commits with synthetic quotes and simulated payment execution. The browser dashboard remains separate. They do not establish real institutional ownership, external evidence truth, production rail access or fault tolerance.
- Official source says Linux with git, Docker, Go and jq. Source `go.mod` requires Go 1.26.1; the project was compiled locally with verified official Go 1.27.1 for Windows.
- Official peer config references `$(DOCKER_NS)/drunix-ccenv:$(TWO_DIGIT_VERSION)`. Verify the builder tag actually required by the chosen binary/image version instead of copying another project's workaround.
- `network.sh prereq` routes through the inherited Fabric installer. Network checks separately expect Drunix build binaries. Verify images and binaries match this Drunix commit rather than assuming the generic prerequisites command builds Drunix.

## Linux path to test next

These steps succeeded in Ubuntu WSL2 in this session. Inspect the pinned source README and prerequisites before reproducing them, especially generated secrets, port conflicts and image tags. Use an isolated test network, not an existing institutional deployment.

```bash
git clone https://github.com/npci/drunix.git
cd drunix
git checkout ddc0eae778158d3f8a96605cfeda383ae5eafcfc
make peer orderer cryptogen configtxgen configtxlator osnadmin
for image in npcioss/drunix-peer:1.0.0 npcioss/drunix-orderer:1.0.0 \
  npcioss/drunix-vscc:1.0.0 npcioss/drunix-ccenv:1.0 npcioss/drunix-baseos:1.0 \
  yugabytedb/yugabyte:2025.2.0.0-b131 eqalpha/keydb; do docker pull "$image"; done
cd drunix-network/test-network
./network.sh up createChannel -c mychannel
./network.sh deployCC -c mychannel -ccn corridorproof \
  -ccp /absolute/path/to/corridorproof/chaincode -ccl go \
  -ccep "AND('Org1MSP.peer','Org2MSP.peer')"
```

Do not run `network.sh down` against someone else's network. Official teardown removes ledgers and Docker resources. This project does not automate that destructive cleanup.

## Certificate-bound Gateway CLI

Build `gateway/` with Go. Configure one institution's actual user certificate, private key, peer TLS CA, MSP and peer endpoint in that institution's process. Use Org1 for sender and Org2 for receiver. Never accept an HTTP role header as the live identity.

```bash
export CP_MSP_ID=Org1MSP
export CP_CLIENT_CERT=/protected/org1/user-cert.pem
export CP_CLIENT_KEY=/protected/org1/user-key.pem
export CP_TLS_CERT=/protected/org1/peer-tls-ca.crt
export CP_PEER_ENDPOINT=localhost:7051
export CP_PEER_HOST=peer0.org1.example.com
export CP_CHANNEL=mychannel
export CP_CHAINCODE=corridorproof
go run . submit CreateCase CP-LIVE-001 timeout
go run . query ReadCase CP-LIVE-001
go run . submit Command CP-LIVE-001 \
  '{"requestId":"live-timeout-001","expectedVersion":0,"action":"OBSERVE_TIMEOUT","payload":{}}'
```

`SubmitTransaction` waits for valid commit. An error can leave transport outcome uncertain: reconcile transaction/case state rather than infer payout failure. The CLI invokes no payment rail. The local dashboard currently remains a separate local demo.

## Running the live check on this machine

The Linux project is `/home/krish/corridorproof-infra/corridorproof`. Run inside Ubuntu:

```bash
export PATH="$HOME/corridorproof-infra/tools/go/bin:$PATH"
cd "$HOME/corridorproof-infra/corridorproof/gateway"
go build -o ../gateway-cli .
cd ..
python3 scripts/live-check.py
```

The script creates new synthetic cases and writes receipts to `~/corridorproof-infra/logs/live-evidence.json`. It selects generated User1 certificate/key paths without printing key contents. The infrastructure root can be overridden with `CP_INFRA_DIR`. Stdout from the Gateway is chaincode JSON; stderr records transaction ID, block number and validation code. If transport fails, reconcile before retrying.

For the existing network after a Docker restart, run `./network.sh up` from its test-network directory to restore services using the existing certificates and volumes. Do not recreate the channel or redeploy sequence 1 unnecessarily. `network.sh down` is destructive.

Remaining acceptance work: unauthorized MSP denial, simultaneous MVCC conflict, restart recovery, participant isolation, private-data/access review and dashboard integration. Sequential stale-version rejection is not a concurrent MVCC test. The existing receipts establish the tested local network properties only.
