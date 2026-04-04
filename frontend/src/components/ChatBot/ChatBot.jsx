import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import './ChatBot.css'

const BOT_NAME  = 'Nova'
const BOT_ICON  = '✦'

// ─── Rich card data ───────────────────────────────────────────────────────────
const DATA = {
  accounts: [
    { name: 'Checking', number: '****4821', balance: 12450.75, change: +1.2, color: '#2563eb', icon: '🏦' },
    { name: 'Savings',  number: '****2934', balance: 34820.00, change: +0.4, color: '#0ea5e9', icon: '💰' },
    { name: 'Investment',number:'****7610', balance: 89340.50, change: +3.1, color: '#8b5cf6', icon: '📈' },
  ],
  transactions: [
    { name: 'Amazon Purchase',   amount: -89.99,  date: 'Mar 12', icon: '📦', cat: 'Shopping' },
    { name: 'Salary Deposit',    amount: +5200.00, date: 'Mar 10', icon: '💼', cat: 'Income' },
    { name: 'Netflix',           amount: -15.99,  date: 'Mar 8',  icon: '🎬', cat: 'Entertainment' },
    { name: 'Whole Foods',       amount: -87.43,  date: 'Mar 7',  icon: '🛒', cat: 'Groceries' },
    { name: 'Electric Bill',     amount: -124.00, date: 'Mar 6',  icon: '⚡', cat: 'Utilities' },
  ],
  holdings: [
    { symbol: 'VOO',  name: 'Vanguard S&P 500', value: 9724.00, gain: +1840.00, pct: +23.3, color: '#f59e0b' },
    { symbol: 'NVDA', name: 'NVIDIA Corp.',      value: 4377.00, gain: +2340.00, pct: +114.7,color: '#10b981' },
    { symbol: 'MSFT', name: 'Microsoft',         value: 3788.50, gain: +890.00,  pct: +30.7, color: '#0ea5e9' },
    { symbol: 'AAPL', name: 'Apple Inc.',        value: 2737.80, gain: +412.50,  pct: +17.7, color: '#2563eb' },
    { symbol: 'GOOGL',name: 'Alphabet Inc.',     value: 1138.88, gain: +203.20,  pct: +21.7, color: '#8b5cf6' },
  ],
  loans: [
    { name: 'Home Mortgage', remaining: 248000, total: 320000, pct: 68, rate: '3.2%', due: 'Apr 1',  color: '#2563eb' },
    { name: 'Car Loan',      remaining: 12400,  total: 22000,  pct: 54, rate: '4.8%', due: 'Mar 25', color: '#0ea5e9' },
    { name: 'Personal Loan', remaining: 5200,   total: 10000,  pct: 48, rate: '6.5%', due: 'Mar 18', color: '#8b5cf6' },
  ],
  goals: [
    { name: 'Emergency Fund', saved: 8200,  target: 10000, color: '#10b981' },
    { name: 'Vacation Fund',  saved: 2100,  target: 5000,  color: '#f59e0b' },
    { name: 'New Car',        saved: 6800,  target: 25000, color: '#0ea5e9' },
  ],
  cards: [
    { name: 'Platinum Visa',       number: '****4821', limit: 10000, used: 2340, status: 'Active', color: '#2563eb' },
    { name: 'Gold Mastercard',     number: '****7392', limit: 5000,  used: 890,  status: 'Active', color: '#f59e0b' },
    { name: 'Virtual Card',        number: '****0011', limit: 2000,  used: 156,  status: 'Active', color: '#10b981' },
  ],
  security: { score: 78, items: ['2FA Enabled ✅','Strong Password ✅','Trusted Device ⚠️','Biometric Login ⚠️'] },
  spending: [
    { cat: 'Housing',       amt: 1800, pct: 40, color: '#2563eb' },
    { cat: 'Food',          amt: 650,  pct: 14, color: '#0ea5e9' },
    { cat: 'Transport',     amt: 320,  pct: 7,  color: '#10b981' },
    { cat: 'Entertainment', amt: 280,  pct: 6,  color: '#f59e0b' },
    { cat: 'Other',         amt: 412,  pct: 9,  color: '#94a3b8' },
    { cat: 'Savings',       amt: 1038, pct: 24, color: '#8b5cf6' },
  ],
}

