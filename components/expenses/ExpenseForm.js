'use client'

import { useState, useEffect } from 'react'

export default function ExpenseForm({ categories, onSave }) {
  const [selectedCategory, setSelectedCategory] = useState('')
  const [description, setDescription] = useState('')
  const [fieldValues, setFieldValues] = useState({})
  const [calculatedTotal, setCalculatedTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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

  const handleFieldChange = (fieldName, value, fieldType) => {
    // Validate based on field type
    if (fieldType === 'number' && value !== '') {
      const numValue = parseFloat(value)
      if (isNaN(numValue) || numValue < 0) {
        setError(`${fieldName} must be a positive number`)
        return
      }
    }

    setError('')
    setFieldValues(prev => ({
      ...prev,
      [fieldName]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!selectedCategory) {
      setError('Please select a category')
      return
    }

    // Validate required fields
    const missingFields = selectedCategoryData.category_fields?.filter(
      field => field.is_required && !fieldValues[field.field_name]
    )

    if (missingFields?.length > 0) {
      setError(`Please fill in: ${missingFields.map(f => f.field_name).join(', ')}`)
      return
    }

    // Validate total
    if (calculatedTotal <= 0) {
      setError('Total amount must be greater than 0')
      return
    }

    setLoading(true)

    try {
      await onSave({
        category_id: selectedCategory,
        amount: calculatedTotal,
        description: description.trim(),
        fields: fieldValues,
        date: new Date().toISOString().split('T')[0]
      })

      // Reset form on success
      setFieldValues({})
      setDescription('')
      setSelectedCategory('')
      setError('')
    } catch (err) {
      setError('Failed to save expense. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {/* Category Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">Select Category</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {categories.map(cat => (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                setSelectedCategory(cat.id)
                setFieldValues({})
                setError('')
              }}
              className={`p-4 border rounded-2xl flex flex-col items-center justify-center transition-all duration-200 ${selectedCategory === cat.id
                  ? 'border-black bg-white shadow-sm scale-100 ring-1 ring-black'
                  : 'bg-white border-gray-100 hover:border-gray-300 hover:bg-gray-50 scale-95 opacity-80 hover:opacity-100'
                }`}
            >
              <span className="text-3xl mb-2">{cat.icon}</span>
              <span className="text-xs font-semibold text-gray-800 tracking-wide text-center">{cat.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium border border-red-100">
          {error}
        </div>
      )}

      {selectedCategoryData && (
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-5 animate-in fade-in slide-in-from-top-4 duration-300">
          <h3 className="font-semibold text-gray-900 border-b border-gray-100 pb-3">
            {selectedCategoryData.name} Details
          </h3>

          {/* Dynamic Fields */}
          <div className="space-y-4">
            {selectedCategoryData.category_fields?.map((field, index) => (
              <div key={index}>
                <label className="block text-sm font-medium text-gray-600 mb-1.5 flex justify-between">
                  <span>{field.field_name}</span>
                  {field.is_required && <span className="text-red-400">*</span>}
                </label>

                {field.field_type === 'number' && (
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={fieldValues[field.field_name] || ''}
                    onChange={(e) => handleFieldChange(
                      field.field_name,
                      e.target.value,
                      field.field_type
                    )}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[--color-brand-green] focus:bg-white transition-all sm:text-sm"
                    placeholder={`0.00`}
                    required={field.is_required}
                  />
                )}

                {field.field_type === 'text' && (
                  <input
                    type="text"
                    value={fieldValues[field.field_name] || ''}
                    onChange={(e) => handleFieldChange(field.field_name, e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[--color-brand-green] focus:bg-white transition-all sm:text-sm"
                    placeholder={`Enter ${field.field_name.toLowerCase()}`}
                    required={field.is_required}
                    maxLength="100"
                  />
                )}

                {field.field_type === 'select' && (
                  <select
                    value={fieldValues[field.field_name] || ''}
                    onChange={(e) => handleFieldChange(field.field_name, e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[--color-brand-green] focus:bg-white transition-all sm:text-sm appearance-none"
                    required={field.is_required}
                  >
                    <option value="">Select option...</option>
                    {field.options?.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                )}
              </div>
            ))}
          </div>

          {/* Description (optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">Description <span className="text-gray-400 font-normal shadow-none">(Optional)</span></label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[--color-brand-green] focus:bg-white transition-all sm:text-sm resize-none"
              rows="2"
              placeholder="Add notes..."
              maxLength="200"
            />
          </div>

          {/* Calculated Total Display */}
          {calculatedTotal > 0 && (
            <div className="pt-4 border-t border-gray-100 flex justify-between items-end">
              <span className="text-sm font-medium text-gray-500">Calculated Total</span>
              <span className="text-2xl font-bold tracking-tight text-black">
                ₹{calculatedTotal.toFixed(2)}
              </span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || calculatedTotal <= 0}
            className="w-full bg-[--color-brand-green] hover:bg-[--color-brand-green-hover] text-black font-semibold py-3.5 px-4 rounded-xl transition-colors disabled:opacity-50 disabled:bg-gray-200 disabled:text-gray-400 mt-2 text-sm"
          >
            {loading ? 'Adding Expense...' : 'Add Expense'}
          </button>
        </div>
      )}
    </form>
  )
} 