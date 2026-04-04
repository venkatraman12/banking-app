"use strict";

require("dotenv").config();
const Anthropic = require("@anthropic-ai/sdk");

const client = new Anthropic.default();

// --- Mock banking data ---

const accounts = {
  ACC001: { id: "ACC001", owner: "Alice Johnson", balance: 12450.75, type: "Checking" },
  ACC002: { id: "ACC002", owner: "Alice Johnson", balance: 38200.00, type: "Savings" },
  ACC003: { id: "ACC003", owner: "Bob Smith",    balance: 5300.50,  type: "Checking" },
};

const transactions = {
  ACC001: [
    { id: "TXN001", date: "2026-03-14", description: "Grocery Store",   amount: -85.42,  balance: 12450.75 },
    { id: "TXN002", date: "2026-03-13", description: "Direct Deposit",  amount: 2500.00, balance: 12536.17 },
    { id: "TXN003", date: "2026-03-12", description: "Electric Bill",   amount: -120.00, balance: 10036.17 },
    { id: "TXN004", date: "2026-03-10", description: "Coffee Shop",     amount: -6.50,   balance: 10156.17 },
  ],
  ACC002: [
    { id: "TXN005", date: "2026-03-01", description: "Interest Credit", amount: 95.50,  balance: 38200.00 },
    { id: "TXN006", date: "2026-02-15", description: "Transfer In",     amount: 5000.00, balance: 38104.50 },
  ],
  ACC003: [
    { id: "TXN007", date: "2026-03-15", description: "ATM Withdrawal",  amount: -200.00, balance: 5300.50 },
    { id: "TXN008", date: "2026-03-10", description: "Payroll",         amount: 1800.00, balance: 5500.50 },
  ],
};

const loans = {
  LOAN001: {
    id: "LOAN001",
    accountId: "ACC001",
    type: "Personal",
    principal: 15000.00,
    outstanding: 9842.33,
    interestRate: 7.5,
    monthlyPayment: 312.50,
    nextPaymentDate: "2026-04-01",
    status: "Active",
  },
  LOAN002: {
    id: "LOAN002",
    accountId: "ACC002",
    type: "Home",
    principal: 320000.00,
    outstanding: 285600.00,
    interestRate: 3.8,
    monthlyPayment: 1492.00,
    nextPaymentDate: "2026-04-05",
    status: "Active",
  },
};

// --- Tool implementations ---

function getAccountBalance({ account_id }) {
  const account = accounts[account_id];
  if (!account) {
    return { error: `Account ${account_id} not found` };
  }
  return {
    account_id: account.id,
    owner: account.owner,
    type: account.type,
    balance: account.balance,
    currency: "USD",
  };
}

function getTransactions({ account_id, limit = 5 }) {
  const account = accounts[account_id];
  if (!account) {
    return { error: `Account ${account_id} not found` };
  }
  const txns = (transactions[account_id] || []).slice(0, limit);
  return { account_id, transactions: txns, count: txns.length };
}

function transferFunds({ from_account_id, to_account_id, amount, description = "Transfer" }) {
  const from = accounts[from_account_id];
  const to = accounts[to_account_id];

  if (!from) return { error: `Source account ${from_account_id} not found` };
  if (!to)   return { error: `Destination account ${to_account_id} not found` };
  if (amount <= 0) return { error: "Transfer amount must be positive" };
  if (from.balance < amount) return { error: "Insufficient funds" };

  from.balance -= amount;
  to.balance   += amount;

  const txnId = `TXN${String(Date.now()).slice(-6)}`;
  const date = new Date().toISOString().split("T")[0];

  return {
    transaction_id: txnId,
    from_account_id,
    to_account_id,
    amount,
    description,
    date,
    from_balance_after: from.balance,
    to_balance_after: to.balance,
    status: "Completed",
  };
}

