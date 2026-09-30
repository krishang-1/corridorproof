"""Local operator bridge. Generated test identities are selected here, never supplied by HTTP."""
import json, os, pathlib, subprocess, sys

def main():
    base = pathlib.Path(sys.argv[1]).resolve()
    request = json.load(sys.stdin)
    role = request.get('role')
    if role not in ['SENDER', 'RECEIVER']:
        raise ValueError('Sender or receiver test identity required')
    method, function, args = request['method'], request['function'], request.get('args', [])
    allowed = {'query': ['ReadWorkspace', 'ReadCase'], 'submit': ['CreateCase', 'Command']}
    if function not in allowed.get(method, []) or not isinstance(args, list) or not all(isinstance(x, str) for x in args):
        raise ValueError('Invalid gateway operation')
    org = 1 if role == 'SENDER' else 2
    root = base / f'drunix/drunix-network/test-network/organizations/peerOrganizations/org{org}.example.com'
    msp = root / f'users/User1@org{org}.example.com/msp'
    env = dict(os.environ, CP_MSP_ID=f'Org{org}MSP',
               CP_CLIENT_CERT=str(next((msp/'signcerts').glob('*'))),
               CP_CLIENT_KEY=str(next((msp/'keystore').glob('*'))),
               CP_TLS_CERT=str(root/f'peers/peer0.org{org}.example.com/tls/ca.crt'),
               CP_PEER_ENDPOINT=f'localhost:{7051 if org == 1 else 9051}',
               CP_PEER_HOST=f'peer0.org{org}.example.com', CP_CHANNEL='mychannel', CP_CHAINCODE='corridorproof')
    run = subprocess.run([str(base/'corridorproof/gateway-cli'), method, function, *args], env=env,
                         capture_output=True, text=True, timeout=100)
    receipt = None
    pending = None
    for line in run.stderr.splitlines():
        if line.startswith('{'):
            try: receipt = json.loads(line)
            except json.JSONDecodeError: pass
        if line.startswith('Pending reconciliation transaction:'):
            pending = line.split(':', 1)[1].strip()
    if run.returncode:
        return dict(ok=False, outcome='INVALID' if receipt and not receipt.get('successful') else 'UNCERTAIN',
                    receipt=receipt, transactionId=pending, error=run.stderr[-4000:])
    return dict(ok=True, result=json.loads(run.stdout), receipt=receipt)

try:
    print(json.dumps(main()))
except Exception as error:
    print(json.dumps(dict(ok=False, outcome='UNCERTAIN', error=str(error))))
