# Drunix integration gate

## Evidence from this Windows session

Official repository inspected at commit `ddc0eae778158d3f8a96605cfeda383ae5eafcfc`.

- Docker client: 28.4.0. Docker Desktop Linux engine pipe absent, including after launching Docker Desktop.
- WSL distribution enumeration: `E_ACCESSDENIED` in this execution session.
- Consequently no peer/channel/chaincode lifecycle command has successfully run here. **Live deployment is unverified.** Do not present local SQLite or Go mock-stub results as Drunix commits.
- Official source says Linux with git, Docker, Go and jq. Source `go.mod` requires Go 1.26.1; the project was compiled locally with verified official Go 1.27.1 for Windows.
- Official peer config references `$(DOCKER_NS)/drunix-ccenv:$(TWO_DIGIT_VERSION)`. Verify the builder tag actually required by the chosen binary/image version instead of copying another project's workaround.
- `network.sh prereq` routes through the inherited Fabric installer. Network checks separately expect Drunix build binaries. Verify images and binaries match this Drunix commit rather than assuming the generic prerequisites command builds Drunix.

## Linux path to test next

These are preparation steps, **not a validated runbook**. Inspect the pinned source README and prerequisites before running, especially generated secrets, port conflicts and installer image tags. Use an isolated test network, not an existing institutional deployment.

```bash
git clone https://github.com/npci/drunix.git
cd drunix
git checkout ddc0eae778158d3f8a96605cfeda383ae5eafcfc
# Build required Drunix binaries/images following this checkout's README/Makefile.
# Confirm Docker server, Go and jq work and inspect required image tags.
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

Acceptance evidence required before claiming live mode: chaincode lifecycle approval/commit from both orgs, read consistency, successful timeout/rejection/late-credit cases with transaction IDs and validation codes, unauthorized MSP denial, concurrent version conflicts, restart recovery, and private-data/access review. The mock-stub cannot establish any of these network properties.
