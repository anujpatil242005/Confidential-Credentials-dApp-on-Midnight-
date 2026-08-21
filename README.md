# Confidential Credentials dApp on Midnight

## Product Concept

**Confidential Credentials** is a zero-knowledge credential verification dApp built on the **Midnight blockchain**. Traditional digital credentials force holders to disclose full personal details (e.g. legal name, national ID, full academic transcript, exact grades, or date of birth) whenever proving eligibility to a third-party verifier. Confidential Credentials solves this privacy problem by storing only cryptographic hash commitments on the public ledger. Holders can generate zero-knowledge proofs demonstrating that they possess a valid, currently-unrevoked credential issued by an authorized authority — without revealing any raw credential fields to the verifier or the public blockchain.

## Why Midnight & Zero-Knowledge Architecture

Compact's witness and private state model enables true data confidentiality:
- **Off-Chain Witnessing**: Raw credential fields (`holderId`, `credentialType`, `credentialValue`, `salt`) exist strictly within private witness inputs inside ZK circuits.
- **Zero Ledger Disclosure**: Raw data is never written to ledger state, emitted in events, or logged in transactions.
- **On-Chain Commitments**: The issuer commits a 32-byte cryptographic hash `persistentHash([holderId, credentialType, credentialValue, salt])` to public ledger state (`commitments`).
- **ZK Revocation Checking**: The holder's ZK circuit proof proves:
  1. The holder knows private witness parameters matching an on-chain commitment in `commitments`.
  2. The commitment has NOT been marked as revoked in `revoked`.
  3. (Optional Predicate) The credential satisfies custom criteria (e.g. Score $\ge 85$) without revealing the actual score.

## Smart Contract Architecture (`contracts/credential.compact`)

The Compact smart contract exposes 5 circuits:

| Circuit | Role | Description |
|---|---|---|
| `initialize` | Authority | Initializes the issuer authority public identifier. |
| `issue_credential` | Authority | Publishes a 32-byte credential commitment hash to the public ledger set. |
| `revoke_credential` | Authority | Marks an existing commitment hash as revoked in the public revoked map. |
| `prove_credential` | Holder | Generates ZK proof of holding a valid, unrevoked credential from private witness. |
| `prove_credential_predicate` | Holder | Generates ZK proof that credential satisfies criteria (e.g. score threshold) without revealing score. |

---

## Toolchain & System Requirements

- **Node.js**: v22.0.0 or higher
- **Compact Compiler**: Midnight Compact compiler (`compact` v0.5.1)
- **Docker**: (Optional) Docker Desktop with Compose v2 for running local Midnight devnet stack.

---

## Quick Start

### 1. Installation

```bash
npm install
```

### 2. Compilation

Compile the Compact contract and generate managed ZK circuits, proving keys, verification keys, and TypeScript bindings:

```bash
npm run compile
```

Generated managed build artifacts will be produced under `contracts/managed/credential/`.

### 3. Run Test Suite

Execute the 5 automated ZK circuit test scenarios:

```bash
npm test
```

Test coverage includes:
1. Authority credential commitment issuance.
2. Valid holder zero-knowledge proof generation.
3. Rejection of invalid witness data (wrong salt or score).
4. Rejection of revoked credentials.
5. Zero-knowledge predicate criteria verification & threshold enforcement.

### 4. Deployment

Deploy to Midnight Preview Testnet:

```bash
npm run deploy -- --network preview
```

Deploy to Local Devnet:

```bash
npm run setup
```

---

## Deployed Network & Contract Address

- **Network**: `preview` (Public Testnet) / `undeployed` (Local Devnet)
- **Deployed Contract Address**: `02005a397c0f1e8e24c3d7792eb3309a633bd2946c1e95baeeae63659cf48834479e`
- **Compiler Version**: Compact 0.5.1

---

## Interactive DApp CLI

Launch the interactive CLI to issue credentials, generate ZK proofs, revoke credentials, and perform privacy audits on the live contract state:

```bash
npm run cli
```

### CLI Menu Options

1. **Issue a New Confidential Credential (Authority)**:
   Input holder name, credential type ID, and score. Generates cryptographic commitment hash and saves private witness parameters.
2. **Generate Zero-Knowledge Credential Proof (Holder)**:
   Inputs private witness (`holderId`, `credentialType`, `credentialValue`, `salt`) and generates ZK proof against Midnight ledger without transmitting raw values.
3. **Prove Credential Predicate (Zero-Knowledge)**:
   Proves custom criteria (e.g. Score $\ge 80$) without exposing actual score.
4. **Revoke Credential (Authority)**:
   Issuer revokes commitment hash on-chain.
5. **Inspect On-Chain Public Ledger State (Privacy Audit)**:
   Queries public ledger to verify that ONLY 32-byte hashes exist on-chain.

---

## Project Structure

```
smarttiffin/
├── contracts/
│   ├── credential.compact            # Compact ZK smart contract
│   └── managed/credential/           # Generated ZK circuits, keys & TS bindings
├── scripts/
│   ├── compile.js                    # Cross-platform Compact compiler runner
│   ├── test-credential.ts            # Automated 5-scenario test suite
│   └── e2e-check.ts                  # Midnight network integration check
├── src/
│   ├── credential-helper.ts          # ZK witness & commitment calculations
│   ├── cli.ts                        # Interactive DApp CLI
│   ├── deploy.ts                     # Midnight deployment script
│   ├── network.ts                    # Network selection & state management
│   └── wallet.ts                     # Midnight wallet integration & sync cache
├── .github/workflows/ci.yml          # GitHub Actions CI/CD workflow
├── DEPLOYMENT.md                     # Deployment details & contract addresses
├── SETUP.md                          # Toolchain setup instructions
├── package.json
└── tsconfig.json
```
