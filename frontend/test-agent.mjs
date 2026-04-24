/**
 * NovaBanc Test Agent
 * Uses the Claude Agent SDK to autonomously run Playwright tests,
 * analyze results, and report findings.
 *
 * Usage:  node test-agent.mjs [--fix] [--suite <name>]
 *   --fix          attempt to auto-fix failing tests
 *   --suite name   run only tests matching the given grep pattern
 *                  e.g. --suite "Cybersecurity"
 */

import { query } from '@anthropic-ai/claude-agent-sdk'
import { fileURLToPath } from 'url'
import path from 'path'
import { execSync } from 'child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ── Ensure Claude CLI is in PATH ──────────────────────────────────────────────
const CLAUDE_PATHS = [
  // macOS Claude desktop app installs CLI here
  `${process.env.HOME}/Library/Application Support/Claude/claude-code/2.1.64/claude`,
  `${process.env.HOME}/Library/Application Support/Claude/claude-code/2.1.74/claude`,
  `${process.env.HOME}/Library/Application Support/Claude/claude-code/2.1.76/claude`,
  '/usr/local/bin/claude',
  '/usr/bin/claude',
]

function setupClaudePath() {
  // Check if already in PATH
  try { execSync('which claude', { stdio: 'pipe' }); return } catch {}

  // Try known install locations
  for (const p of CLAUDE_PATHS) {
    try {
      execSync(`test -x "${p}"`, { stdio: 'pipe' })
      const dir = path.dirname(p)
      process.env.PATH = `${dir}:${process.env.PATH}`
      console.log(`✓ Found Claude CLI at ${p}`)
      return
    } catch {}
  }

  // Try to find via mdfind (macOS Spotlight)
  try {
    const found = execSync(
      "mdfind -name 'claude' 2>/dev/null | grep 'claude-code' | grep -v '.app' | head -1",
      { stdio: 'pipe', encoding: 'utf8' }
    ).trim()
    if (found) {
      const dir = path.dirname(found)
      process.env.PATH = `${dir}:${process.env.PATH}`
      console.log(`✓ Found Claude CLI at ${found}`)
      return
    }
  } catch {}

  console.error('❌ Claude CLI not found. Install it from https://claude.ai/download')
  console.error('   Or add it to PATH manually.')
  process.exit(1)
}

setupClaudePath()

// ── CLI args ─────────────────────────────────────────────────────────────────
const args = process.argv.slice(2)
const shouldFix  = args.includes('--fix')
const suiteIdx   = args.indexOf('--suite')
const suiteName  = suiteIdx !== -1 ? args[suiteIdx + 1] : null

// ── Build playwright command ──────────────────────────────────────────────────
function buildPlaywrightCmd() {
  let cmd = 'npx playwright test --reporter=list'
  if (suiteName) cmd += ` --grep "${suiteName}"`
  // headless + no slowMo for agent runs
  cmd += ' --headless 2>&1 || true'
  // override slow-mo via env
  cmd = `PWDEBUG=0 PLAYWRIGHT_SLOW_MO=0 ${cmd}`
  return cmd
}

// ── System prompt ─────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are a QA automation engineer for NovaBanc, a banking web application.
Your job is to:
1. Run the Playwright end-to-end test suite using the Bash tool
2. Parse and interpret the test results printed to stdout
3. Produce a clear, structured report:

   ## NovaBanc Test Report
   **Date**: <current date>
   **Suite**: ${suiteName || 'Full Suite'}

   ### Summary
   | Status   | Count |
   |----------|-------|
   | ✅ Passed | N     |
   | ❌ Failed | N     |
   | ⚠️ Skipped| N     |
   | **Total** | N    |

   ### Failed Tests
   (list each failed test with suite name, test title, and error)

   ### Passed Suites
   (list suite names with pass count)

   ### Verdict
   **OVERALL: PASS** or **OVERALL: FAIL**

4. ${shouldFix
    ? 'After reporting, attempt to fix any failing tests by editing the spec file (tests/e2e/banking-app.spec.js). Re-run after each fix (max 3 rounds).'
    : 'After reporting, do NOT modify any files — only report findings.'}

Important rules:
- Working directory: ${__dirname}
- Run playwright from: ${__dirname}
- Spec file: ${path.join(__dirname, 'tests/e2e/banking-app.spec.js')}
- The webServer (Vite dev server) auto-starts on port 3000 via playwright config
- Use --headless flag for all playwright runs
- End the report with a line: OVERALL: PASS or OVERALL: FAIL`

// ── Initial prompt ────────────────────────────────────────────────────────────
const INITIAL_PROMPT = `
Run the NovaBanc Playwright test suite now.

Command to run (from the directory ${__dirname}):
  ${buildPlaywrightCmd()}

After it completes, generate the full structured test report.
${suiteName ? `Only run tests matching: "${suiteName}"` : 'Run the complete test suite.'}
${shouldFix ? 'If tests fail, attempt fixes (up to 3 rounds).' : ''}
`

// ── Main ──────────────────────────────────────────────────────────────────────
async function runAgent() {
  console.log('\n╔════════════════════════════════════════════╗')
  console.log('║      NovaBanc Claude Test Agent            ║')
  console.log('╚════════════════════════════════════════════╝')
  if (suiteName) console.log(`🎯 Suite filter: "${suiteName}"`)
  if (shouldFix)  console.log('🔧 Auto-fix mode: ON')
  console.log('─'.repeat(44))
  console.log()

  const allowedTools = ['Bash', 'Read']
  if (shouldFix) allowedTools.push('Edit')

  let finalVerdict = 'UNKNOWN'

  for await (const message of query({
    prompt: INITIAL_PROMPT,
    options: {
      cwd: __dirname,
      allowedTools,
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
      systemPrompt: SYSTEM_PROMPT,
      maxTurns: shouldFix ? 20 : 10,
      model: 'claude-sonnet-4-6',
    },
  })) {
    // AssistantMessage — stream text output + show tool calls
    if (message.type === 'assistant') {
      const content = message.content ?? message.message?.content ?? []
      for (const block of content) {
        if (block.type === 'text' && block.text) {
          process.stdout.write(block.text)
        } else if (block.type === 'tool_use') {
          const preview = block.name === 'Bash'
            ? (block.input?.command ?? '').slice(0, 80)
            : block.name
          process.stdout.write(`\n⚙  [${block.name}] ${preview}...\n`)
        }
      }
    }

    // ResultMessage — final output
    if ('result' in message && message.result) {
      const result = message.result
      const verdictMatch = result.match(/OVERALL:\s*(PASS|FAIL)/i)
      if (verdictMatch) finalVerdict = verdictMatch[1].toUpperCase()
      if (!message.content) {
        console.log('\n' + result)
      }
    }
  }

  console.log('\n' + '─'.repeat(44))
  const icon = finalVerdict === 'PASS' ? '✅' : finalVerdict === 'FAIL' ? '❌' : '⚠️'
  console.log(`${icon}  OVERALL: ${finalVerdict}`)
  console.log('─'.repeat(44) + '\n')

  process.exit(finalVerdict === 'PASS' ? 0 : 1)
}

runAgent().catch(err => {
  console.error('\n❌ Agent error:', err.message)
  process.exit(1)
})