// ─── Knowledge base ───────────────────────────────────────────────────────────
const KB = [
  {
    id: 'greeting',
    patterns: ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening', 'howdy', 'sup'],
    text: `Hello! 👋 I'm **Nova**, your personal NovaBanc AI assistant.\n\nI can help you with balances, transactions, investments, payments, security and more. What can I do for you today?`,
    card: null,
    suggestions: ['What is my balance?', 'Show my transactions', 'How is my portfolio doing?'],
    actions: [],
  },
  {
    id: 'balance',
    patterns: ['balance', 'how much', 'account balance', 'money in my', 'funds'],
    text: `Here are your **live account balances** as of today:`,
    card: { type: 'accounts' },
    suggestions: ['Show recent transactions', 'Transfer money', 'View spending breakdown'],
    actions: [{ label: '🏦 View Accounts', path: '/accounts' }],
  },
  {
    id: 'transactions',
    patterns: ['transaction', 'recent', 'history', 'activity', 'last purchase', 'spending', 'bought', 'charged'],
    text: `Here are your **5 most recent transactions**:`,
    card: { type: 'transactions' },
    suggestions: ['Filter by category', 'What did I spend on food?', 'Show my balance'],
    actions: [{ label: '📄 Full History', path: '/transactions' }],
  },
  {
    id: 'spending',
    patterns: ['spending breakdown', 'where is my money', 'budget', 'categories', 'where am i spending', 'monthly spend'],
    text: `Here's where your **$4,500 monthly spend** is going:`,
    card: { type: 'spending' },
    suggestions: ['How can I reduce spending?', 'Show my transactions', 'Set a savings goal'],
    actions: [{ label: '📊 View Transactions', path: '/transactions' }],
  },
  {
    id: 'budget_tips',
    patterns: ['save more', 'reduce spending', 'budget tips', 'financial advice', 'cut costs', 'save money'],
    text: `Here are **smart tips** based on your spending:\n\n💡 **Top 3 opportunities:**\n\n1. **Entertainment** ($280/mo) — Consider streaming bundles to save ~$40/mo\n2. **Food** ($650/mo) — Meal prepping could cut this by 20%\n3. **Transport** ($320/mo) — Carpooling or transit could save $80/mo\n\n📊 Your current **savings rate is 24%** — the recommended target is 20%, so you're doing great! Try to push it to 30% to hit your vacation goal faster.`,
    card: null,
    suggestions: ['Show my savings goals', 'Show spending breakdown', 'How to invest more?'],
    actions: [{ label: '🎯 Savings Goals', path: '/savings' }],
  },
  {
    id: 'transfer',
    patterns: ['send money', 'transfer', 'wire', 'move money', 'pay someone', 'send funds', 'remit'],
    text: `Here's how to **send or transfer money**:\n\n1️⃣ Click **Transfer** in the sidebar\n2️⃣ Choose **Own Accounts** or **Send to Others**\n3️⃣ Select account, enter amount & note\n4️⃣ Review details → **Confirm**\n\n⚡ Internal transfers are **instant & free**. External transfers arrive in 1–2 business days.`,
    card: null,
    suggestions: ['What are the transfer fees?', 'Can I schedule a transfer?', 'Show my recent transfers'],
    actions: [{ label: '📤 Go to Transfer', path: '/transfer' }],
  },
  {
    id: 'payments',
    patterns: ['pay bill', 'payment', 'bills', 'pay rent', 'utilities', 'upcoming payment', 'due'],
    text: `You have **4 upcoming payments** this month:\n\n🏠 Rent — **$1,800** due Mar 15\n🚗 Car Insurance — **$145** due Mar 18\n📡 Internet — **$79.99** due Mar 20\n🎓 Student Loan — **$320** due Mar 25\n\n💡 Total upcoming: **$2,344.99** — you have enough in Checking.`,
    card: null,
    suggestions: ['Pay a bill now', 'Set up auto-pay', 'Show my balance'],
    actions: [{ label: '📄 Go to Payments', path: '/payments' }],
  },
  {
    id: 'investments',
    patterns: ['invest', 'stock', 'portfolio', 'holdings', 'shares', 'market', 'equity', 'etf', 'return'],
    text: `Your portfolio is **up 3.1% today** 📈 — here's the breakdown:`,
    card: { type: 'holdings' },
    suggestions: ['Which stock is doing best?', 'Should I buy more?', 'Show allocation'],
    actions: [{ label: '📊 View Investments', path: '/investments' }],
  },
  {
    id: 'best_stock',
    patterns: ['best stock', 'top performer', 'which stock', 'biggest gain', 'best performing'],
    text: `Your **top performer** is:\n\n🏆 **NVDA (NVIDIA Corp.)**\n📈 +$2,340.00 gain (+114.7% total return)\n💵 Current value: $4,377.00\n\n🥈 Runner-up is **VOO** (Vanguard S&P 500) with +$1,840 (+23.3%)\n\nNVDA has been on an incredible run driven by AI chip demand. Consider reviewing your allocation to ensure diversification.`,
    card: null,
    suggestions: ['Show full portfolio', 'What is my total gain?', 'Show allocation'],
    actions: [{ label: '📊 View Investments', path: '/investments' }],
  },
  {
    id: 'cards',
    patterns: ['card', 'debit card', 'credit card', 'freeze card', 'block card', 'virtual card', 'credit limit'],
    text: `You have **3 active cards**. Here's your usage:`,
    card: { type: 'cards' },
    suggestions: ['How do I freeze a card?', 'Report a lost card', 'Increase credit limit'],
    actions: [{ label: '💳 Manage Cards', path: '/cards' }],
  },
  {
    id: 'freeze',
    patterns: ['freeze', 'block', 'lost card', 'stolen', 'suspicious', 'unauthorized'],
    text: `🔒 **To freeze a card instantly:**\n\n1. Go to **Cards** page\n2. Click the card you want to freeze\n3. Press the **Freeze** toggle\n\nThe card is blocked immediately — no transactions will go through. You can unfreeze it anytime.\n\n⚠️ If you suspect fraud, also call **1-800-NOVA-SEC** to file a dispute.`,
    card: null,
    suggestions: ['Go to Cards page', 'Report fraud', 'Check my transactions'],
    actions: [{ label: '💳 Go to Cards', path: '/cards' }],
  },
  {
    id: 'loans',
    patterns: ['loan', 'borrow', 'mortgage', 'debt', 'emi', 'repayment', 'interest rate', 'car loan'],
    text: `Here's your **loan summary**:`,
    card: { type: 'loans' },
    suggestions: ['How do I pay off faster?', 'Can I refinance?', 'Apply for a new loan'],
    actions: [{ label: '🏦 View Loans', path: '/loans' }],
  },
  {
    id: 'pay_faster',
    patterns: ['pay off faster', 'pay off loan', 'extra payment', 'overpay', 'clear debt'],
    text: `💡 **Smart strategies to pay off loans faster:**\n\n1. **Avalanche method** — Pay extra on your highest-rate loan first (Personal Loan at 6.5%)\n2. **Round up payments** — Pay $350 instead of $320 on student loan to save ~$180 in interest\n3. **Bi-weekly payments** — Split monthly EMI and pay every 2 weeks — saves ~1 extra payment/year\n4. **Windfalls** — Apply any bonuses/tax refunds directly to principal\n\n📊 Paying an extra $200/month on your Personal Loan cuts payoff time by **8 months** and saves **$380 in interest**.`,
    card: null,
    suggestions: ['Show my loans', 'What is my interest rate?', 'Apply for refinance'],
    actions: [{ label: '🏦 View Loans', path: '/loans' }],
  },
  {
    id: 'savings',
    patterns: ['saving', 'goal', 'savings account', 'emergency fund', 'vacation fund', 'target', 'progress'],
    text: `Here's the progress on your **savings goals**:`,
    card: { type: 'goals' },
    suggestions: ['Add to a goal', 'Create a new goal', 'Budget tips'],
    actions: [{ label: '🎯 View Savings', path: '/savings' }],
  },
  {
    id: 'security',
    patterns: ['security', '2fa', 'password', 'protect', 'safe', 'hack', 'secure my account', 'otp', 'biometric'],
    text: `Your **Security Score is 78/100**. Here's your status:`,
    card: { type: 'security' },
    suggestions: ['Enable biometric login', 'Add a trusted device', 'View login activity'],
    actions: [{ label: '🔒 Security Settings', path: '/profile' }],
  },
  {
    id: 'profile',
    patterns: ['profile', 'my info', 'personal details', 'update email', 'change phone', 'account settings'],
    text: `**Your Profile:**\n\n👤 Alex Johnson\n📧 alexjohnson@novabanc.com\n📱 +1 (555) 234-5678\n🏠 123 Main Street, New York, NY 10001\n⭐ Premium Member since 2021\n\nYou can update your details, manage notifications, view statements and promo offers from Profile.`,
    card: null,
    suggestions: ['Update my email', 'Change my password', 'View my statements'],
    actions: [{ label: '👤 Go to Profile', path: '/profile' }],
  },
  {
    id: 'fees',
    patterns: ['fee', 'charge', 'cost', 'free', 'pricing', 'how much does it cost'],
    text: `💚 **NovaBanc Fee Schedule** — almost everything is free!\n\n| Service | Fee |\n|---|---|\n| Internal Transfers | Free |\n| Bill Payments | Free |\n| External Transfers | Free (promo) |\n| In-Network ATM | Free |\n| Overdraft Protection | Free |\n| Monthly Maintenance | Free |\n| Wire Transfer | $15 |\n| International Transfer | $25 |\n\nStandard banking is **100% fee-free** at NovaBanc!`,
    card: null,
    suggestions: ['How do I transfer money?', 'What is my balance?', 'Contact support'],
    actions: [],
  },
  {
    id: 'atm',
    patterns: ['atm', 'cash', 'withdraw', 'nearest atm', 'find atm', 'cash out'],
    text: `🏧 **Finding a NovaBanc ATM:**\n\n• There are **12,000+ in-network ATMs** across the US\n• Use the **NovaBanc mobile app** → ATM Finder to locate the nearest one\n• In-network withdrawals are always **free**\n• Out-of-network ATMs charge **$2.50 + bank fee**\n\n📍 **Nearest ATMs to you:**\n1. 5th Ave Branch — 0.3 miles\n2. Times Sq Kiosk — 0.7 miles\n3. Grand Central — 1.1 miles`,
    card: null,
    suggestions: ['What are the withdrawal limits?', 'Can I deposit at an ATM?', 'Contact support'],
    actions: [],
  },
  {
    id: 'exchange',
    patterns: ['exchange rate', 'currency', 'convert', 'forex', 'international', 'foreign currency', 'usd to', 'eur', 'gbp'],
    text: `💱 **Today's Exchange Rates** (as of ${new Date().toLocaleDateString()}):\n\n🇺🇸 USD → 🇪🇺 EUR: **0.9218**\n🇺🇸 USD → 🇬🇧 GBP: **0.7891**\n🇺🇸 USD → 🇯🇵 JPY: **149.34**\n🇺🇸 USD → 🇨🇦 CAD: **1.3562**\n🇺🇸 USD → 🇦🇺 AUD: **1.5234**\n🇺🇸 USD → 🇮🇳 INR: **83.15**\n\n📊 NovaBanc charges **no currency conversion fee** on international purchases.`,
    card: null,
    suggestions: ['International transfer fees', 'How to send money abroad', 'What are the fees?'],
    actions: [],
  },
  {
    id: 'statements',
    patterns: ['statement', 'download statement', 'monthly statement', 'bank statement', 'report'],
    text: `📄 **Your Recent Statements:**\n\n• February 2026 — 34 transactions, closing $47,908.18\n• January 2026 — 28 transactions, closing $44,320.55\n• December 2025 — 41 transactions, closing $41,180.20\n\nGo to **Profile → Statements tab** to download any statement as a PDF.`,
    card: null,
    suggestions: ['Download February statement', 'View all statements', 'View transactions'],
    actions: [{ label: '📄 View Statements', path: '/profile' }],
  },
  {
    id: 'notifications',
    patterns: ['notification', 'alert', 'sms', 'email alert', 'push notification', 'notify me'],
    text: `🔔 **Your Notification Settings:**\n\n✅ Large transactions (>$500)\n✅ Low balance alert (<$1,000)\n✅ Login alerts\n✅ Bill payment reminders\n⚠️ Investment alerts — disabled\n⚠️ Weekly spending summary — disabled\n\nManage all alerts in **Profile → Notifications tab**.`,
    card: null,
    suggestions: ['Enable investment alerts', 'Go to notifications', 'Security settings'],
    actions: [{ label: '🔔 Manage Notifications', path: '/profile' }],
  },
  {
    id: 'offers',
    patterns: ['offer', 'promotion', 'deal', 'cashback', 'bonus', 'reward', 'discount'],
    text: `🎁 **Current Promotional Offers for you:**\n\n🔥 **5% Cashback on Groceries** — Activate by Mar 31\n✨ **Zero-Fee Transfers** — Active for 3 months\n💎 **High-Yield Savings 4.8% APY** — Exclusive offer\n👥 **Refer a Friend** — Get $150 bonus per referral\n\nActivate offers in **Profile → Offers tab**.`,
    card: null,
    suggestions: ['How to activate an offer?', 'View my profile', 'Refer a friend'],
    actions: [{ label: '🎁 View Offers', path: '/profile' }],
  },
  {
    id: 'support',
    patterns: ['support', 'help me', 'contact', 'call', 'customer service', 'agent', 'human', 'speak to someone'],
    text: `📞 **NovaBanc Support:**\n\n🕐 Available 24/7\n\n• **Phone:** 1-800-NOVA-BNK (668-2265)\n• **Email:** support@novabanc.com\n• **Live Chat:** Available on novabanc.com\n• **In-App:** Profile → Help & Support\n\n💡 Average wait time right now: **< 2 minutes**`,
    card: null,
    suggestions: ['Report a fraud', 'Dispute a transaction', 'Close my account'],
    actions: [],
  },
  {
    id: 'total_gain',
    patterns: ['total gain', 'profit', 'how much have i made', 'investment return', 'total return', 'portfolio gain'],
    text: `📊 **Your All-Time Investment Summary:**\n\n💰 Total Invested: **$16,080.48**\n💵 Current Value: **$21,766.18**\n📈 Total Gain: **+$5,685.70**\n🎯 Total Return: **+35.4%**\n📅 Best Day: +$728 (Feb 21, 2026)\n\n🥇 Best holding: NVDA at **+114.7%** return\n🥈 Runner-up: VOO at **+23.3%** return`,
    card: null,
    suggestions: ['Show my holdings', 'Which stock is best?', 'Investment allocation'],
    actions: [{ label: '📊 View Portfolio', path: '/investments' }],
  },
  {
    id: 'logout',
    patterns: ['logout', 'sign out', 'log out', 'exit'],
    text: `To **sign out** of NovaBanc:\n\n• Click the **Logout** button at the bottom of the left sidebar\n• You'll be redirected to the login page\n\n🔒 For your security:\n• Sessions auto-expire after **10 minutes** of inactivity\n• Always log out on shared or public devices`,
    card: null,
    suggestions: ['Security settings', 'Change my password', 'Trusted devices'],
    actions: [],
  },
  {
    id: 'thanks',
    patterns: ['thank', 'thanks', 'great', 'awesome', 'perfect', 'nice', 'good job', 'well done', 'helpful'],
    text: `You're very welcome! 😊 Happy to help anytime.\n\nIs there anything else I can assist you with?`,
    card: null,
    suggestions: ['Check my balance', 'Show transactions', 'View investments'],
    actions: [],
  },
  {
    id: 'help',
    patterns: ['help', 'what can you do', 'options', 'menu', 'commands', 'capabilities'],
    text: `Here's everything **Nova** can help you with:\n\n💰 **Accounts** — Balances, account details\n📄 **Transactions** — History, search, categories\n📤 **Transfers** — Send money, schedule payments\n📊 **Investments** — Portfolio, holdings, gains\n💳 **Cards** — Status, freeze, limits\n🏦 **Loans** — Balances, rates, payoff tips\n🎯 **Savings** — Goals, progress, tips\n🔒 **Security** — Score, 2FA, trusted devices\n💱 **Currency** — Exchange rates\n🏧 **ATM** — Finder, limits\n🎁 **Offers** — Cashback, promos\n📄 **Statements** — Download, view\n\nJust ask me naturally — I understand plain English!`,
    card: null,
    suggestions: ['Show my balance', 'How is my portfolio?', 'Security tips'],
    actions: [],
  },
]

