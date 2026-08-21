import { Contract, ledger } from '../contracts/managed/credential/contract/index.js';
import * as compactRuntime from '@midnight-ntwrk/compact-runtime';

// Helper: Compute cryptographic commitment matching Compact's persistentHash
const _descriptor_0 = new compactRuntime.CompactTypeBytes(32);
const _descriptor_2 = new compactRuntime.CompactTypeUnsignedInteger(18446744073709551615n, 8);

class CredentialTupleDescriptor {
  alignment() {
    return _descriptor_0.alignment().concat(
      _descriptor_2.alignment().concat(
        _descriptor_2.alignment().concat(_descriptor_0.alignment())
      )
    );
  }
  fromValue(v: any) {
    return [
      _descriptor_0.fromValue(v),
      _descriptor_2.fromValue(v),
      _descriptor_2.fromValue(v),
      _descriptor_0.fromValue(v)
    ];
  }
  toValue(v: any) {
    return _descriptor_0.toValue(v[0]).concat(
      _descriptor_2.toValue(v[1]).concat(
        _descriptor_2.toValue(v[2]).concat(_descriptor_0.toValue(v[3]))
      )
    );
  }
}

const tupleDesc = new CredentialTupleDescriptor();

function computeCommitment(
  holderId: Uint8Array,
  credentialType: bigint,
  credentialValue: bigint,
  salt: Uint8Array
): Uint8Array {
  return compactRuntime.persistentHash(tupleDesc, [
    holderId,
    credentialType,
    credentialValue,
    salt
  ]);
}

