import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const isWindows = process.platform === 'win32';
const venvDir = path.join(rootDir, 'backend', '.venv');
const venvPython = isWindows
  ? path.join(venvDir, 'Scripts', 'python.exe')
  : path.join(venvDir, 'bin', 'python');
const venvPip = isWindows
  ? path.join(venvDir, 'Scripts', 'pip.exe')
  : path.join(venvDir, 'bin', 'pip');
const reqPath = path.join(rootDir, 'backend', 'python', 'requirements.txt');

console.log('\n=======================================');
console.log('MARG Python Virtual Environment Setup');
console.log('=======================================\n');

try {
  if (!fs.existsSync(venvDir)) {
    console.log(`[PYTHON SETUP] Creating virtual environment at ${venvDir}...`);
    const systemPy = isWindows ? 'python' : 'python3';
    execSync(`${systemPy} -m venv "${venvDir}"`, { stdio: 'inherit' });
    console.log(`[PYTHON SETUP] ✓ Created virtual environment successfully.`);
  } else {
    console.log(`[PYTHON SETUP] ✓ Virtual environment already exists at ${venvDir}.`);
  }

  if (fs.existsSync(reqPath)) {
    console.log(`[PYTHON SETUP] Installing dependencies from backend/python/requirements.txt...`);
    execSync(`"${venvPip}" install -r "${reqPath}"`, { stdio: 'inherit' });
    console.log(`[PYTHON SETUP] ✓ Python dependencies installed successfully.`);
  }

  console.log('\n=======================================');
  console.log('Python Environment Ready!');
  console.log('=======================================\n');
} catch (err) {
  console.error('\x1b[31m%s\x1b[0m', `\n[PYTHON SETUP FAILED] ${err.message}`);
  console.error('\x1b[33m%s\x1b[0m', 'Ensure Python 3 is installed and added to PATH.\n');
  process.exit(1);
}