// ─── Page-aware quick replies ─────────────────────────────────────────────────
const PAGE_QUICK_REPLIES = {
  '/dashboard':    ['💰 My Balance', '📄 Recent Transactions', '📊 Portfolio', '🎯 Savings Goals'],
  '/accounts':     ['💰 My Balance', '📤 Transfer Money', '📄 View Statements', '🔒 Freeze a Card'],
  '/transactions': ['📦 What did I spend on shopping?', '📊 Spending Breakdown', '💰 My Balance', '📄 Download Statement'],
  '/payments':     ['📅 Upcoming Bills', '💸 Transfer Fees', '📤 Send Money', '🏧 Find ATM'],
  '/transfer':     ['💸 Transfer Fees', '💱 Exchange Rates', '💰 My Balance', '📤 How to Transfer'],
  '/cards':        ['💳 Card Limits', '🔒 Freeze a Card', '💰 My Balance', '🎁 Card Offers'],
  '/loans':        ['📊 Pay Off Faster', '💰 My Balance', '📅 Next Payment Due', '🏦 Apply for Loan'],
  '/savings':      ['🎯 Budget Tips', '💰 My Balance', '📊 Spending Breakdown', '📈 Investments'],
  '/investments':  ['📊 Total Gain', '🏆 Best Stock', '💰 My Balance', '🎯 Savings Goals'],
  '/profile':      ['🔒 Security Score', '🎁 My Offers', '📄 Download Statement', '🔔 Notifications'],
}

