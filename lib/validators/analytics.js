export const validateDateRange = (startDate, endDate) => {
  const errors = []
  
  if (!startDate || !isValidDate(startDate)) {
    errors.push({ field: 'startDate', message: 'Valid start date is required (YYYY-MM-DD)' })
  }
  
  if (!endDate || !isValidDate(endDate)) {
    errors.push({ field: 'endDate', message: 'Valid end date is required (YYYY-MM-DD)' })
  }
  
  if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
    errors.push({ field: 'dateRange', message: 'Start date must be before end date' })
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    data: {
      startDate,
      endDate
    }
  }
}

export const validateMonth = (month) => {
  const errors = []
  
  if (!month || !isValidMonthFormat(month)) {
    errors.push({ field: 'month', message: 'Valid month is required (YYYY-MM)' })
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    data: { month }
  }
}

// Helper functions
function isValidDate(dateString) {
  const regex = /^\d{4}-\d{2}-\d{2}$/
  if (!regex.test(dateString)) return false
  const date = new Date(dateString)
  return date instanceof Date && !isNaN(date)
}

function isValidMonthFormat(monthString) {
  const regex = /^\d{4}-\d{2}$/
  return regex.test(monthString)
}