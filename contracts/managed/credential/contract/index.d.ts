import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type Witnesses<PS> = {
}

export type ImpureCircuits<PS> = {
  initialize(context: __compactRuntime.CircuitContext<PS>,
             issuerAuthority_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  issue_credential(context: __compactRuntime.CircuitContext<PS>,
                   commitment_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  revoke_credential(context: __compactRuntime.CircuitContext<PS>,
                    commitment_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  prove_credential(context: __compactRuntime.CircuitContext<PS>,
                   holderId_0: Uint8Array,
                   credentialType_0: bigint,
                   credentialValue_0: bigint,
                   salt_0: Uint8Array): __compactRuntime.CircuitResults<PS, boolean>;
  prove_credential_predicate(context: __compactRuntime.CircuitContext<PS>,
                             holderId_0: Uint8Array,
                             credentialType_0: bigint,
                             credentialValue_0: bigint,
                             salt_0: Uint8Array,
                             expectedType_0: bigint,
                             minScore_0: bigint): __compactRuntime.CircuitResults<PS, boolean>;
}

export type ProvableCircuits<PS> = {
  initialize(context: __compactRuntime.CircuitContext<PS>,
             issuerAuthority_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  issue_credential(context: __compactRuntime.CircuitContext<PS>,
                   commitment_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  revoke_credential(context: __compactRuntime.CircuitContext<PS>,
                    commitment_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  prove_credential(context: __compactRuntime.CircuitContext<PS>,
                   holderId_0: Uint8Array,
                   credentialType_0: bigint,
                   credentialValue_0: bigint,
                   salt_0: Uint8Array): __compactRuntime.CircuitResults<PS, boolean>;
  prove_credential_predicate(context: __compactRuntime.CircuitContext<PS>,
                             holderId_0: Uint8Array,
                             credentialType_0: bigint,
                             credentialValue_0: bigint,
                             salt_0: Uint8Array,
                             expectedType_0: bigint,
                             minScore_0: bigint): __compactRuntime.CircuitResults<PS, boolean>;
}

export type PureCircuits = {
}

export type Circuits<PS> = {
  initialize(context: __compactRuntime.CircuitContext<PS>,
             issuerAuthority_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  issue_credential(context: __compactRuntime.CircuitContext<PS>,
                   commitment_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  revoke_credential(context: __compactRuntime.CircuitContext<PS>,
                    commitment_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  prove_credential(context: __compactRuntime.CircuitContext<PS>,
                   holderId_0: Uint8Array,
                   credentialType_0: bigint,
                   credentialValue_0: bigint,
                   salt_0: Uint8Array): __compactRuntime.CircuitResults<PS, boolean>;
  prove_credential_predicate(context: __compactRuntime.CircuitContext<PS>,
                             holderId_0: Uint8Array,
                             credentialType_0: bigint,
                             credentialValue_0: bigint,
                             salt_0: Uint8Array,
                             expectedType_0: bigint,
                             minScore_0: bigint): __compactRuntime.CircuitResults<PS, boolean>;
}

export type Ledger = {
  readonly issuer: Uint8Array;
  commitments: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): boolean;
    [Symbol.iterator](): Iterator<[Uint8Array, boolean]>
  };
  revoked: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): boolean;
    [Symbol.iterator](): Iterator<[Uint8Array, boolean]>
  };
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<PS = any, W extends Witnesses<PS> = Witnesses<PS>> {
  witnesses: W;
  circuits: Circuits<PS>;
  impureCircuits: ImpureCircuits<PS>;
  provableCircuits: ProvableCircuits<PS>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<PS>): __compactRuntime.ConstructorResult<PS>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
