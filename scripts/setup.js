import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('\n======================================================');
console.log('MARG ONE-COMMAND SETUP — INITIAL ENVIRONMENT CONFIG');
console.log('======================================================\n');

try {
  // 1. Ensure backend/.env exists
  const envPath = path.join(rootDir, 'backend', '.env');
  const envExamplePath = path.join(rootDir, 'backend', '.env.example');

  if (!fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
    console.log('[SETUP] Copying backend/.env.example to backend/.env...');
    fs.copyFileSync(envExamplePath, envPath);
    console.log('[SETUP] ✓ Created backend/.env');
  }

  // 2. Install JavaScript dependencies
  console.log('[SETUP] Installing JavaScript dependencies (Root, Frontend, Backend)...');
  execSync('npm run install:all', { stdio: 'inherit', cwd: rootDir });

  // 3. Setup Python virtual environment
  console.log('\n[SETUP] Setting up Python virtual environment...');
  execSync('npm run python:setup', { stdio: 'inherit', cwd: rootDir });

  console.log('\n======================================================');
  console.log('🎉 MARG SETUP COMPLETE!');
  console.log('======================================================');
  console.log('Run the application with:');
  console.log('  \x1b[36mnpm run dev\x1b[0m\n');
} catch (err) {
  console.error('\x1b[31m%s\x1b[0m', `\n[SETUP FAILED] ${err.message}`);
  process.exit(1);
}