const DEFAULT_QUICK_REPLIES = ['💰 My Balance', '📄 Transactions', '📊 Portfolio', '🔒 Security', '🎁 Offers', '💱 Exchange Rates']

const QUICK_REPLY_TO_MSG = {
  '💰 My Balance':             'What is my account balance?',
  '📄 Recent Transactions':    'Show my recent transactions',
  '📄 Transactions':           'Show my recent transactions',
  '📊 Portfolio':              'Show my investment portfolio',
  '🎯 Savings Goals':          'Show my savings goals',
  '📤 Transfer Money':         'How do I transfer money?',
  '📄 View Statements':        'Show my statements',
  '🔒 Freeze a Card':          'How do I freeze my card?',
  '📦 What did I spend on shopping?': 'Show my spending breakdown',
  '📊 Spending Breakdown':     'Show spending breakdown',
  '📄 Download Statement':     'How do I download my statement?',
  '📅 Upcoming Bills':         'Show upcoming payments',
  '💸 Transfer Fees':          'What are the transfer fees?',
  '📤 Send Money':             'How do I send money?',
  '📤 How to Transfer':        'How do I transfer money?',
  '🏧 Find ATM':               'Find nearest ATM',
  '💱 Exchange Rates':         'What are the exchange rates?',
  '💳 Card Limits':            'What is my card limit?',
  '🎁 Card Offers':            'Show my promotional offers',
  '📊 Pay Off Faster':         'How do I pay off my loan faster?',
  '📅 Next Payment Due':       'When is my next payment due?',
  '🏦 Apply for Loan':         'How do I apply for a loan?',
  '🎯 Budget Tips':            'Give me budget tips',
  '📈 Investments':            'Show my investment portfolio',
  '📊 Total Gain':             'What is my total investment gain?',
  '🏆 Best Stock':             'Which stock is performing best?',
  '🔒 Security Score':         'What is my security score?',
  '🎁 My Offers':              'Show my promotional offers',
  '🔔 Notifications':          'Show my notification settings',
  '🔒 Security':               'How do I improve my security?',
  '🎁 Offers':                 'Show my promotional offers',
}

