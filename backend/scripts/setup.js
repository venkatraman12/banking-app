#!/usr/bin/env node
/**
 * Quick-start script: copies .env.example → .env if missing
 */
const fs = require('fs')
const path = require('path')

const envPath     = path.join(__dirname, '..', '.env')
const examplePath = path.join(__dirname, '..', '.env.example')

if (!fs.existsSync(envPath)) {
  fs.copyFileSync(examplePath, envPath)
  console.log('✅ Created .env from .env.example')
  console.log('   → Update DATABASE_URL and JWT_SECRET before running the server')
} else {
  console.log('ℹ️  .env already exists — skipping')
}
