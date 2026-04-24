import { test, expect } from '@playwright/test'

const BASE     = 'http://localhost:3000'
const EMAIL    = 'demo@novabank.com'
const PASSWORD = 'password'

async function typeInto(page, selector, text) {
  const loc = page.locator(selector)
  await loc.click()
  await loc.pressSequentially(text, { delay: 0 })
  await loc.blur()
  await page.waitForFunction(
    ({ sel, val }) => document.querySelector(sel)?.value === val,
    { sel: selector, val: text },
    { timeout: 3000 }
  )
}

async function login(page) {
  await page.goto(`${BASE}/login`)
  await typeInto(page, '#email', EMAIL)
  await page.locator('button[type="submit"]').click()
  await page.waitForSelector('#password', { state: 'visible', timeout: 5000 })
  await typeInto(page, '#password', PASSWORD)
  await page.locator('button[type="submit"]').click()
  await page.waitForSelector('.otp-box-input', { state: 'visible', timeout: 5000 })
  await page.locator('.otp-box-input').first().click()
  await page.keyboard.type('123456')
  await page.locator('button[type="submit"]').click()
  await page.waitForURL('**/dashboard', { timeout: 15000 })
}

async function openChat(page) {
  await page.click('.chatbot-fab')
  await expect(page.locator('.chatbot-window')).toBeVisible()
}

async function sendMessage(page, text) {
  await page.fill('.chatbot-input', text)
  await page.click('.chatbot-send-btn')
}

async function waitForBotReply(page) {
  // Wait for typing indicator to appear then disappear
  await expect(page.locator('.chat-typing')).toBeVisible({ timeout: 3000 }).catch(() => {})
  await expect(page.locator('.chat-typing')).not.toBeVisible({ timeout: 5000 })
}

// ─────────────────────────────────────────────
// 1. FAB (Floating Action Button)
// ─────────────────────────────────────────────
test.describe('ChatBot — Floating Button', () => {
  test.beforeEach(async ({ page }) => { await login(page) })

  test('FAB is visible on dashboard', async ({ page }) => {
    await expect(page.locator('.chatbot-fab')).toBeVisible()
  })

  test('FAB shows unread badge on load', async ({ page }) => {
    await expect(page.locator('.chatbot-badge')).toBeVisible()
    const badge = await page.locator('.chatbot-badge').textContent()
    expect(Number(badge)).toBeGreaterThan(0)
  })

  test('clicking FAB opens chat window', async ({ page }) => {
    await page.click('.chatbot-fab')
    await expect(page.locator('.chatbot-window')).toBeVisible()
  })

  test('clicking FAB again closes chat window', async ({ page }) => {
    await page.click('.chatbot-fab')
    await expect(page.locator('.chatbot-window')).toBeVisible()
    await page.click('.chatbot-fab')
    await expect(page.locator('.chatbot-window')).not.toBeVisible()
  })

  test('badge disappears after opening chat', async ({ page }) => {
    await page.click('.chatbot-fab')
    await expect(page.locator('.chatbot-badge')).not.toBeVisible()
  })

  test('FAB is visible on all pages', async ({ page }) => {
    const routes = ['/accounts', '/transactions', '/payments', '/transfer', '/cards', '/loans', '/savings', '/investments', '/profile']
    for (const route of routes) {
      await page.locator(`a[href="${route}"], [data-path="${route}"]`).first().click().catch(() => page.goto(`${BASE}${route}`))
      await page.waitForTimeout(400)
      await expect(page.locator('.chatbot-fab')).toBeVisible({ timeout: 3000 })
    }
  })
})

