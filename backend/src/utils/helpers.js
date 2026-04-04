const crypto = require('crypto')

const generateAccountNumber = () =>
  Array.from({ length: 4 }, () => Math.floor(1000 + Math.random() * 9000)).join('')

const generateReference = (prefix = 'TXN') =>
  `${prefix}${Date.now()}${crypto.randomBytes(4).toString('hex').toUpperCase()}`

const maskAccountNumber = (number) =>
  `****${String(number).slice(-4)}`

const formatCurrency = (amount, currency = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount)

const omit = (obj, keys) =>
  Object.fromEntries(Object.entries(obj).filter(([k]) => !keys.includes(k)))

module.exports = { generateAccountNumber, generateReference, maskAccountNumber, formatCurrency, omit }