function getLoanStatus({ loan_id }) {
  const loan = loans[loan_id];
  if (!loan) {
    // Try to find loans by account id
    const byAccount = Object.values(loans).filter(l => l.accountId === loan_id);
    if (byAccount.length > 0) {
      return { loans: byAccount };
    }
    return { error: `Loan ${loan_id} not found` };
  }
  return loan;
}

// --- Tool definitions ---

const tools = [
  {
    name: "get_account_balance",
    description: "Get the current balance and details for a bank account.",
    input_schema: {
      type: "object",
      properties: {
        account_id: {
          type: "string",
          description: "The account ID (e.g. ACC001)",
        },
      },
      required: ["account_id"],
    },
  },
  {
    name: "get_transactions",
    description: "Get recent transaction history for a bank account.",
    input_schema: {
      type: "object",
      properties: {
        account_id: {
          type: "string",
          description: "The account ID to fetch transactions for",
        },
        limit: {
          type: "integer",
          description: "Number of transactions to return (default 5)",
        },
      },
      required: ["account_id"],
    },
  },
  {
    name: "transfer_funds",
    description: "Transfer money between two bank accounts.",
    input_schema: {
      type: "object",
      properties: {
        from_account_id: { type: "string", description: "Source account ID" },
        to_account_id:   { type: "string", description: "Destination account ID" },
        amount:          { type: "number",  description: "Amount to transfer in USD" },
        description:     { type: "string",  description: "Optional transfer description" },
      },
      required: ["from_account_id", "to_account_id", "amount"],
    },
  },
  {
    name: "get_loan_status",
    description: "Get the status and details of a loan by loan ID or account ID.",
    input_schema: {
      type: "object",
      properties: {
        loan_id: {
          type: "string",
          description: "The loan ID (e.g. LOAN001) or account ID to look up associated loans",
        },
      },
      required: ["loan_id"],
    },
  },
];

// --- Tool dispatcher ---

function executeTool(name, input) {
  switch (name) {
    case "get_account_balance": return getAccountBalance(input);
    case "get_transactions":    return getTransactions(input);
    case "transfer_funds":      return transferFunds(input);
    case "get_loan_status":     return getLoanStatus(input);
    default:                    return { error: `Unknown tool: ${name}` };
  }
}

// --- Agentic loop ---

async function bankingAgent(userMessage) {
  console.log(`\nUser: ${userMessage}\n`);

  const messages = [{ role: "user", content: userMessage }];

  while (true) {
    const response = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 4096,
      system: `You are a helpful NovaBanc banking assistant.
You have access to tools to check balances, view transactions, transfer funds, and look up loan status.
Available accounts: ACC001 (Alice - Checking), ACC002 (Alice - Savings), ACC003 (Bob - Checking).
Available loans: LOAN001 (Personal), LOAN002 (Home).
Always be concise and format currency values with $ and two decimal places.`,
      tools,
      messages,
    });

    if (response.stop_reason === "end_turn") {
      const text = response.content.find(b => b.type === "text");
      if (text) console.log(`Assistant: ${text.text}`);
      break;
    }

    // Append assistant response
    messages.push({ role: "assistant", content: response.content });

    // Execute tool calls
    const toolResults = [];
    for (const block of response.content) {
      if (block.type === "tool_use") {
        console.log(`  [tool] ${block.name}(${JSON.stringify(block.input)})`);
        const result = executeTool(block.name, block.input);
        console.log(`  [result] ${JSON.stringify(result)}\n`);
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: JSON.stringify(result),
        });
      }
    }

    messages.push({ role: "user", content: toolResults });
  }
}

// --- Demo ---

async function main() {
  await bankingAgent(
    "What's the balance on ACC001? Also show me the last 3 transactions and any loans on that account."
  );

  await bankingAgent(
    "Transfer $500 from ACC001 to ACC002 with the description 'Monthly savings transfer', then confirm the new balances."
  );
}

main().catch(console.error);