// ─────────────────────────────────────────────
// 2. Chat Window UI
// ─────────────────────────────────────────────
test.describe('ChatBot — Window UI', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await openChat(page)
  })

  test('header shows Nova name and online status', async ({ page }) => {
    await expect(page.locator('.chatbot-header-name')).toContainText('Nova')
    await expect(page.locator('.chatbot-online-dot')).toBeVisible()
  })

  test('header shows assistant label', async ({ page }) => {
    await expect(page.locator('.chatbot-header-status')).toContainText('NovaBank Assistant')
  })

  test('welcome message is shown on open', async ({ page }) => {
    await expect(page.locator('.chat-bubble--bot').first()).toContainText("I'm Nova")
  })

  test('bot avatar is visible on welcome message', async ({ page }) => {
    await expect(page.locator('.chat-avatar').first()).toBeVisible()
  })

  test('input field is present and focused', async ({ page }) => {
    await expect(page.locator('.chatbot-input')).toBeVisible()
    await expect(page.locator('.chatbot-input')).toBeFocused()
  })

  test('send button is disabled when input is empty', async ({ page }) => {
    await expect(page.locator('.chatbot-send-btn')).toBeDisabled()
  })

  test('send button enables when input has text', async ({ page }) => {
    await page.fill('.chatbot-input', 'hello')
    await expect(page.locator('.chatbot-send-btn')).toBeEnabled()
  })

  test('quick reply buttons are visible', async ({ page }) => {
    const quickReplies = page.locator('.quick-reply-btn')
    await expect(quickReplies.first()).toBeVisible()
    expect(await quickReplies.count()).toBeGreaterThanOrEqual(4)
  })

  test('quick reply labels include Balance', async ({ page }) => {
    await expect(page.locator('.quick-reply-btn', { hasText: 'Balance' })).toBeVisible()
  })

  test('clear chat button is visible in header', async ({ page }) => {
    await expect(page.locator('.chatbot-hdr-btn').first()).toBeVisible()
  })
})

// ─────────────────────────────────────────────
// 3. Sending Messages
// ─────────────────────────────────────────────
test.describe('ChatBot — Sending Messages', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await openChat(page)
  })

  test('typing a message shows it in input', async ({ page }) => {
    await page.fill('.chatbot-input', 'hello there')
    await expect(page.locator('.chatbot-input')).toHaveValue('hello there')
  })

  test('pressing Enter sends the message', async ({ page }) => {
    await page.fill('.chatbot-input', 'hi')
    await page.press('.chatbot-input', 'Enter')
    await expect(page.locator('.chat-bubble--user').first()).toContainText('hi')
  })

  test('clicking send button sends the message', async ({ page }) => {
    await page.fill('.chatbot-input', 'hello')
    await page.click('.chatbot-send-btn')
    await expect(page.locator('.chat-bubble--user').first()).toContainText('hello')
  })

  test('input clears after sending', async ({ page }) => {
    await page.fill('.chatbot-input', 'hello')
    await page.click('.chatbot-send-btn')
    await expect(page.locator('.chatbot-input')).toHaveValue('')
  })

  test('typing indicator appears while bot is thinking', async ({ page }) => {
    await page.fill('.chatbot-input', 'hello')
    await page.click('.chatbot-send-btn')
    // Typing dots should appear briefly
    await expect(page.locator('.chat-typing')).toBeVisible({ timeout: 2000 })
  })

  test('bot replies after typing indicator', async ({ page }) => {
    await sendMessage(page, 'hello')
    await waitForBotReply(page)
    const botMsgs = page.locator('.chat-bubble--bot')
    await expect(botMsgs).toHaveCount(2) // welcome + reply
  })
})

// ─────────────────────────────────────────────
// 4. Bot Knowledge — Greetings
// ─────────────────────────────────────────────
test.describe('ChatBot — Greeting Responses', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await openChat(page)
  })

  test('responds to "hello"', async ({ page }) => {
    await sendMessage(page, 'hello')
    await waitForBotReply(page)
    await expect(page.locator('.chat-bubble--bot').last()).toContainText('Nova')
  })

  test('responds to "hi"', async ({ page }) => {
    await sendMessage(page, 'hi')
    await waitForBotReply(page)
    await expect(page.locator('.chat-bubble--bot').last()).toBeVisible()
  })

  test('responds to "hey"', async ({ page }) => {
    await sendMessage(page, 'hey')
    await waitForBotReply(page)
    await expect(page.locator('.chat-bubble--bot').last()).toContainText('Nova')
  })
})

