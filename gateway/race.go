package main

import (
	"encoding/json"
	"fmt"
	"github.com/hyperledger/fabric-gateway/pkg/client"
	"os"
)

// Deliberately endorse both competing updates against the same pre-commit state.
// This tests actual MVCC validation rather than sequential expectedVersion checks.
func runRace(contract *client.Contract, args []string) error {
	if len(args) != 3 {
		return fmt.Errorf("race requires case ID and two command JSON values")
	}
	transactions := []*client.Transaction{}
	for _, command := range args[1:] {
		proposal, e := contract.NewProposal("Command", client.WithArguments(args[0], command))
		if e != nil {
			return e
		}
		tx, e := proposal.Endorse()
		if e != nil {
			return e
		}
		transactions = append(transactions, tx)
	}
	commits := []*client.Commit{}
	for _, tx := range transactions {
		commit, e := tx.Submit()
		if e != nil {
			return e
		}
		commits = append(commits, commit)
	}
	receipts := []map[string]any{}
	for i, commit := range commits {
		status, e := commit.Status()
		if e != nil {
			return e
		}
		var proposed any
		if e = json.Unmarshal(transactions[i].Result(), &proposed); e != nil {
			return e
		}
		receipts = append(receipts, map[string]any{"transactionId": status.TransactionID, "blockNumber": status.BlockNumber, "validationCode": status.Code.String(), "successful": status.Successful, "proposedResult": proposed})
	}
	return json.NewEncoder(os.Stdout).Encode(receipts)
}
