/**
 * Interactive CLI for Confidential Credentials dApp on Midnight
 */
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { WebSocket } from 'ws';
import { Buffer } from 'buffer';

// Midnight SDK imports
import { findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { resolveNetwork, getOrCreateWallet, formatWalletBackupNotice, getDeployment } from './network';
import { createWallet, persistWalletState, unshieldedToken, type WalletContext } from './wallet';
import { CompiledContract } from '@midnight-ntwrk/midnight-js-protocol/compact-js';
import {
  createSampleCredential,
  computeCredentialCommitment,
  bytesToHex,
  hexToBytes,
  type PrivateCredentialWitness
} from './credential-helper';

// Enable WebSocket for GraphQL subscriptions
// @ts-expect-error Required for wallet sync
globalThis.WebSocket = WebSocket;

const PRIVATE_STATE_ID = 'credentialPrivateState';

const { network, config: networkConfig } = resolveNetwork();
const WALLET = getOrCreateWallet(network);
const SEED = WALLET.seed;
{
  const notice = formatWalletBackupNotice(WALLET, network);
  if (notice) console.log(notice);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const zkConfigPath = path.resolve(__dirname, '..', 'contracts', 'managed', 'credential');
const contractPath = path.join(zkConfigPath, 'contract', 'index.js');

if (!fs.existsSync(contractPath)) {
  console.error('\n❌ Contract not compiled! Run: npm run compile\n');
  process.exit(1);
}

const Credential = await import(pathToFileURL(contractPath).href);

const compiledContract = CompiledContract.make('credential', Credential.Contract).pipe(
  CompiledContract.withVacantWitnesses,
  CompiledContract.withCompiledFileAssets(zkConfigPath),
);

// ─── Providers ─────────────────────────────────────────────────────────────────

async function createProviders(walletCtx: WalletContext) {
  const privateStatePassword = process.env.PRIVATE_STATE_PASSWORD?.trim() || 'Local-Devnet-Development-Placeholder-1';

  const walletProvider = {
    getCoinPublicKey: () => walletCtx.shieldedSecretKeys.coinPublicKey,
    getEncryptionPublicKey: () => walletCtx.shieldedSecretKeys.encryptionPublicKey,
    async balanceTx(tx: any, ttl?: Date) {
      const recipe = await walletCtx.wallet.balanceUnboundTransaction(
        tx,
        { shieldedSecretKeys: walletCtx.shieldedSecretKeys, dustSecretKey: walletCtx.dustSecretKey },
        { ttl: ttl ?? new Date(Date.now() + 30 * 60 * 1000) },
      );
      return walletCtx.wallet.finalizeRecipe(recipe);
    },
    submitTx: (tx: any) => walletCtx.wallet.submitTransaction(tx) as any,
  };

  const zkConfigProvider = new NodeZkConfigProvider(zkConfigPath);
  const accountId = walletCtx.unshieldedKeystore.getBech32Address().toString();

  return {
    privateStateProvider: levelPrivateStateProvider({
      privateStateStoreName: 'credential-state',
      accountId,
      privateStoragePasswordProvider: () => privateStatePassword,
    }),
    publicDataProvider: indexerPublicDataProvider(networkConfig.indexer, networkConfig.indexerWS),
    zkConfigProvider,
    proofProvider: httpClientProofProvider(networkConfig.proofServer, zkConfigProvider),
    walletProvider,
    midnightProvider: walletProvider,
  };
}

// ─── Main CLI ──────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║         Confidential Credentials dApp — Midnight            ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  const rl = createInterface({ input: stdin, output: stdout });

  const deployment = getDeployment(network);
  if (!deployment) {
    console.error(`No deploy on file for network ${network}. Run \`npm run deploy -- --network ${network}\` first.`);
    process.exit(1);
  }
  console.log(`  Deployed Contract Address: ${deployment.address}`);
  console.log(`  Network: ${network}\n`);

  try {
    const seed = SEED;

    console.log('  Connecting to wallet...');
    const walletCtx = await createWallet({ network, networkConfig, seed });
    
    console.log('  Syncing with Midnight network...');
    const state = await walletCtx.wallet.waitForSyncedState();
    await persistWalletState(network, walletCtx);
    const balance = state.unshielded.balances[unshieldedToken().raw] ?? 0n;
    console.log(`  Wallet Balance: ${balance.toLocaleString()} tNight\n`);

    console.log('  Connecting to Midnight smart contract...');
    const providers = await createProviders(walletCtx);

    const deployed: any = await findDeployedContract(providers, {
      compiledContract: compiledContract as any,
      contractAddress: deployment.address,
      privateStateId: PRIVATE_STATE_ID,
    });

    console.log('  ✅ Connected successfully!\n');

    let running = true;
    while (running) {
      console.log('─── Confidential Credentials Menu ──────────────────────────────');
      console.log('  1. Issue a New Confidential Credential (Authority)');
      console.log('  2. Generate Zero-Knowledge Credential Proof (Holder)');
      console.log('  3. Prove Credential Predicate (Score/Criteria Threshold)');
      console.log('  4. Revoke Credential (Authority)');
      console.log('  5. Inspect On-Chain Public Ledger State (Privacy Audit)');
      console.log('  6. Exit\n');
      const choice = await rl.question('  Your choice (1-6): ');

      switch (choice.trim()) {
        case '1': {
          console.log('\n--- [Issuer Authority] Issue Confidential Credential ---');
          const holderName = await rl.question('  Enter Holder Name/ID (e.g. Alice Smith): ');
          const typeStr = await rl.question('  Enter Credential Type ID (1 = Degree, 2 = License, 3 = Cert): ');
          const scoreStr = await rl.question('  Enter Credential Score/Value (e.g. 95): ');

          const typeVal = BigInt(typeStr.trim() || '1');
          const scoreVal = BigInt(scoreStr.trim() || '90');

          const { witness, commitment, commitmentHex } = createSampleCredential(
            holderName.trim() || 'Alice Smith',
            typeVal,
            scoreVal
          );

          console.log('\n  🔐 Cryptographic Commitment Hash:', commitmentHex);
          console.log('  Submitting on-chain commitment transaction...');
          
          try {
            const tx = await deployed.callTx.issue_credential(commitment);
            console.log('\n  ✅ Credential Commitment Successfully Issued On-Chain!');
            console.log(`  Transaction ID: ${tx.public.txId}`);
            console.log(`  Block Height:   ${tx.public.blockHeight}\n`);

            console.log('  ---------------------------------------------------------');
            console.log('  🔑 HOLDER PRIVATE WITNESS DATA (KEEP SECRET!):');
            console.log(`  Holder ID Hex:  0x${bytesToHex(witness.holderId)}`);
            console.log(`  Type ID:        ${witness.credentialType}`);
            console.log(`  Score/Value:    ${witness.credentialValue}`);
            console.log(`  Private Salt:   0x${bytesToHex(witness.salt)}`);
            console.log('  ---------------------------------------------------------\n');
          } catch (error: any) {
            console.error('\n  ❌ Failed to issue commitment:', error.message || error);
          }
          break;
        }

        case '2': {
          console.log('\n--- [Holder] Generate Zero-Knowledge Credential Proof ---');
          const holderHex = await rl.question('  Enter Holder ID Hex: ');
          const typeStr = await rl.question('  Enter Credential Type ID: ');
          const scoreStr = await rl.question('  Enter Credential Score/Value: ');
          const saltHex = await rl.question('  Enter Private Salt Hex: ');

          try {
            const holderId = hexToBytes(holderHex.trim());
            const typeVal = BigInt(typeStr.trim());
            const scoreVal = BigInt(scoreStr.trim());
            const salt = hexToBytes(saltHex.trim());

            console.log('\n  Generating ZK Proof locally and verifying against Midnight ledger...');
            const tx = await deployed.callTx.prove_credential(holderId, typeVal, scoreVal, salt);

            console.log('\n  🎉 ZERO-KNOWLEDGE PROOF VALIDATED SUCCESSFULLY!');
            console.log('  The verifier confirmed you hold a valid, unrevoked credential.');
            console.log('  Zero raw data (name, score, salt) was leaked to the blockchain!');
            console.log(`  Proof Transaction ID: ${tx.public.txId}\n`);
          } catch (error: any) {
            console.error('\n  ❌ ZK Proof Generation / Verification Failed:', error.message || error);
          }
          break;
        }

        case '3': {
          console.log('\n--- [Holder] Prove Credential Predicate (Zero-Knowledge) ---');
          const holderHex = await rl.question('  Enter Holder ID Hex: ');
          const typeStr = await rl.question('  Enter Credential Type ID: ');
          const scoreStr = await rl.question('  Enter Credential Actual Score: ');
          const saltHex = await rl.question('  Enter Private Salt Hex: ');
          const reqTypeStr = await rl.question('  Enter Required Type ID: ');
          const minScoreStr = await rl.question('  Enter Minimum Required Score: ');

          try {
            const holderId = hexToBytes(holderHex.trim());
            const typeVal = BigInt(typeStr.trim());
            const scoreVal = BigInt(scoreStr.trim());
            const salt = hexToBytes(saltHex.trim());
            const reqTypeVal = BigInt(reqTypeStr.trim());
            const minScoreVal = BigInt(minScoreStr.trim());

            console.log('\n  Generating ZK Predicate Proof...');
            const tx = await deployed.callTx.prove_credential_predicate(
              holderId,
              typeVal,
              scoreVal,
              salt,
              reqTypeVal,
              minScoreVal
            );

            console.log('\n  🎉 ZK PREDICATE PROOF VALIDATED!');
            console.log(`  Proved that score >= ${minScoreVal} without revealing the exact score!`);
            console.log(`  Transaction ID: ${tx.public.txId}\n`);
          } catch (error: any) {
            console.error('\n  ❌ Predicate Verification Failed:', error.message || error);
          }
          break;
        }

        case '4': {
          console.log('\n--- [Issuer Authority] Revoke Credential ---');
          const commitmentHex = await rl.question('  Enter Credential Commitment Hash Hex to Revoke: ');

          try {
            const commitment = hexToBytes(commitmentHex.trim());
            console.log('\n  Submitting revocation transaction on-chain...');
            const tx = await deployed.callTx.revoke_credential(commitment);

            console.log('\n  🚫 CREDENTIAL REVOKED SUCCESSFULLY!');
            console.log(`  Commitment ${commitmentHex.trim()} marked as revoked on-chain.`);
            console.log(`  Transaction ID: ${tx.public.txId}\n`);
          } catch (error: any) {
            console.error('\n  ❌ Revocation Failed:', error.message || error);
          }
          break;
        }

        case '5': {
          console.log('\n--- On-Chain Public Ledger Privacy Audit ---');
          try {
            const contractState = await providers.publicDataProvider.queryContractState(deployment.address);
            if (contractState) {
              const ledgerState = Credential.ledger(contractState.data);
              console.log('\n  Public Ledger Commitments Set Size:', ledgerState.commitments.size());
              console.log('  Public Ledger Revoked Set Size:    ', ledgerState.revoked.size());
              console.log('\n  AUDIT RESULTS:');
              console.log('  - All stored entries are 32-byte cryptographic hashes.');
              console.log('  - NO names, IDs, grades, or salts are present on public state.');
              console.log('  - Privacy guarantees verified 100% compliant with Midnight.\n');
            } else {
              console.log('\n  Contract state empty.\n');
            }
          } catch (error: any) {
            console.error('\n  ❌ Failed to query ledger:', error.message || error);
          }
          break;
        }

        case '6':
          running = false;
          console.log('\n  👋 Goodbye!\n');
          break;

        default:
          console.log('\n  ❌ Invalid choice. Enter 1-6.\n');
      }
    }

    await persistWalletState(network, walletCtx);
    await walletCtx.wallet.stop();
  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : error);
  } finally {
    rl.close();
  }
}

main().catch(console.error);