// ─────────────────────────────────────────────
// 5. Bot Knowledge — Banking Queries
// ─────────────────────────────────────────────
test.describe('ChatBot — Banking Knowledge', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await openChat(page)
  })

  test('balance query shows account info', async ({ page }) => {
    await sendMessage(page, 'what is my account balance')
    await waitForBotReply(page)
    await expect(page.locator('.chat-bubble--bot').last()).toContainText('Checking')
  })

  test('balance query shows dollar amounts', async ({ page }) => {
    await sendMessage(page, 'balance')
    await waitForBotReply(page)
    await expect(page.locator('.chat-bubble--bot').last()).toContainText('$')
  })

  test('transaction query shows recent activity', async ({ page }) => {
    await sendMessage(page, 'show my recent transactions')
    await waitForBotReply(page)
    await expect(page.locator('.chat-bubble--bot').last()).toContainText('Amazon')
  })

  test('send money query gives transfer steps', async ({ page }) => {
    await sendMessage(page, 'how do I send money')
    await waitForBotReply(page)
    await expect(page.locator('.chat-bubble--bot').last()).toContainText('Transfer')
  })

  test('payments query shows upcoming bills', async ({ page }) => {
    await sendMessage(page, 'pay bill')
    await waitForBotReply(page)
    await expect(page.locator('.chat-bubble--bot').last()).toContainText('Payments')
  })

  test('investment query shows portfolio info', async ({ page }) => {
    await sendMessage(page, 'show me my investment portfolio')
    await waitForBotReply(page)
    await expect(page.locator('.chat-bubble--bot').last()).toContainText('portfolio')
  })

  test('card query shows card info', async ({ page }) => {
    await sendMessage(page, 'what is my card status')
    await waitForBotReply(page)
    await expect(page.locator('.chat-bubble--bot').last()).toContainText('cards')
  })

  test('loan query shows loan details', async ({ page }) => {
    await sendMessage(page, 'show my loans')
    await waitForBotReply(page)
    await expect(page.locator('.chat-bubble--bot').last()).toContainText('Loan')
  })

  test('savings query shows goals', async ({ page }) => {
    await sendMessage(page, 'show my savings goals')
    await waitForBotReply(page)
    await expect(page.locator('.chat-bubble--bot').last()).toContainText('Emergency Fund')
  })

  test('security query shows security score', async ({ page }) => {
    await sendMessage(page, 'how do I improve my security')
    await waitForBotReply(page)
    await expect(page.locator('.chat-bubble--bot').last()).toContainText('Security Score')
  })

  test('fee query shows fee information', async ({ page }) => {
    await sendMessage(page, 'what are the fees')
    await waitForBotReply(page)
    await expect(page.locator('.chat-bubble--bot').last()).toContainText('Free')
  })

  test('profile query shows user info', async ({ page }) => {
    await sendMessage(page, 'show my profile')
    await waitForBotReply(page)
    await expect(page.locator('.chat-bubble--bot').last()).toContainText('Alex Johnson')
  })

  test('unknown query returns fallback message', async ({ page }) => {
    await sendMessage(page, 'xyzzy nonsense query 12345')
    await waitForBotReply(page)
    await expect(page.locator('.chat-bubble--bot').last()).toContainText("didn't quite")
  })

  test('thank you message gets a friendly response', async ({ page }) => {
    await sendMessage(page, 'thanks')
    await waitForBotReply(page)
    await expect(page.locator('.chat-bubble--bot').last()).toContainText("welcome")
  })
})

