export const validateCategory = (data) => {
  const errors = []
  
  // Name is required
  if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
    errors.push({ field: 'name', message: 'Category name is required' })
  } else if (data.name.length > 50) {
    errors.push({ field: 'name', message: 'Category name must be less than 50 characters' })
  }
  
  // Icon is optional but should be a string
  if (data.icon && typeof data.icon !== 'string') {
    errors.push({ field: 'icon', message: 'Icon must be a string' })
  }
  
  // Color should be a valid hex color
  if (data.color && !isValidHexColor(data.color)) {
    errors.push({ field: 'color', message: 'Color must be a valid hex code (e.g., #3B82F6)' })
  }
  
  // Order should be a number
  if (data.order !== undefined && typeof data.order !== 'number') {
    errors.push({ field: 'order', message: 'Order must be a number' })
  }
  
  // Calculation type should be valid
  if (data.calculation_type && !['sum', 'average', 'count', 'custom'].includes(data.calculation_type)) {
    errors.push({ field: 'calculation_type', message: 'Invalid calculation type' })
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    data: {
      name: data.name?.trim(),
      icon: data.icon || '📦',
      color: data.color || '#3B82F6',
      order: data.order || 0,
      is_active: data.is_active !== undefined ? data.is_active : true,
      calculation_type: data.calculation_type || 'sum',
      calculation_formula: data.calculation_formula || null,
      ...data
    }
  }
}

export const validateCategoryField = (data) => {
  const errors = []
  
  if (!data.field_name || typeof data.field_name !== 'string' || data.field_name.trim().length === 0) {
    errors.push({ field: 'field_name', message: 'Field name is required' })
  }
  
  if (!data.field_type || !['number', 'text', 'select', 'boolean', 'date'].includes(data.field_type)) {
    errors.push({ field: 'field_type', message: 'Invalid field type' })
  }
  
  if (data.field_type === 'select' && (!data.options || !Array.isArray(data.options))) {
    errors.push({ field: 'options', message: 'Select fields require options array' })
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    data
  }
}

// Helper function
function isValidHexColor(color) {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color)
}