const request = require('supertest')
const app = require('../../src/app')
const prisma = require('../../src/config/database')

// Note: Integration tests require a running PostgreSQL database.
// Set TEST_DATABASE_URL in your environment or skip with: jest --testPathIgnorePatterns=integration

beforeAll(async () => {
  // Clean up test data before running
  await prisma.$connect().catch(() => {})
})

afterAll(async () => {
  await prisma.$disconnect().catch(() => {})
})

describe('POST /api/v1/auth/register', () => {
  const testEmail = `test_${Date.now()}@novabanc.com`

  it('creates a new user and returns tokens', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      email: testEmail,
      password: 'SecurePass123',
      firstName: 'Test',
      lastName: 'User',
    })
    expect(res.statusCode).toBe(201)
    expect(res.body.success).toBe(true)
    expect(res.body.data).toHaveProperty('accessToken')
    expect(res.body.data).toHaveProperty('user')
    expect(res.body.data.user.email).toBe(testEmail)
  })

  it('rejects duplicate email with 409', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      email: testEmail,
      password: 'SecurePass123',
      firstName: 'Test',
      lastName: 'User',
    })
    expect(res.statusCode).toBe(409)
  })

  it('rejects invalid email format', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      email: 'not-an-email',
      password: 'SecurePass123',
      firstName: 'Test',
      lastName: 'User',
    })
    expect(res.statusCode).toBe(400)
    expect(res.body.errors).toBeDefined()
  })
})

describe('POST /api/v1/auth/login', () => {
  it('rejects wrong credentials', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email: 'nobody@novabanc.com',
      password: 'wrongpassword',
    })
    expect(res.statusCode).toBe(401)
  })
})

describe('GET /api/v1/health', () => {
  it('returns health status', async () => {
    const res = await request(app).get('/api/v1/health')
    expect(res.statusCode).toBe(200)
    expect(res.body.status).toBe('ok')
  })
})
