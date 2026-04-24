#!/usr/bin/env node

/**
 * init-claude.js — Project bootstrap script for NovaBanc banking app.
 * Installs deps, checks Python backend requirements, seeds the DB,
 * and starts both frontend + backend dev servers.
 *
 * Usage:
 *   node init-claude.js            # Full setup + start servers
 *   node init-claude.js --check    # Check environment only (no servers)
 *   node init-claude.js --reset    # Reset DB and reseed
 */

import { execFileSync, spawn } from 'child_process'
import { existsSync, unlinkSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = __dirname
const FRONTEND = resolve(ROOT, 'frontend')
const BACKEND = resolve(ROOT, 'python_backend')
const DB_PATH = resolve(BACKEND, 'novabanc.db')

const args = process.argv.slice(2)
const CHECK_ONLY = args.includes('--check')
const RESET_DB = args.includes('--reset')

const colors = {
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
}

function log(icon, msg) {
  console.log(`  ${icon}  ${msg}`)
}

function run(cmd, cmdArgs = [], cwd = ROOT) {
  try {
    return execFileSync(cmd, cmdArgs, { cwd, stdio: 'pipe', timeout: 60000 }).toString().trim()
  } catch {
    return null
  }
}

function header(title) {
  console.log()
  console.log(colors.bold(`  === ${title} ===`))
  console.log()
}

// ── Environment checks ──

header('NovaBanc Project Setup')

// Node.js
const nodeVer = run('node', ['--version'])
if (nodeVer) {
  log(colors.green('✓'), `Node.js ${nodeVer}`)
} else {
  log(colors.red('✗'), 'Node.js not found')
  process.exit(1)
}

// npm
const npmVer = run('npm', ['--version'])
if (npmVer) {
  log(colors.green('✓'), `npm ${npmVer}`)
} else {
  log(colors.red('✗'), 'npm not found')
  process.exit(1)
}

// Python 3
const pyVer = run('python3', ['--version'])
if (pyVer) {
  log(colors.green('✓'), pyVer)
} else {
  log(colors.yellow('!'), 'Python 3 not found — backend will not work')
}

// Python deps
const pyImport = run('python3', ['-c', 'import fastapi, sqlalchemy, jose, passlib, bcrypt'])
if (pyImport !== null) {
  log(colors.green('✓'), 'Python packages: fastapi, sqlalchemy, jose, passlib, bcrypt')
} else {
  log(colors.yellow('!'), 'Missing Python packages — installing...')
  if (!CHECK_ONLY) {
    const pipResult = run('pip3', ['install', '-r', 'requirements.txt'], BACKEND)
    if (pipResult !== null) {
      log(colors.green('✓'), 'Python packages installed')
    } else {
      log(colors.red('✗'), 'Failed to install Python packages — run: cd python_backend && pip3 install -r requirements.txt')
    }
  }
}

// ── Frontend dependencies ──

header('Frontend Setup')

if (!CHECK_ONLY) {
  log(colors.cyan('…'), 'Installing npm dependencies...')
  const npmResult = run('npm', ['install'], FRONTEND)
  if (npmResult !== null) {
    log(colors.green('✓'), 'npm dependencies installed')
  } else {
    log(colors.red('✗'), 'npm install failed')
    process.exit(1)
  }

  // Playwright browsers
  log(colors.cyan('…'), 'Installing Playwright browsers...')
  const pwResult = run('npx', ['playwright', 'install', 'chromium'], FRONTEND)
  if (pwResult !== null) {
    log(colors.green('✓'), 'Playwright browsers ready')
  } else {
    log(colors.yellow('!'), 'Playwright install had issues — tests may not work')
  }
} else {
  const hasNodeModules = existsSync(resolve(FRONTEND, 'node_modules'))
  log(hasNodeModules ? colors.green('✓') : colors.red('✗'), `node_modules ${hasNodeModules ? 'exists' : 'missing — run without --check'}`)
}

// ── Database ──

header('Database')

if (RESET_DB && existsSync(DB_PATH)) {
  unlinkSync(DB_PATH)
  log(colors.yellow('!'), 'Deleted existing novabanc.db for fresh seed')
}

if (existsSync(DB_PATH)) {
  log(colors.green('✓'), 'novabanc.db exists')
} else {
  log(colors.cyan('i'), 'novabanc.db will be created on first backend start')
}

// ── Port checks ──

header('Port Availability')

function checkPort(port) {
  const result = run('lsof', ['-ti', `:${port}`])
  return result ? result.split('\n') : []
}

const port3000 = checkPort(3000)
const port4000 = checkPort(4000)

if (port3000.length === 0) {
  log(colors.green('✓'), 'Port 3000 (frontend) is free')
} else {
  log(colors.yellow('!'), `Port 3000 in use (PID: ${port3000.join(', ')}) — frontend may already be running`)
}

if (port4000.length === 0) {
  log(colors.green('✓'), 'Port 4000 (backend) is free')
} else {
  log(colors.yellow('!'), `Port 4000 in use (PID: ${port4000.join(', ')}) — backend may already be running`)
}

if (CHECK_ONLY) {
  header('Done')
  log(colors.cyan('i'), 'Run without --check to install deps and start servers')
  process.exit(0)
}

// ── Start servers ──

header('Starting Servers')

console.log()
log(colors.cyan('→'), `Backend:  ${colors.bold('http://localhost:4000')}`)
log(colors.cyan('→'), `Frontend: ${colors.bold('http://localhost:3000')}`)
console.log()
log(colors.cyan('i'), 'Demo login: demo@novabanc.com / password')
log(colors.cyan('i'), 'Admin login: admin@novabanc.com / admin1234')
console.log()
log(colors.yellow('!'), 'Press Ctrl+C to stop both servers')
console.log()

// Start backend
const backend = spawn('python3', ['-m', 'uvicorn', 'main:app', '--reload', '--port', '4000'], {
  cwd: BACKEND,
  stdio: 'pipe',
})

backend.stdout.on('data', (d) => {
  const line = d.toString().trim()
  if (line) console.log(colors.cyan('  [backend]'), line)
})
backend.stderr.on('data', (d) => {
  const line = d.toString().trim()
  if (line) console.log(colors.cyan('  [backend]'), line)
})

// Wait a moment for backend to start, then start frontend
setTimeout(() => {
  const frontend = spawn('npm', ['run', 'dev'], {
    cwd: FRONTEND,
    stdio: 'pipe',
  })

  frontend.stdout.on('data', (d) => {
    const line = d.toString().trim()
    if (line) console.log(colors.green('  [frontend]'), line)
  })
  frontend.stderr.on('data', (d) => {
    const line = d.toString().trim()
    if (line) console.log(colors.green('  [frontend]'), line)
  })

  // Handle exit
  const cleanup = () => {
    console.log('\n  Shutting down...')
    frontend.kill()
    backend.kill()
    process.exit(0)
  }

  process.on('SIGINT', cleanup)
  process.on('SIGTERM', cleanup)

  frontend.on('close', cleanup)
}, 2000)

backend.on('close', (code) => {
  if (code !== null && code !== 0) {
    log(colors.red('✗'), `Backend exited with code ${code}`)
    process.exit(1)
  }
})
