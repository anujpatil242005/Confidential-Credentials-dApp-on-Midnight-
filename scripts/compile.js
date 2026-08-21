import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

const contractSrc = path.join(projectRoot, 'contracts', 'credential.compact');
const managedOut = path.join(projectRoot, 'contracts', 'managed', 'credential');

function getCompactCommand() {
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
  return `compact compile "${contractSrc}" "${managedOut}"`;
}

console.log('Compiling Compact smart contract...');
const cmd = getCompactCommand();
console.log(`Running command: ${cmd}`);

try {
  execSync(cmd, { stdio: 'inherit', cwd: projectRoot });
  console.log('Compact contract compiled successfully.');
} catch (error) {
  console.error('Compilation failed:', error.message);
  process.exit(1);
}
