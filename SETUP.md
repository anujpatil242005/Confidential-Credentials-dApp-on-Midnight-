# Midnight Toolchain & Environment Setup

This document describes the environment and toolchain setup required to compile, test, and deploy the **Confidential Credentials** smart contract on the Midnight blockchain.

## Requirements

1. **Node.js**: v22.0.0 or higher.
2. **Compact Compiler**: Midnight Compact language compiler (`compact` v0.5.1).
3. **Docker & Docker Compose**: (Optional for local devnet) Docker Desktop with Compose v2.

## Toolchain Verification

To verify that the Compact compiler is installed and operational:

```bash
# Direct binary check
compact --version

# On Windows environments with WSL
wsl ~/.local/bin/compact --version
```

Expected output: `compact 0.5.1` (or compatible version >= 0.5.0).

## Compilation Script

The repository includes a cross-platform compilation wrapper at `scripts/compile.js`.
Running `npm run compile` automatically detects the Compact compiler binary on native Linux/macOS or via WSL on Windows, compiling `contracts/credential.compact` into managed ZK circuits, proving keys, and TypeScript bindings in `contracts/managed/credential`.

```bash
npm run compile
```
