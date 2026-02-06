#!/usr/bin/env node
// Start both frontend (Vite) and backend (server) together
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isWin = process.platform === 'win32';
const npmCmd = isWin ? 'npm.cmd' : 'npm';

function spawnProcess(command, args, cwd) {
  const proc = spawn(command, args, {
    cwd,
    env: process.env,
    stdio: 'inherit'
  });

  proc.on('error', (err) => {
    console.error(`Failed to start process ${command} ${args.join(' ')}:`, err);
  });

  return proc;
}

console.log('Starting frontend (Vite) and backend (server)...');

const frontend = spawnProcess(npmCmd, ['run', 'dev'], __dirname);
const backend = spawnProcess(npmCmd, ['start'], path.join(__dirname, 'server'));

function shutdown(code = 0) {
  try { if (frontend && !frontend.killed) frontend.kill('SIGTERM'); } catch (e) {}
  try { if (backend && !backend.killed) backend.kill('SIGTERM'); } catch (e) {}
  process.exit(code);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

frontend.on('exit', (code) => {
  console.log('Frontend process exited with code', code);
  shutdown(code || 0);
});

backend.on('exit', (code) => {
  console.log('Backend process exited with code', code);
  shutdown(code || 0);
});
