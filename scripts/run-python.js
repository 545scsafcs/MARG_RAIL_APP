import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

function getPythonExecutable() {
  const isWindows = process.platform === 'win32';
  const venvPythonWin = path.join(rootDir, 'backend', '.venv', 'Scripts', 'python.exe');
  const venvPythonUnix = path.join(rootDir, 'backend', '.venv', 'bin', 'python');

  if (fs.existsSync(venvPythonWin)) {
    return venvPythonWin;
  } else if (fs.existsSync(venvPythonUnix)) {
    return venvPythonUnix;
  }

  console.warn('\x1b[33m%s\x1b[0m', '[PYTHON WARNING] Virtual environment backend/.venv not found.');
  console.warn('\x1b[33m%s\x1b[0m', '[PYTHON WARNING] Run "npm run setup" to create virtual environment and install requirements.');
  console.warn('\x1b[33m%s\x1b[0m', '[PYTHON WARNING] Attempting fallback to system Python...\n');

  return isWindows ? 'python' : 'python3';
}

const pythonExe = getPythonExecutable();
const appPyPath = path.join(rootDir, 'backend', 'python', 'app.py');

console.log(`[PYTHON] Starting MARG Python Optimizer Service using ${pythonExe}...`);

const pyProcess = spawn(pythonExe, [appPyPath], {
  cwd: path.join(rootDir, 'backend', 'python'),
  stdio: 'inherit',
  shell: true
});

pyProcess.on('error', (err) => {
  console.error('\x1b[31m%s\x1b[0m', `[PYTHON FAILED] Could not launch Python service: ${err.message}`);
  console.error('\x1b[33m%s\x1b[0m', '[PYTHON] Make sure Python is installed and added to PATH, or run "npm run setup".');
  process.exit(1);
});

pyProcess.on('exit', (code, signal) => {
  if (code !== 0 && code !== null) {
    console.error('\x1b[31m%s\x1b[0m', `[PYTHON FAILED] Python service exited with code ${code}.`);
  }
});

const cleanup = () => {
  if (pyProcess && !pyProcess.killed) {
    try {
      pyProcess.kill('SIGTERM');
    } catch {}
  }
  process.exit(0);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
