'use client'

import { useState, useEffect } from 'react'

export default function ExpenseForm({ categories, onSave }) {
  const [selectedCategory, setSelectedCategory] = useState('')
  const [description, setDescription] = useState('')
  const [fieldValues, setFieldValues] = useState({})
  const [calculatedTotal, setCalculatedTotal] = useState(0)
  const [loading, setLoading] = useState(false)

  const selectedCategoryData = categories.find(c => c.id === selectedCategory)

  // Calculate total whenever field values change
  useEffect(() => {
    if (!selectedCategoryData) return

    let total = 0
    
    switch (selectedCategoryData.calculation_type) {
      case 'sum':
        // Sum all number fields
        total = Object.entries(fieldValues).reduce((sum, [key, value]) => {
          const numValue = parseFloat(value) || 0
          return sum + numValue
        }, 0)
        break
        
      case 'product':
        // Multiply all number fields
        total = Object.entries(fieldValues).reduce((product, [key, value]) => {
          const numValue = parseFloat(value) || 1
          return product * numValue
        }, 1)
        break
        
      default:
        total = 0
    }
    
    setCalculatedTotal(total)
  }, [fieldValues, selectedCategoryData])

  const handleFieldChange = (fieldName, value) => {
    setFieldValues(prev => ({
      ...prev,
      [fieldName]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!selectedCategory) {
      alert('Please select a category')
      return
    }

    // Validate required fields
    const missingFields = selectedCategoryData.category_fields?.filter(
      field => field.is_required && !fieldValues[field.field_name]
    )

    if (missingFields?.length > 0) {
      alert(`Please fill in: ${missingFields.map(f => f.field_name).join(', ')}`)
      return
    }

    setLoading(true)
    
    await onSave({
      category_id: selectedCategory,
      amount: calculatedTotal, // Use calculated total instead of separate amount field
      description,
      fields: fieldValues,
      date: new Date().toISOString().split('T')[0]
    })

    // Reset form
    setFieldValues({})
    setDescription('')
    setSelectedCategory('')
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-4">
      {/* Category Selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Category *</label>
        <div className="grid grid-cols-2 gap-2">
          {categories.map(cat => (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                setSelectedCategory(cat.id)
                setFieldValues({})
              }}
              className={`p-3 border rounded-lg flex flex-col items-center transition ${
                selectedCategory === cat.id 
                  ? 'border-2 border-blue-500 bg-blue-50' 
                  : 'hover:bg-gray-50'
              }`}
              style={{ borderColor: selectedCategory === cat.id ? cat.color : '#e5e7eb' }}
            >
              <span className="text-2xl mb-1">{cat.icon}</span>
              <span className="text-sm font-medium">{cat.name}</span>
            </button>
          ))}
        </div>
      </div>

      {selectedCategoryData && (
        <>
          {/* Dynamic Fields */}
          <div className="mb-4 space-y-3">
            <h3 className="font-medium text-sm text-gray-700">
              Enter {selectedCategoryData.name} Details
            </h3>
            
            {selectedCategoryData.category_fields?.map((field, index) => (
              <div key={index}>
                <label className="block text-sm font-medium mb-1">
                  {field.field_name} {field.is_required && '*'}
                </label>
                
                {field.field_type === 'number' && (
                  <input
                    type="number"
                    step="0.01"
                    value={fieldValues[field.field_name] || ''}
                    onChange={(e) => handleFieldChange(field.field_name, e.target.value)}
                    className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                    placeholder={`Enter ${field.field_name}`}
                    required={field.is_required}
                  />
                )}

                {field.field_type === 'text' && (
                  <input
                    type="text"
                    value={fieldValues[field.field_name] || ''}
                    onChange={(e) => handleFieldChange(field.field_name, e.target.value)}
                    className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                    placeholder={`Enter ${field.field_name}`}
                    required={field.is_required}
                  />
                )}

                {field.field_type === 'select' && (
                  <select
                    value={fieldValues[field.field_name] || ''}
                    onChange={(e) => handleFieldChange(field.field_name, e.target.value)}
                    className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                    required={field.is_required}
                  >
                    <option value="">Select...</option>
                    {field.options?.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                )}
              </div>
            ))}
          </div>

          {/* Calculated Total Display */}
          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">Total:</span>
              <span className="text-xl font-bold text-blue-600">
                ₹{calculatedTotal.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Description (optional) */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Description (Optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-2 border rounded"
              rows="2"
              placeholder="Add notes about this expense..."
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 transition disabled:bg-blue-300"
          >
            {loading ? 'Adding...' : 'Add Expense'}
          </button>
        </>
      )}
    </form>
  )
}