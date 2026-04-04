// Client-side validation matching backend Zod schemas

export function validateEmail(email) {
  if (!email) return 'Email is required'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Invalid email address'
  return null
}

export function validatePassword(password, minLength = 8) {
  if (!password) return 'Password is required'
  if (password.length < minLength) return `Password must be at least ${minLength} characters`
  return null
}

export function validateAmount(amount) {
  if (amount === '' || amount === null || amount === undefined) return 'Amount is required'
  const num = Number(amount)
  if (isNaN(num)) return 'Amount must be a number'
  if (num <= 0) return 'Amount must be greater than zero'
  if (num > 1_000_000) return 'Amount cannot exceed $1,000,000'
  return null
}

export function validateAmountVsBalance(amount, balance) {
  const err = validateAmount(amount)
  if (err) return err
  if (Number(amount) > balance) return 'Amount exceeds available balance'
  return null
}

export function validateRequired(value, label = 'This field') {
  if (!value || !String(value).trim()) return `${label} is required`
  return null
}

export function validateMaxLength(value, max, label = 'This field') {
  if (value && String(value).length > max) return `${label} cannot exceed ${max} characters`
  return null
}

export function validateScheduledDate(dateStr) {
  if (!dateStr) return 'Scheduled date is required'
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return 'Invalid date'
  if (date <= new Date()) return 'Scheduled date must be in the future'
  return null
}

// Validate a payment form — mirrors backend paymentSchema
export function validatePaymentForm(form) {
  const errors = {}

  const recipientErr = validateRequired(form.recipient, 'Recipient')
  if (recipientErr) errors.recipient = recipientErr
  else {
    const lenErr = validateMaxLength(form.recipient, 255, 'Recipient')
    if (lenErr) errors.recipient = lenErr
  }

  const accountErr = validateRequired(form.account, 'Account')
  if (accountErr) errors.account = accountErr

  const amountErr = validateAmount(form.amount)
  if (amountErr) errors.amount = amountErr

  if (form.note) {
    const noteErr = validateMaxLength(form.note, 255, 'Note')
    if (noteErr) errors.note = noteErr
  }

  return errors
}

// Validate a transfer form — mirrors backend transferSchema
export function validateTransferForm(form, fromAccount) {
  const errors = {}

  const fromErr = validateRequired(form.from, 'From account')
  if (fromErr) errors.from = fromErr

  const amountErr = fromAccount
    ? validateAmountVsBalance(form.amount, fromAccount.balance)
    : validateAmount(form.amount)
  if (amountErr) errors.amount = amountErr

  if (form.note) {
    const noteErr = validateMaxLength(form.note, 255, 'Note')
    if (noteErr) errors.note = noteErr
  }

  if (form.scheduled) {
    const dateErr = validateScheduledDate(form.schedDate)
    if (dateErr) errors.schedDate = dateErr
  }

  return errors
}