async function runTestSuite() {
  console.log('====================================================');
  console.log('  Confidential Credentials Smart Contract Test Suite');
  console.log('====================================================\n');

  let passedTests = 0;
  let totalTests = 5;

  // Setup contract & initial state
  const contract = new Contract({});
  const initCtx = compactRuntime.createConstructorContext();
  const initRes = contract.initialState(initCtx);

  const contractAddress = compactRuntime.dummyContractAddress();
  const signingKey = compactRuntime.sampleSigningKey();
  let currentState = initRes.currentContractState;

  function getCircuitCtx(state: any) {
    return compactRuntime.createCircuitContext(
      contractAddress,
      signingKey.publicKey,
      state,
      undefined
    );
  }

  // Initialize issuer
  const issuerAuthority = new Uint8Array(32).fill(99);
  const initResult = contract.circuits.initialize(getCircuitCtx(currentState), issuerAuthority);
  currentState = initResult.context.currentQueryContext.state;

  // Credential 1 Test Data
  const holderId1 = new Uint8Array(32);
  holderId1.set([1, 2, 3, 4, 5]);
  const credentialType1 = 1n; // University Degree
  const credentialValue1 = 95n; // Grade 95/100
  const salt1 = new Uint8Array(32).fill(42);
  const commitment1 = computeCommitment(holderId1, credentialType1, credentialValue1, salt1);

  // TEST 1: Issuance
  try {
    console.log('[Test 1/5] Testing Credential Issuance...');
    const issueRes = contract.circuits.issue_credential(getCircuitCtx(currentState), commitment1);
    currentState = issueRes.context.currentQueryContext.state;
    
    const currentLedger = ledger(currentState);
    if (!currentLedger.commitments.member(commitment1)) {
      throw new Error('Commitment was not stored on ledger commitments map.');
    }
    if (currentLedger.revoked.member(commitment1)) {
      throw new Error('Commitment should not be in revoked map.');
    }
    console.log('  -> PASS: Credential commitment stored on-chain without exposing raw fields.\n');
    passedTests++;
  } catch (err: any) {
    console.error('  -> FAIL Test 1:', err.message, '\n');
  }

  // TEST 2: Valid ZK Proof
  try {
    console.log('[Test 2/5] Testing Holder Valid Zero-Knowledge Proof...');
    const proveRes = contract.circuits.prove_credential(
      getCircuitCtx(currentState),
      holderId1,
      credentialType1,
      credentialValue1,
      salt1
    );
    if (proveRes.result !== true) {
      throw new Error('prove_credential returned false');
    }
    console.log('  -> PASS: Holder successfully proved valid unrevoked credential.\n');
    passedTests++;
  } catch (err: any) {
    console.error('  -> FAIL Test 2:', err.message, '\n');
  }

  // TEST 3: Invalid Witness Rejection
  try {
    console.log('[Test 3/5] Testing Invalid Witness Rejection (Wrong Salt)...');
    const wrongSalt = new Uint8Array(32).fill(99);
    let threw = false;
    try {
      contract.circuits.prove_credential(
        getCircuitCtx(currentState),
        holderId1,
        credentialType1,
        credentialValue1,
        wrongSalt
      );
    } catch (e: any) {
      threw = true;
      if (!e.message.includes('Credential commitment not found on-chain')) {
        throw new Error(`Unexpected error message: ${e.message}`);
      }
    }
    if (!threw) {
      throw new Error('Circuit succeeded with invalid witness! Security assertion breached.');
    }
    console.log('  -> PASS: Invalid witness correctly rejected by ZK circuit.\n');
    passedTests++;
  } catch (err: any) {
    console.error('  -> FAIL Test 3:', err.message, '\n');
  }

  // TEST 4: Revocation & Revoked Witness Rejection
  try {
    console.log('[Test 4/5] Testing Credential Revocation & Revoked Proof Rejection...');
    const revokeRes = contract.circuits.revoke_credential(getCircuitCtx(currentState), commitment1);
    currentState = revokeRes.context.currentQueryContext.state;

    const currentLedger = ledger(currentState);
    if (!currentLedger.revoked.member(commitment1)) {
      throw new Error('Commitment was not marked as revoked on-chain.');
    }

    let threw = false;
    try {
      contract.circuits.prove_credential(
        getCircuitCtx(currentState),
        holderId1,
        credentialType1,
        credentialValue1,
        salt1
      );
    } catch (e: any) {
      threw = true;
      if (!e.message.includes('Credential has been revoked')) {
        throw new Error(`Unexpected error message: ${e.message}`);
      }
    }
    if (!threw) {
      throw new Error('Revoked credential proof succeeded when it should fail!');
    }
    console.log('  -> PASS: Revoked credential proof rejected successfully.\n');
    passedTests++;
  } catch (err: any) {
    console.error('  -> FAIL Test 4:', err.message, '\n');
  }

  // TEST 5: Predicate Proof Verification & Score Threshold Failure
  try {
    console.log('[Test 5/5] Testing Zero-Knowledge Predicate Proof Verification...');
    const holderId2 = new Uint8Array(32).fill(7);
    const credentialType2 = 2n; // Professional License
    const credentialValue2 = 88n; // Score 88
    const salt2 = new Uint8Array(32).fill(77);
    const commitment2 = computeCommitment(holderId2, credentialType2, credentialValue2, salt2);

    // Issue credential 2
    const issueRes2 = contract.circuits.issue_credential(getCircuitCtx(currentState), commitment2);
    currentState = issueRes2.context.currentQueryContext.state;

    // 5a. Valid Predicate Proof (Score 88 >= Min 80)
    const predRes = contract.circuits.prove_credential_predicate(
      getCircuitCtx(currentState),
      holderId2,
      credentialType2,
      credentialValue2,
      salt2,
      2n, // expectedType
      80n // minScore
    );
    if (predRes.result !== true) {
      throw new Error('Valid predicate proof returned false');
    }

    // 5b. Invalid Predicate Proof (Score 88 < Required Min 95)
    let threw = false;
    try {
      contract.circuits.prove_credential_predicate(
        getCircuitCtx(currentState),
        holderId2,
        credentialType2,
        credentialValue2,
        salt2,
        2n,
        95n // Require score >= 95
      );
    } catch (e: any) {
      threw = true;
      if (!e.message.includes('Credential score is below required threshold')) {
        throw new Error(`Unexpected error message: ${e.message}`);
      }
    }
    if (!threw) {
      throw new Error('Predicate proof succeeded despite score falling below threshold!');
    }

    console.log('  -> PASS: Zero-knowledge predicate proof verified criteria without revealing raw score.\n');
    passedTests++;
  } catch (err: any) {
    console.error('  -> FAIL Test 5:', err.message, '\n');
  }

  console.log('====================================================');
  console.log(` Test Results: ${passedTests}/${totalTests} tests passed`);
  console.log('====================================================');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Test suite runner error:', err);
  process.exit(1);
});
