import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

const contractSrc = path.join(projectRoot, 'contracts', 'credential.compact');
const managedOut = path.join(projectRoot, 'contracts', 'managed', 'credential');
const compiledArtifactIndex = path.join(managedOut, 'contract', 'index.js');

function findCompactExecutable() {
  if (process.platform === 'win32') {
    try {
      const wslCheck = execSync('wsl ~/.local/bin/compact --version', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
      if (wslCheck.includes('compact')) {
        const driveMatch = contractSrc.match(/^([a-zA-Z]):/);
        const driveLetter = driveMatch ? driveMatch[1].toLowerCase() : 'f';
        const wslContractPath = `/mnt/${driveLetter}${contractSrc.slice(2).replace(/\\/g, '/')}`;
        const wslOutPath = `/mnt/${driveLetter}${managedOut.slice(2).replace(/\\/g, '/')}`;
        return `wsl ~/.local/bin/compact compile ${wslContractPath} ${wslOutPath}`;
      }
    } catch (e) {
      // Fall through
    }
  }

  // Check direct binary in PATH or ~/.local/bin
  try {
    const versionOutput = execSync('compact --version', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
    if (versionOutput.includes('compact')) {
      return `compact compile "${contractSrc}" "${managedOut}"`;
    }
  } catch (e) {
    // Check ~/.local/bin/compact
    const localBin = path.join(process.env.HOME || '', '.local', 'bin', 'compact');
    if (fs.existsSync(localBin)) {
      return `"${localBin}" compile "${contractSrc}" "${managedOut}"`;
    }
  }

  return null;
}

console.log('Checking Compact smart contract compilation...');
const cmd = findCompactExecutable();

if (cmd) {
  console.log(`Running compiler: ${cmd}`);
  try {
    execSync(cmd, { stdio: 'inherit', cwd: projectRoot });
    console.log('✅ Compact contract compiled successfully.');
  } catch (error) {
    console.error('❌ Compilation failed:', error.message);
    process.exit(1);
  }
} else {
  if (fs.existsSync(compiledArtifactIndex)) {
    console.log('ℹ️ Compact compiler binary not detected on system PATH.');
    console.log('✅ Verified pre-compiled ZK managed artifacts present at contracts/managed/credential.');
  } else {
    console.error('❌ Compact compiler not found and no pre-compiled artifacts exist in contracts/managed/credential.');
    process.exit(1);
  }
}