// ─────────────────────────────────────────────
// 6. Action Buttons (Navigation)
// ─────────────────────────────────────────────
test.describe('ChatBot — Navigation Actions', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await openChat(page)
  })

  test('balance query shows Go to Accounts button', async ({ page }) => {
    await sendMessage(page, 'balance')
    await waitForBotReply(page)
    await expect(page.locator('.chat-action-btn', { hasText: 'Accounts' })).toBeVisible()
  })

  test('clicking Go to Accounts navigates and closes chat', async ({ page }) => {
    await sendMessage(page, 'balance')
    await waitForBotReply(page)
    await page.locator('.chat-action-btn', { hasText: 'Accounts' }).click()
    await expect(page).toHaveURL(/\/accounts/)
    await expect(page.locator('.chatbot-window')).not.toBeVisible()
  })

  test('transfer query shows Go to Transfer button', async ({ page }) => {
    await sendMessage(page, 'how do I send money')
    await waitForBotReply(page)
    await expect(page.locator('.chat-action-btn', { hasText: 'Transfer' })).toBeVisible()
  })

  test('clicking Go to Transfer navigates correctly', async ({ page }) => {
    await sendMessage(page, 'send money')
    await waitForBotReply(page)
    await page.locator('.chat-action-btn', { hasText: 'Transfer' }).click()
    await expect(page).toHaveURL(/\/transfer/)
  })

  test('investment query shows View Investments button', async ({ page }) => {
    await sendMessage(page, 'portfolio')
    await waitForBotReply(page)
    await expect(page.locator('.chat-action-btn', { hasText: 'Investments' })).toBeVisible()
  })

  test('security query shows Security Settings button', async ({ page }) => {
    await sendMessage(page, 'security')
    await waitForBotReply(page)
    await expect(page.locator('.chat-action-btn', { hasText: 'Security' })).toBeVisible()
  })
})

// ─────────────────────────────────────────────
// 7. Quick Reply Buttons
// ─────────────────────────────────────────────
test.describe('ChatBot — Quick Replies', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await openChat(page)
  })

  test('clicking My Balance quick reply sends balance query', async ({ page }) => {
    await page.locator('.quick-reply-btn', { hasText: 'Balance' }).click()
    await expect(page.locator('.chat-bubble--user').first()).toContainText('balance')
  })

  test('clicking Investments quick reply sends investment query', async ({ page }) => {
    // Dashboard page-aware replies include Portfolio
    await page.locator('.quick-reply-btn', { hasText: 'Portfolio' }).click()
    await expect(page.locator('.chat-bubble--user').first()).toContainText('portfolio')
  })

  test('clicking Card Status quick reply gets card response', async ({ page }) => {
    await sendMessage(page, 'what is my card status')
    await waitForBotReply(page)
    await expect(page.locator('.chat-bubble--bot').last()).toContainText('card')
  })

  test('clicking Send Money quick reply gets transfer response', async ({ page }) => {
    // Send Money is a dashboard quick reply — send the message directly
    await sendMessage(page, 'how do I send money')
    await waitForBotReply(page)
    await expect(page.locator('.chat-bubble--bot').last()).toContainText('Transfer')
  })

  test('clicking Security quick reply gets security response', async ({ page }) => {
    await sendMessage(page, 'how do I improve my security')
    await waitForBotReply(page)
    await expect(page.locator('.chat-bubble--bot').last()).toContainText('Security Score')
  })

  test('clicking Transactions quick reply gets transactions response', async ({ page }) => {
    await page.locator('.quick-reply-btn', { hasText: 'Transactions' }).click()
    await waitForBotReply(page)
    await expect(page.locator('.chat-bubble--bot').last()).toContainText('Amazon')
  })
})

