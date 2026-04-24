/**
 * Generates a styled HTML receipt and triggers a browser download.
 * @param {Object} data - Receipt fields
 * @param {string} data.type        - 'Transfer' | 'Payment'
 * @param {string} data.reference   - Transaction reference number
 * @param {string} data.from        - Sender account / name
 * @param {string} data.to          - Recipient account / name
 * @param {string|number} data.amount
 * @param {string} [data.note]
 * @param {string} [data.scheduled] - Scheduled date string if applicable
 * @param {string} [data.fee]       - e.g. 'Free'
 */
export function downloadReceipt(data) {
  const now = new Date()
  const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  const rows = [
    { label: 'Transaction Type', value: data.type },
    { label: 'Reference',        value: data.reference },
    { label: 'Date',             value: dateStr },
    { label: 'Time',             value: timeStr },
    { label: 'From',             value: data.from },
    { label: 'To',               value: data.to },
    data.note      ? { label: 'Note',      value: data.note }      : null,
    data.scheduled ? { label: 'Scheduled', value: data.scheduled } : null,
    { label: 'Fee',    value: data.fee || 'Free' },
    { label: 'Status', value: 'Completed' },
  ].filter(Boolean)

  const rowsHtml = rows.map(r => `
    <tr>
      <td class="label">${r.label}</td>
      <td class="value">${r.value}</td>
    </tr>`).join('')

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>NovaBank Receipt — ${data.reference}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      background: #f0f4f8;
      display: flex; justify-content: center; padding: 40px 16px;
      color: #1e293b;
    }
    .receipt {
      background: white; border-radius: 16px;
      box-shadow: 0 4px 32px rgba(0,0,0,0.12);
      width: 100%; max-width: 480px; overflow: hidden;
    }
    .receipt-header {
      background: linear-gradient(135deg, #0f172a, #1a56db);
      color: white; padding: 32px 28px; text-align: center;
    }
    .brand { font-size: 24px; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 16px; }
    .brand span { color: #60a5fa; }
    .success-circle {
      width: 64px; height: 64px; border-radius: 50%;
      background: rgba(255,255,255,0.15); border: 2px solid rgba(255,255,255,0.3);
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 16px; font-size: 28px;
    }
    .receipt-header h1 { font-size: 20px; font-weight: 700; margin-bottom: 4px; }
    .receipt-header p { font-size: 13px; color: rgba(255,255,255,0.65); }
    .amount-block {
      text-align: center; padding: 28px;
      border-bottom: 1px dashed #e2e8f0;
    }
    .amount-label { font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
    .amount-value { font-size: 44px; font-weight: 800; color: #1e293b; letter-spacing: -2px; }
    .amount-currency { font-size: 20px; font-weight: 600; color: #64748b; vertical-align: top; margin-top: 8px; margin-right: 2px; }
    table { width: 100%; border-collapse: collapse; }
    tr { border-bottom: 1px solid #f1f5f9; }
    tr:last-child { border-bottom: none; }
    td { padding: 13px 28px; font-size: 14px; }
    td.label { color: #64748b; font-weight: 500; width: 40%; }
    td.value { color: #1e293b; font-weight: 600; text-align: right; }
    .status-badge {
      display: inline-block; padding: 3px 10px;
      background: #d1fae5; color: #065f46;
      border-radius: 99px; font-size: 12px; font-weight: 700;
    }
    .receipt-footer {
      background: #f8fafc; padding: 20px 28px; text-align: center;
      border-top: 1px solid #e2e8f0;
    }
    .receipt-footer p { font-size: 12px; color: #94a3b8; line-height: 1.6; }
    .receipt-footer strong { color: #475569; }
    @media print {
      body { background: white; padding: 0; }
      .receipt { box-shadow: none; border-radius: 0; max-width: 100%; }
    }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="receipt-header">
      <div class="brand">Nova<span>Banc</span></div>
      <div class="success-circle">✓</div>
      <h1>${data.type} Receipt</h1>
      <p>Transaction completed successfully</p>
    </div>

    <div class="amount-block">
      <div class="amount-label">Amount</div>
      <div class="amount-value"><span class="amount-currency">$</span>${Number(data.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
    </div>

    <table>
      ${rows.map(r => `
      <tr>
        <td class="label">${r.label}</td>
        <td class="value">${r.label === 'Status' ? `<span class="status-badge">${r.value}</span>` : r.value}</td>
      </tr>`).join('')}
    </table>

    <div class="receipt-footer">
      <p>
        <strong>NovaBank Financial Services</strong><br />
        This is an official transaction receipt. Please retain for your records.<br />
        For support, contact us at support@novabank.com
      </p>
    </div>
  </div>
</body>
</html>`

  const blob = new Blob([html], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `NovaBank_Receipt_${data.reference}.html`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
