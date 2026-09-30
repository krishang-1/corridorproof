package main

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/json"
	"encoding/pem"
	"github.com/golang/protobuf/proto"
	"github.com/hyperledger/fabric-chaincode-go/shimtest"
	"github.com/hyperledger/fabric-protos-go/msp"
	"math/big"
	"testing"
)

func creator(t *testing.T, id string) []byte {
	key, e := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if e != nil {
		t.Fatal(e)
	}
	template := &x509.Certificate{SerialNumber: big.NewInt(1), Subject: pkix.Name{CommonName: "mock-user"}}
	der, e := x509.CreateCertificate(rand.Reader, template, template, &key.PublicKey, key)
	if e != nil {
		t.Fatal(e)
	}
	b, e := proto.Marshal(&msp.SerializedIdentity{Mspid: id, IdBytes: pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: der})})
	if e != nil {
		t.Fatal(e)
	}
	return b
}
func invoke(t *testing.T, s *shimtest.MockStub, tx string, args ...string) []byte {
	a := [][]byte{}
	for _, v := range args {
		a = append(a, []byte(v))
	}
	r := s.MockInvoke(tx, a)
	if r.Status != 200 {
		t.Fatalf("%s: %s", tx, r.Message)
	}
	return r.Payload
}
func TestContractAuthorizationAndCommittedDenial(t *testing.T) {
	s := shimtest.NewMockStub("corridorproof", &Contract{})
	s.Creator = creator(t, "Org1MSP")
	invoke(t, s, "create", "CreateCase", "CP-T", "timeout")
	input := `{"requestId":"chain-0001","expectedVersion":0,"action":"APPROVE_REFUND","payload":{}}`
	payload := invoke(t, s, "deny", "Command", "CP-T", input)
	var result Result
	if e := json.Unmarshal(payload, &result); e != nil {
		t.Fatal(e)
	}
	if result.OK || result.Code != "UNKNOWN_OR_UNSAFE" || result.State.Version != 0 {
		t.Fatal(string(payload))
	}
	key, _ := s.CreateCompositeKey("evidence", []string{"CP-T", "deny"})
	if s.State[key] == nil {
		t.Fatal("Denied business action missing durable evidence")
	}
	replay := invoke(t, s, "retry", "Command", "CP-T", input)
	if string(replay) != string(payload) {
		t.Fatal("Replay changed result")
	}
	s.Creator = creator(t, "UntrustedMSP")
	r := s.MockInvoke("unauthorized", [][]byte{[]byte("ReadCase"), []byte("CP-T")})
	if r.Status == 200 {
		t.Fatal("Unauthorized MSP can query")
	}
}
