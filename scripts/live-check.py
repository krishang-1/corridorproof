import json, os, pathlib, subprocess, time

base = pathlib.Path(os.environ.get('CP_INFRA_DIR', str(pathlib.Path.home() / 'corridorproof-infra')))
project = base / 'corridorproof'
network = base / 'drunix/drunix-network/test-network'
(base / 'logs').mkdir(parents=True, exist_ok=True)
evidence = {'mode': 'LIVE_DRUNIX_TEST_NETWORK', 'syntheticQuotes': True,
            'paymentRails': 'SIMULATED', 'startedAt': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
            'transactions': [], 'cases': []}
stamp = str(int(time.time()))

def call(role, method, function, *args):
    org = 1 if role == 'SENDER' else 2
    root = network / f'organizations/peerOrganizations/org{org}.example.com'
    msp = root / f'users/User1@org{org}.example.com/msp'
    env = dict(os.environ, CP_MSP_ID=f'Org{org}MSP',
               CP_CLIENT_CERT=str(next((msp/'signcerts').glob('*'))),
               CP_CLIENT_KEY=str(next((msp/'keystore').glob('*'))),
               CP_TLS_CERT=str(root/f'peers/peer0.org{org}.example.com/tls/ca.crt'),
               CP_PEER_ENDPOINT=f'localhost:{7051 if org == 1 else 9051}',
               CP_PEER_HOST=f'peer0.org{org}.example.com', CP_CHANNEL='mychannel', CP_CHAINCODE='corridorproof')
    run = subprocess.run([str(project/'gateway-cli'), method, function, *args], env=env,
                         capture_output=True, text=True, timeout=100)
    if run.returncode:
        raise RuntimeError(run.stderr)
    result = json.loads(run.stdout)
    if method == 'submit':
        receipt = json.loads(run.stderr.strip())
        assert receipt['successful'] and receipt['validationCode'] == 'VALID', receipt
        evidence['transactions'].append(dict(role=role, function=function, arguments=list(args), receipt=receipt, result=result))
        print(function, role, receipt['transactionId'], receipt['validationCode'], flush=True)
    return result

try:
    fixtures = json.loads((project/'test/conformance.json').read_text())
    for idx, fixture in enumerate(fixtures):
        case_id = f'CP-LIVE-{stamp}-{idx+1}'
        scenario = ['timeout', 'shortfall', 'rejection', 'timeout', 'timeout'][idx]
        state = call('SENDER', 'submit', 'CreateCase', case_id, scenario)
        replay = None
        for step_idx, step in enumerate(fixture['steps']):
            command = json.dumps(dict(requestId=f'live-{stamp}-{idx}-{step_idx}', expectedVersion=state['version'],
                                      action=step['action'], payload=step.get('payload', {})), separators=(',', ':'))
            result = call(step['role'], 'submit', 'Command', case_id, command)
            if 'error' in step:
                assert not result['ok'] and result['code'] == step['error'], result
            else:
                assert result['ok'] and result['state']['status'] == step['status'], result
            state = result['state']
            replay = (step['role'], command, result)
        if idx == 1:
            for role in ['SENDER', 'RECEIVER']:
                command = json.dumps(dict(requestId=f'live-{stamp}-close-{role}', expectedVersion=state['version'], action='ACK_CLOSE', payload={}), separators=(',', ':'))
                result = call(role, 'submit', 'Command', case_id, command)
                assert result['ok'], result
                state = result['state']
        # Replaying a previously committed request preserves its exact result.
        assert call(replay[0], 'submit', 'Command', case_id, replay[1]) == replay[2]
        stale = json.dumps(dict(requestId=f'live-{stamp}-stale-{idx}', expectedVersion=state['version']-1,
                                action='OBSERVE_TIMEOUT', payload={}), separators=(',', ':'))
        denied = call('SENDER', 'submit', 'Command', case_id, stale)
        assert not denied['ok'] and denied['code'] == 'STALE_VERSION' and denied['state'] == state
        a = call('SENDER', 'query', 'ReadCase', case_id)
        b = call('RECEIVER', 'query', 'ReadCase', case_id)
        assert a == b == state
        evidence['cases'].append(dict(id=case_id, scenario=fixture['name'], state=state, crossOrgReadEqual=True))
    evidence['passed'] = True
finally:
    (base/'logs/live-evidence.json').write_text(json.dumps(evidence, indent=2))
    print('Evidence saved to', base/'logs/live-evidence.json', flush=True)