// ─── Intent matching ──────────────────────────────────────────────────────────
function getResponse(input, lastIntent) {
  const lower = input.toLowerCase().trim()

  // Follow-up: user says yes/more/details after a card-based response
  const followUps = ['yes', 'more', 'details', 'tell me more', 'show more', 'expand', 'ok', 'sure']
  if (followUps.some(f => lower === f || lower.startsWith(f)) && lastIntent) {
    const entry = KB.find(k => k.id === lastIntent)
    if (entry?.actions?.length) {
      return {
        ...entry,
        text: `Here's more detail on that — I'm taking you to the right page!`,
        card: null,
        suggestions: entry.suggestions,
      }
    }
  }

  for (const entry of KB) {
    if (entry.patterns.some(p => lower.includes(p))) return entry
  }

  return {
    id: 'fallback',
    text: `I didn't quite get that 🤔 — but I'm always improving!\n\nTry asking me about:\n• **balance**, **transactions**, or **investments**\n• **transfer money** or **pay bills**\n• **security**, **loans**, or **savings goals**\n\nOr tap one of the quick replies below.`,
    card: null,
    suggestions: ['What is my balance?', 'Show transactions', 'Help'],
    actions: [],
  }
}

// ─── Rich card renderers ──────────────────────────────────────────────────────
function AccountsCard() {
  const total = DATA.accounts.reduce((s, a) => s + a.balance, 0)
  return (
    <div className="rich-card">
      <div className="rich-card-total">
        <span className="rich-card-total-label">Total Balance</span>
        <span className="rich-card-total-value">${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
      </div>
      {DATA.accounts.map(a => (
        <div key={a.name} className="rich-row">
          <span className="rich-row-icon" style={{ background: a.color + '20', color: a.color }}>{a.icon}</span>
          <div className="rich-row-info">
            <span className="rich-row-title">{a.name}</span>
            <span className="rich-row-sub">{a.number}</span>
          </div>
          <div className="rich-row-right">
            <span className="rich-row-value">${a.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            <span className={`rich-row-badge ${a.change >= 0 ? 'badge--up' : 'badge--down'}`}>
              {a.change >= 0 ? '▲' : '▼'} {Math.abs(a.change)}%
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

function TransactionsCard() {
  return (
    <div className="rich-card">
      {DATA.transactions.map((t, i) => (
        <div key={i} className="rich-row">
          <span className="rich-row-icon" style={{ background: '#f1f5f9' }}>{t.icon}</span>
          <div className="rich-row-info">
            <span className="rich-row-title">{t.name}</span>
            <span className="rich-row-sub">{t.cat} · {t.date}</span>
          </div>
          <span className={`rich-row-amount ${t.amount > 0 ? 'amount--pos' : 'amount--neg'}`}>
            {t.amount > 0 ? '+' : ''}${Math.abs(t.amount).toFixed(2)}
          </span>
        </div>
      ))}
    </div>
  )
}

function HoldingsCard() {
  const total = DATA.holdings.reduce((s, h) => s + h.value, 0)
  return (
    <div className="rich-card">
      <div className="rich-card-total">
        <span className="rich-card-total-label">Portfolio Value</span>
        <span className="rich-card-total-value">${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
      </div>
      <div className="rich-bar-chart">
        {DATA.holdings.map(h => (
          <div key={h.symbol} className="rich-bar-item" title={h.name}>
            <div className="rich-bar-fill" style={{ height: `${(h.value / total) * 80 + 20}%`, background: h.color }} />
            <span className="rich-bar-label">{h.symbol}</span>
          </div>
        ))}
      </div>
      {DATA.holdings.map(h => (
        <div key={h.symbol} className="rich-row">
          <span className="rich-row-dot" style={{ background: h.color }} />
          <div className="rich-row-info">
            <span className="rich-row-title">{h.symbol}</span>
            <span className="rich-row-sub">{h.name}</span>
          </div>
          <div className="rich-row-right">
            <span className="rich-row-value">${h.value.toLocaleString()}</span>
            <span className={`rich-row-badge ${h.gain >= 0 ? 'badge--up' : 'badge--down'}`}>
              +{h.pct}%
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

function LoansCard() {
  return (
    <div className="rich-card">
      {DATA.loans.map(l => (
        <div key={l.name} className="rich-loan-item">
          <div className="rich-loan-header">
            <span className="rich-row-title">{l.name}</span>
            <span className="rich-row-value">${l.remaining.toLocaleString()}</span>
          </div>
          <div className="rich-loan-meta">
            <span>{l.rate} APR</span>
            <span>Due {l.due}</span>
          </div>
          <div className="rich-progress-track">
            <div className="rich-progress-fill" style={{ width: `${l.pct}%`, background: l.color }} />
          </div>
          <div className="rich-progress-label">
            <span>{l.pct}% paid off</span>
            <span>${l.total.toLocaleString()} total</span>
          </div>
        </div>
      ))}
    </div>
  )
}

function GoalsCard() {
  return (
    <div className="rich-card">
      {DATA.goals.map(g => {
        const pct = Math.round((g.saved / g.target) * 100)
        return (
          <div key={g.name} className="rich-loan-item">
            <div className="rich-loan-header">
              <span className="rich-row-title">{g.name}</span>
              <span className="rich-row-value">{pct}%</span>
            </div>
            <div className="rich-progress-track">
              <div className="rich-progress-fill" style={{ width: `${pct}%`, background: g.color }} />
            </div>
            <div className="rich-progress-label">
              <span>${g.saved.toLocaleString()} saved</span>
              <span>Goal: ${g.target.toLocaleString()}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function CardsCard() {
  return (
    <div className="rich-card">
      {DATA.cards.map(c => {
        const usedPct = Math.round((c.used / c.limit) * 100)
        return (
          <div key={c.name} className="rich-loan-item">
            <div className="rich-loan-header">
              <span className="rich-row-title">{c.name}</span>
              <span className={`status-chip status-chip--${c.status === 'Active' ? 'green' : 'red'}`}>{c.status}</span>
            </div>
            <div className="rich-loan-meta">
              <span>{c.number}</span>
              <span>${c.used.toLocaleString()} / ${c.limit.toLocaleString()}</span>
            </div>
            <div className="rich-progress-track">
              <div className="rich-progress-fill" style={{ width: `${usedPct}%`, background: c.color }} />
            </div>
            <div className="rich-progress-label">
              <span>{usedPct}% used</span>
              <span>${(c.limit - c.used).toLocaleString()} available</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function SecurityCard() {
  const s = DATA.security
  const radius = 28
  const circ = 2 * Math.PI * radius
  const dash = (s.score / 100) * circ
  return (
    <div className="rich-card">
      <div className="rich-security">
        <div className="rich-score-ring">
          <svg width="72" height="72" viewBox="0 0 72 72">
            <circle cx="36" cy="36" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="6" />
            <circle cx="36" cy="36" r={radius} fill="none"
              stroke={s.score >= 80 ? '#10b981' : s.score >= 60 ? '#f59e0b' : '#ef4444'}
              strokeWidth="6" strokeDasharray={`${dash} ${circ}`}
              strokeLinecap="round"
              style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}
            />
          </svg>
          <div className="rich-score-center">
            <span>{s.score}</span>
            <small>/100</small>
          </div>
        </div>
        <div className="rich-score-items">
          {s.items.map((item, i) => (
            <div key={i} className={`rich-score-item ${item.includes('✅') ? 'score-ok' : 'score-warn'}`}>{item}</div>
          ))}
        </div>
      </div>
    </div>
  )
}

function SpendingCard() {
  return (
    <div className="rich-card">
      <div className="rich-spending-bar">
        {DATA.spending.map(s => (
          <div key={s.cat} className="rich-seg" style={{ width: `${s.pct}%`, background: s.color }} title={`${s.cat}: ${s.pct}%`} />
        ))}
      </div>
      {DATA.spending.map(s => (
        <div key={s.cat} className="rich-row">
          <span className="rich-row-dot" style={{ background: s.color }} />
          <span className="rich-row-title" style={{ flex: 1 }}>{s.cat}</span>
          <span className="rich-row-sub" style={{ marginRight: 8 }}>${s.amt}/mo</span>
          <span className="rich-row-badge badge--neutral">{s.pct}%</span>
        </div>
      ))}
    </div>
  )
}

function RichCard({ type }) {
  switch (type) {
    case 'accounts':     return <AccountsCard />
    case 'transactions': return <TransactionsCard />
    case 'holdings':     return <HoldingsCard />
    case 'loans':        return <LoansCard />
    case 'goals':        return <GoalsCard />
    case 'cards':        return <CardsCard />
    case 'security':     return <SecurityCard />
    case 'spending':     return <SpendingCard />
    default:             return null
  }
}

// ─── Message renderers ────────────────────────────────────────────────────────
function renderText(text) {
  return text.split(/\*\*(.*?)\*\*/g).map((part, i) =>
    i % 2 === 1
      ? <strong key={i}>{part}</strong>
      : part.split('\n').map((line, j, arr) => (
          <React.Fragment key={`${i}-${j}`}>{line}{j < arr.length - 1 && <br />}</React.Fragment>
        ))
  )
}

function BotMessage({ msg, onAction, onSuggestion, isLast }) {
  return (
    <div className="chat-msg chat-msg--bot">
      <div className="chat-avatar-wrap">
        <div className="chat-avatar">{BOT_ICON}</div>
      </div>
      <div className="chat-body">
        <div className="chat-bubble chat-bubble--bot">
          <p className="chat-text">{renderText(msg.text)}</p>
          {msg.card && <RichCard type={msg.card.type} />}
          {msg.actions?.length > 0 && (
            <div className="chat-actions">
              {msg.actions.map((a, i) => (
                <button key={i} className="chat-action-btn" onClick={() => onAction(a.path)}>{a.label}</button>
              ))}
            </div>
          )}
        </div>
        {isLast && msg.suggestions?.length > 0 && (
          <div className="chat-suggestions">
            {msg.suggestions.map((s, i) => (
              <button key={i} className="suggestion-chip" onClick={() => onSuggestion(s)}>{s}</button>
            ))}
          </div>
        )}
        <span className="chat-time">{msg.time}</span>
      </div>
    </div>
  )
}

function UserMessage({ text, time }) {
  return (
    <div className="chat-msg chat-msg--user">
      <div className="chat-body chat-body--user">
        <div className="chat-bubble chat-bubble--user">{text}</div>
        <span className="chat-time chat-time--user">{time}</span>
      </div>
    </div>
  )
}

function getTime() {
  return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ChatBot() {
  const [open,       setOpen]       = useState(false)
  const [minimized,  setMinimized]  = useState(false)
  const [messages,   setMessages]   = useState([{
    type: 'bot', id: 'welcome',
    text: `Hi! I'm **Nova**, your NovaBanc AI assistant. 👋\n\nI can help with balances, transactions, investments, transfers, security and more.\n\nHow can I help you today?`,
    card: null, actions: [],
    suggestions: ['What is my balance?', 'Show my transactions', 'How is my portfolio?'],
    time: getTime(),
  }])
  const [input,      setInput]      = useState('')
  const [typing,     setTyping]     = useState(false)
  const [unread,     setUnread]     = useState(1)
  const [lastIntent, setLastIntent] = useState(null)
  const [listening,  setListening]  = useState(false)

  const bottomRef  = useRef(null)
  const inputRef   = useRef(null)
  const recognRef  = useRef(null)
  const navigate   = useNavigate()
  const location   = useLocation()

  const pageQuickReplies = PAGE_QUICK_REPLIES[location.pathname] || DEFAULT_QUICK_REPLIES

  useEffect(() => {
    if (open && !minimized) {
      setUnread(0)
      setTimeout(() => inputRef.current?.focus(), 120)
    }
  }, [open, minimized])

  useEffect(() => {
    if (!minimized) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typing, minimized])

  const send = useCallback((text) => {
    const trimmed = text.trim()
    if (!trimmed) return
    const time = getTime()
    setMessages(prev => [...prev, { type: 'user', text: trimmed, time }])
    setInput('')
    setTyping(true)

    const response = getResponse(trimmed, lastIntent)
    const delay = Math.min(400 + (response.text?.length || 0) * 6, 1400)

    setTimeout(() => {
      setLastIntent(response.id || null)
      setTyping(false)
      setMessages(prev => [...prev, { type: 'bot', ...response, time: getTime() }])
      if (!open) setUnread(n => n + 1)
    }, delay)
  }, [lastIntent, open])

  const handleAction = (path) => {
    navigate(path)
    setOpen(false)
    setMinimized(false)
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) }
  }

  const clearChat = () => {
    setMessages([{
      type: 'bot', id: 'welcome',
      text: `Chat cleared! How can I help you? 😊`,
      card: null, actions: [],
      suggestions: ['What is my balance?', 'Show transactions', 'Help'],
      time: getTime(),
    }])
    setLastIntent(null)
  }

  // Voice input
  const toggleVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { alert('Speech recognition is not supported in this browser.'); return }

    if (listening) {
      recognRef.current?.stop()
      setListening(false)
      return
    }
    const recog = new SR()
    recog.lang = 'en-US'
    recog.interimResults = false
    recog.onresult = (e) => {
      const transcript = e.results[0][0].transcript
      setInput(transcript)
      setListening(false)
    }
    recog.onerror = () => setListening(false)
    recog.onend   = () => setListening(false)
    recog.start()
    recognRef.current = recog
    setListening(true)
  }

  const quickReplyLabel = (label) => {
    const msg = QUICK_REPLY_TO_MSG[label] || label.replace(/^[^\s]+\s/, '')
    send(msg)
  }

  return (
    <>
      {/* FAB */}
      <button
        className={`chatbot-fab ${open ? 'chatbot-fab--open' : ''}`}
        onClick={() => { setOpen(o => !o); setMinimized(false) }}
        aria-label="Open Nova assistant"
      >
        <span className="chatbot-fab-icon">{open ? '✕' : BOT_ICON}</span>
        {!open && <span className="chatbot-fab-ring" />}
        {!open && unread > 0 && <span className="chatbot-badge">{unread}</span>}
      </button>

      {open && (
        <div className={`chatbot-window ${minimized ? 'chatbot-window--minimized' : ''}`}>
          {/* Header */}
          <div className="chatbot-header" onClick={() => minimized && setMinimized(false)}>
            <div className="chatbot-header-info">
              <div className="chatbot-header-avatar">
                <span>{BOT_ICON}</span>
                <span className="chatbot-online-dot" />
              </div>
              <div>
                <div className="chatbot-header-name">{BOT_NAME} <span className="header-ai-tag">AI</span></div>
                <div className="chatbot-header-status">
                  {typing ? '✦ typing...' : '● Online · NovaBanc Assistant'}
                </div>
              </div>
            </div>
            <div className="chatbot-header-btns">
              <button className="chatbot-hdr-btn" onClick={(e) => { e.stopPropagation(); setMinimized(m => !m) }} title={minimized ? 'Expand' : 'Minimize'}>
                {minimized ? '▲' : '▼'}
              </button>
              <button className="chatbot-hdr-btn" onClick={(e) => { e.stopPropagation(); clearChat() }} title="Clear chat">↺</button>
              <button className="chatbot-hdr-btn" onClick={(e) => { e.stopPropagation(); setOpen(false) }} title="Close">✕</button>
            </div>
          </div>

          {!minimized && (
            <>
              {/* Messages */}
              <div className="chatbot-messages">
                {messages.map((msg, i) =>
                  msg.type === 'bot'
                    ? <BotMessage key={i} msg={msg} onAction={handleAction} onSuggestion={send} isLast={i === messages.length - 1} />
                    : <UserMessage key={i} text={msg.text} time={msg.time} />
                )}
                {typing && (
                  <div className="chat-msg chat-msg--bot">
                    <div className="chat-avatar-wrap"><div className="chat-avatar">{BOT_ICON}</div></div>
                    <div className="chat-bubble chat-bubble--bot chat-typing">
                      <span /><span /><span />
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Page-aware quick replies */}
              <div className="chatbot-quick-replies">
                {pageQuickReplies.map((q, i) => (
                  <button key={i} className="quick-reply-btn" onClick={() => quickReplyLabel(q)}>{q}</button>
                ))}
              </div>

              {/* Input */}
              <div className="chatbot-input-row">
                <button
                  className={`chatbot-voice-btn ${listening ? 'chatbot-voice-btn--on' : ''}`}
                  onClick={toggleVoice}
                  title={listening ? 'Stop listening' : 'Voice input'}
                >
                  🎙
                </button>
                <input
                  ref={inputRef}
                  className="chatbot-input"
                  placeholder={listening ? 'Listening...' : 'Ask Nova anything...'}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  maxLength={400}
                />
                <button
                  className="chatbot-send-btn"
                  onClick={() => send(input)}
                  disabled={!input.trim()}
                  aria-label="Send"
                >
                  ↑
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  )
}
