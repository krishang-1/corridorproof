// A certificate-bound CLI adapter, independent of the local demo server.
// SubmitTransaction waits for a VALID commit; no payment rail is invoked here.
package main

import (
	"crypto/x509"
	"encoding/json"
	"fmt"
	"github.com/hyperledger/fabric-gateway/pkg/client"
	"github.com/hyperledger/fabric-gateway/pkg/hash"
	"github.com/hyperledger/fabric-gateway/pkg/identity"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials"
	"os"
	"time"
)

func required(name string) string {
	v := os.Getenv(name)
	if v == "" {
		panic("Missing " + name)
	}
	return v
}
func read(name string) []byte {
	b, e := os.ReadFile(required(name))
	if e != nil {
		panic(e)
	}
	return b
}
func main() {
	if len(os.Args) < 3 || (os.Args[1] != "query" && os.Args[1] != "submit" && os.Args[1] != "race") {
		fmt.Fprintln(os.Stderr, "Usage: gateway query|submit Function [arguments...] OR race CaseID CommandJSON1 CommandJSON2")
		os.Exit(2)
	}
	pool := x509.NewCertPool()
	if !pool.AppendCertsFromPEM(read("CP_TLS_CERT")) {
		panic("Invalid TLS CA")
	}
	conn, e := grpc.NewClient(required("CP_PEER_ENDPOINT"), grpc.WithTransportCredentials(credentials.NewClientTLSFromCert(pool, required("CP_PEER_HOST"))))
	if e != nil {
		panic(e)
	}
	defer conn.Close()
	cert, e := identity.CertificateFromPEM(read("CP_CLIENT_CERT"))
	if e != nil {
		panic(e)
	}
	id, e := identity.NewX509Identity(required("CP_MSP_ID"), cert)
	if e != nil {
		panic(e)
	}
	key, e := identity.PrivateKeyFromPEM(read("CP_CLIENT_KEY"))
	if e != nil {
		panic(e)
	}
	sign, e := identity.NewPrivateKeySign(key)
	if e != nil {
		panic(e)
	}
	gateway, e := client.Connect(id, client.WithSign(sign), client.WithHash(hash.SHA256), client.WithClientConnection(conn), client.WithEvaluateTimeout(10*time.Second), client.WithEndorseTimeout(30*time.Second), client.WithSubmitTimeout(15*time.Second), client.WithCommitStatusTimeout(60*time.Second))
	if e != nil {
		panic(e)
	}
	defer gateway.Close()
	channel := os.Getenv("CP_CHANNEL")
	if channel == "" {
		channel = "mychannel"
	}
	name := os.Getenv("CP_CHAINCODE")
	if name == "" {
		name = "corridorproof"
	}
	contract := gateway.GetNetwork(channel).GetContract(name)
	if os.Args[1] == "race" {
		if e := runRace(contract, os.Args[2:]); e != nil {
			fmt.Fprintln(os.Stderr, e)
			os.Exit(1)
		}
		return
	}
	var result []byte
	if os.Args[1] == "query" {
		result, e = contract.EvaluateTransaction(os.Args[2], os.Args[3:]...)
	} else {
		var commit *client.Commit
		result, commit, e = contract.SubmitAsync(os.Args[2], client.WithArguments(os.Args[3:]...))
		if e == nil {
			var status *client.Status
			status, e = commit.Status()
			if e == nil {
				// Keep stdout as the chaincode result; stderr records the actual commit receipt.
				_ = json.NewEncoder(os.Stderr).Encode(map[string]any{
					"transactionId": status.TransactionID, "blockNumber": status.BlockNumber,
					"validationCode": status.Code.String(), "successful": status.Successful,
				})
				if !status.Successful {
					e = fmt.Errorf("transaction %s invalid: %s", status.TransactionID, status.Code)
				}
			} else {
				fmt.Fprintln(os.Stderr, "Pending reconciliation transaction:", commit.TransactionID())
			}
		}
	}
	if e != nil {
		fmt.Fprintln(os.Stderr, "Gateway failed; outcome may need transaction reconciliation. Do not infer rejection or retry money movement:", e)
		os.Exit(1)
	}
	fmt.Println(string(result))
}
