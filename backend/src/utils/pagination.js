const paginate = (query = {}) => {
  const page  = Math.max(1, parseInt(query.page,  10) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20))
  const skip  = (page - 1) * limit
  return { page, limit, skip }
}

const paginatedResponse = (data, total, page, limit) => ({
  data,
  pagination: {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    hasNext: page * limit < total,
    hasPrev: page > 1,
  },
})

module.exports = { paginate, paginatedResponse }