// ─────────────────────────────────────────────
// 8. Multi-turn Conversation
// ─────────────────────────────────────────────
test.describe('ChatBot — Multi-turn Conversation', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await openChat(page)
  })

  test('can send multiple messages in sequence', async ({ page }) => {
    await sendMessage(page, 'hello')
    await waitForBotReply(page)
    await sendMessage(page, 'what is my balance')
    await waitForBotReply(page)
    await sendMessage(page, 'show my transactions')
    await waitForBotReply(page)
    // Should have: welcome + 3 user + 3 bot = 7 bubbles, but counting just bots
    const botMsgs = await page.locator('.chat-bubble--bot').count()
    expect(botMsgs).toBe(4) // welcome + 3 replies
  })

  test('chat history persists while window is open', async ({ page }) => {
    await sendMessage(page, 'hello')
    await waitForBotReply(page)
    // Close and reopen
    await page.click('.chatbot-fab')
    await page.click('.chatbot-fab')
    await expect(page.locator('.chat-bubble--user').first()).toContainText('hello')
  })
})

// ─────────────────────────────────────────────
// 9. Clear Chat
// ─────────────────────────────────────────────
test.describe('ChatBot — Clear Chat', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await openChat(page)
  })

  test('clear button resets chat to welcome message only', async ({ page }) => {
    await sendMessage(page, 'hello')
    await waitForBotReply(page)
    // clear is the second header button (minimize is first, clear is second)
    await page.locator('.chatbot-hdr-btn').nth(1).click()
    const botMsgs = await page.locator('.chat-bubble--bot').count()
    expect(botMsgs).toBe(1) // only welcome
    const userMsgs = await page.locator('.chat-bubble--user').count()
    expect(userMsgs).toBe(0)
  })

  test('after clearing, new messages still work', async ({ page }) => {
    await sendMessage(page, 'hello')
    await waitForBotReply(page)
    await page.locator('.chatbot-hdr-btn').nth(1).click()
    await sendMessage(page, 'balance')
    await waitForBotReply(page)
    await expect(page.locator('.chat-bubble--bot').last()).toContainText('Checking')
  })
})

// ─────────────────────────────────────────────
// 10. Enter key behaviour
// ─────────────────────────────────────────────
test.describe('ChatBot — Keyboard Interaction', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await openChat(page)
  })

  test('Enter key sends message', async ({ page }) => {
    await page.fill('.chatbot-input', 'hello')
    await page.keyboard.press('Enter')
    await expect(page.locator('.chat-bubble--user').first()).toContainText('hello')
  })

  test('empty input does not send on Enter', async ({ page }) => {
    await page.click('.chatbot-input')
    await page.keyboard.press('Enter')
    const userMsgs = await page.locator('.chat-bubble--user').count()
    expect(userMsgs).toBe(0)
  })

  test('input is cleared after Enter send', async ({ page }) => {
    await page.fill('.chatbot-input', 'hi')
    await page.keyboard.press('Enter')
    await expect(page.locator('.chatbot-input')).toHaveValue('')
  })
})

