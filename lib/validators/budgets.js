export const validateBudget = (data) => {
  const errors = []
  
  // Check category_id
  if (!data.category_id) {
    errors.push({ field: 'category_id', message: 'Category ID is required' })
  } else if (!isValidUUID(data.category_id)) {
    errors.push({ field: 'category_id', message: 'Invalid category ID format' })
  }
  
  // Check monthly_limit
  if (!data.monthly_limit && data.monthly_limit !== 0) {
    errors.push({ field: 'monthly_limit', message: 'Monthly limit is required' })
  } else if (typeof data.monthly_limit !== 'number' || data.monthly_limit < 0) {
    errors.push({ field: 'monthly_limit', message: 'Monthly limit must be a positive number' })
  }
  
  // Check month
  if (!data.month) {
    errors.push({ field: 'month', message: 'Month is required' })
  } else if (!isValidMonthFormat(data.month)) {
    errors.push({ field: 'month', message: 'Month must be in YYYY-MM-DD format (e.g., 2024-03-01)' })
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    data: {
      category_id: data.category_id,
      monthly_limit: data.monthly_limit,
      month: data.month || getCurrentMonth(),
      ...data
    }
  }
}

export const validateBudgetUpdate = (data) => {
  const errors = []
  
  if (data.monthly_limit !== undefined && (typeof data.monthly_limit !== 'number' || data.monthly_limit < 0)) {
    errors.push({ field: 'monthly_limit', message: 'Monthly limit must be a positive number' })
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    data
  }
}

// Helper functions
function isValidUUID(uuid) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

function isValidMonthFormat(dateString) {
  const regex = /^\d{4}-\d{2}-\d{2}$/
  if (!regex.test(dateString)) return false
  
  const date = new Date(dateString)
  return date instanceof Date && !isNaN(date) && dateString.endsWith('01')
}

function getCurrentMonth() {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`
}