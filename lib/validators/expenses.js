// Simple validation functions (no Zod dependency)
export const validateExpense = (data) => {
  const errors = []
  
  if (!data.amount || typeof data.amount !== 'number' || data.amount <= 0) {
    errors.push({ field: 'amount', message: 'Amount must be a positive number' })
  }
  
  if (!data.category_id || !isValidUUID(data.category_id)) {
    errors.push({ field: 'category_id', message: 'Valid category ID is required' })
  }
  
  if (!data.description || typeof data.description !== 'string' || data.description.trim().length === 0) {
    errors.push({ field: 'description', message: 'Description is required' })
  }
  
  if (data.expense_date && !isValidDate(data.expense_date)) {
    errors.push({ field: 'expense_date', message: 'Valid date is required' })
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    data: {
      amount: data.amount,
      category_id: data.category_id,
      description: data.description.trim(),
      expense_date: data.expense_date || new Date().toISOString().split('T')[0],
      fields: data.fields || {}
    }
  }
}

export const validateBudget = (data) => {
  const errors = []
  
  if (!data.category_id || !isValidUUID(data.category_id)) {
    errors.push({ field: 'category_id', message: 'Valid category ID is required' })
  }
  
  if (!data.monthly_limit || typeof data.monthly_limit !== 'number' || data.monthly_limit <= 0) {
    errors.push({ field: 'monthly_limit', message: 'Monthly limit must be a positive number' })
  }
  
  if (!data.month || !isValidDateFormat(data.month)) {
    errors.push({ field: 'month', message: 'Valid month (YYYY-MM-DD) is required' })
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

// Helper functions
function isValidUUID(uuid) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

function isValidDate(dateString) {
  const date = new Date(dateString)
  return date instanceof Date && !isNaN(date)
}

function isValidDateFormat(dateString) {
  const regex = /^\d{4}-\d{2}-\d{2}$/
  return regex.test(dateString)
}