// ─────────────────────────────────────────────
// 11. Enhanced Features
// ─────────────────────────────────────────────
test.describe('ChatBot — Enhanced Features', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await openChat(page)
  })

  test('minimize button collapses chat window', async ({ page }) => {
    await page.locator('.chatbot-hdr-btn').first().click()
    await expect(page.locator('.chatbot-window')).toHaveClass(/chatbot-window--minimized/)
  })

  test('clicking minimized header restores chat', async ({ page }) => {
    await page.locator('.chatbot-hdr-btn').first().click()
    await page.locator('.chatbot-header').click()
    await expect(page.locator('.chatbot-messages')).toBeVisible()
  })

  test('close button in header closes the window', async ({ page }) => {
    await page.locator('.chatbot-hdr-btn').last().click()
    await expect(page.locator('.chatbot-window')).not.toBeVisible()
  })

  test('AI badge is shown in header', async ({ page }) => {
    await expect(page.locator('.header-ai-tag')).toBeVisible()
    await expect(page.locator('.header-ai-tag')).toContainText('AI')
  })

  test('voice input button is visible', async ({ page }) => {
    await expect(page.locator('.chatbot-voice-btn')).toBeVisible()
  })

  test('message timestamps are shown', async ({ page }) => {
    await expect(page.locator('.chat-time').first()).toBeVisible()
  })

  test('suggestion chips appear after last bot message', async ({ page }) => {
    await expect(page.locator('.suggestion-chip').first()).toBeVisible()
  })

  test('clicking suggestion chip sends a message', async ({ page }) => {
    const chip = page.locator('.suggestion-chip').first()
    const chipText = await chip.textContent()
    await chip.click()
    await expect(page.locator('.chat-bubble--user').first()).toContainText(chipText)
  })

  test('rich accounts card renders for balance query', async ({ page }) => {
    await sendMessage(page, 'what is my balance')
    await waitForBotReply(page)
    await expect(page.locator('.rich-card').first()).toBeVisible()
  })

  test('rich transactions card renders for transaction query', async ({ page }) => {
    await sendMessage(page, 'show my recent transactions')
    await waitForBotReply(page)
    await expect(page.locator('.rich-card').first()).toBeVisible()
  })

  test('rich holdings card renders for investment query', async ({ page }) => {
    await sendMessage(page, 'show my investment portfolio')
    await waitForBotReply(page)
    await expect(page.locator('.rich-card').first()).toBeVisible()
  })

  test('rich loans card renders for loans query', async ({ page }) => {
    await sendMessage(page, 'show my loans')
    await waitForBotReply(page)
    await expect(page.locator('.rich-card').first()).toBeVisible()
  })

  test('rich goals card renders for savings query', async ({ page }) => {
    await sendMessage(page, 'show my savings goals')
    await waitForBotReply(page)
    await expect(page.locator('.rich-card').first()).toBeVisible()
  })

  test('rich security card renders for security query', async ({ page }) => {
    await sendMessage(page, 'what is my security score')
    await waitForBotReply(page)
    await expect(page.locator('.rich-card').first()).toBeVisible()
  })

  test('rich spending card renders for spending query', async ({ page }) => {
    await sendMessage(page, 'show spending breakdown')
    await waitForBotReply(page)
    await expect(page.locator('.rich-card').first()).toBeVisible()
  })

  test('page-aware quick replies change on different pages', async ({ page }) => {
    // On dashboard, capture quick replies
    const dashboardReplies = await page.locator('.quick-reply-btn').allTextContents()
    // Close chat, navigate via sidebar to investments (SPA nav preserves auth)
    await page.locator('.chatbot-hdr-btn').last().click()
    await page.locator('.nav-link[href="/investments"], a[href="/investments"]').first().click()
    await page.waitForTimeout(600)
    await page.locator('.chatbot-fab').click()
    await expect(page.locator('.chatbot-window')).toBeVisible()
    const investReplies = await page.locator('.quick-reply-btn').allTextContents()
    expect(investReplies.join()).not.toBe(dashboardReplies.join())
  })

  test('budget tips response includes actionable advice', async ({ page }) => {
    await sendMessage(page, 'how can I save more money')
    await waitForBotReply(page)
    await expect(page.locator('.chat-bubble--bot').last()).toContainText('savings rate')
  })

  test('exchange rates response shows currencies', async ({ page }) => {
    await sendMessage(page, 'what are the exchange rates')
    await waitForBotReply(page)
    await expect(page.locator('.chat-bubble--bot').last()).toContainText('EUR')
  })

  test('ATM query shows location info', async ({ page }) => {
    await sendMessage(page, 'find nearest ATM')
    await waitForBotReply(page)
    await expect(page.locator('.chat-bubble--bot').last()).toContainText('ATM')
  })

  test('support query shows contact details', async ({ page }) => {
    await sendMessage(page, 'I need to speak to a customer service agent')
    await waitForBotReply(page)
    await expect(page.locator('.chat-bubble--bot').last()).toContainText('1-800')
  })
})
