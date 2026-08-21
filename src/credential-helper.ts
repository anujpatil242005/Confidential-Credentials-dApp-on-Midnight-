import * as compactRuntime from '@midnight-ntwrk/compact-runtime';
import { crypto } from 'node:crypto';

// Compact Type Descriptors for persistentHash computation
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

const tupleDescriptor = new CredentialTupleDescriptor();

export interface PrivateCredentialWitness {
  holderId: Uint8Array;
  credentialType: bigint;
  credentialValue: bigint;
  salt: Uint8Array;
}

export function generateRandomBytes(length: number = 32): Uint8Array {
  const bytes = new Uint8Array(length);
  globalThis.crypto.getRandomValues(bytes);
  return bytes;
}

export function computeCredentialCommitment(witness: PrivateCredentialWitness): Uint8Array {
  return compactRuntime.persistentHash(tupleDescriptor, [
    witness.holderId,
    witness.credentialType,
    witness.credentialValue,
    witness.salt
  ]);
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function hexToBytes(hex: string): Uint8Array {
  const cleanHex = hex.replace(/^0x/i, '');
  if (cleanHex.length % 2 !== 0) {
    throw new Error('Invalid hex string length');
  }
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes[i / 2] = parseInt(cleanHex.substr(i, 2), 16);
  }
  return bytes;
}

export function createSampleCredential(
  holderName: string,
  type: bigint,
  score: bigint
): { witness: PrivateCredentialWitness; commitment: Uint8Array; commitmentHex: string } {
  const encoder = new TextEncoder();
  const rawHolderBytes = encoder.encode(holderName);
  const holderId = new Uint8Array(32);
  holderId.set(rawHolderBytes.slice(0, 32));

  const salt = generateRandomBytes(32);
  const witness: PrivateCredentialWitness = {
    holderId,
    credentialType: type,
    credentialValue: score,
    salt
  };

  const commitment = computeCredentialCommitment(witness);
  return {
    witness,
    commitment,
    commitmentHex: bytesToHex(commitment)
  };
}
