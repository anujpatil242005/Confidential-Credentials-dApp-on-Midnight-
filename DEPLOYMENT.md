# Midnight Contract Deployment

This document records the deployment process, configuration, and deployed contract address for the **Confidential Credentials** smart contract on the Midnight blockchain networks.

## Target Networks

1. **Preview Testnet**: Public testnet environment for Midnight preview applications.
   - Indexer: `https://indexer.preview.midnight.network/api/v1/graphql`
   - Indexer WS: `wss://indexer.preview.midnight.network/api/v1/graphql/ws`
   - Node RPC: `https://rpc.preview.midnight.network`
   - Faucet: `https://midnight-tmnight-preview.nethermind.dev`
2. **Preprod Testnet**: Pre-production testnet environment.
   - Faucet: `https://midnight-tmnight-preprod.nethermind.dev`
3. **Local Devnet (`undeployed`)**: Local Docker devnet container stack (Node: 9944, Indexer: 8088, Proof Server: 6300).

## Deployment Command

To deploy the compiled contract to Midnight Preview Testnet:

```bash
# Compile latest Compact circuits
npm run compile

# Deploy to Preview testnet
npm run deploy -- --network preview
```

To deploy to local devnet:

```bash
# Start local Midnight stack
docker compose up -d

# Deploy to local devnet
npm run deploy
```

## Deployed Contract Information

- **Contract Name**: `credential`
- **Network**: `preview` (and local `devnet`)
- **Contract Address**: `02005a397c0f1e8e24c3d7792eb3309a633bd2946c1e95baeeae63659cf48834479e`
- **Deployment Status**: Active & Verified
- **Compiler Version**: Compact 0.5.1

## On-Chain Verification

The contract ledger state records:
- `commitments`: `Map<Bytes<32>, Boolean>` — Public set of cryptographic credential commitments.
- `revoked`: `Map<Bytes<32>, Boolean>` — Public set of revoked credential commitments.
- `issuer`: `Bytes<32>` — Issuer authority identifier.
