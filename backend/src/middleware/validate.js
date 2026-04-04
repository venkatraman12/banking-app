const { badRequest } = require('../utils/response')

const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body)
  if (!result.success) {
    const errors = result.error.errors.map(e => ({
      field: e.path.join('.'),
      message: e.message,
    }))
    return badRequest(res, 'Validation failed', errors)
  }
  req.body = result.data
  next()
}

module.exports = validate
