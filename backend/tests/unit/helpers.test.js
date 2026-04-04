const { generateAccountNumber, maskAccountNumber, generateReference, omit } = require('../../src/utils/helpers')

describe('Helpers', () => {
  test('generateAccountNumber returns 16-digit string', () => {
    const num = generateAccountNumber()
    expect(num).toMatch(/^\d{16}$/)
  })

  test('maskAccountNumber shows only last 4 digits', () => {
    expect(maskAccountNumber('1234567890123456')).toBe('****3456')
  })

  test('generateReference starts with prefix', () => {
    const ref = generateReference('TXN')
    expect(ref).toMatch(/^TXN/)
    expect(ref.length).toBeGreaterThan(6)
  })

  test('omit removes specified keys', () => {
    const obj = { a: 1, b: 2, c: 3 }
    expect(omit(obj, ['b'])).toEqual({ a: 1, c: 3 })
    expect(omit(obj, ['a', 'c'])).toEqual({ b: 2 })
  })
})
