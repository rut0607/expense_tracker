'use client'

import { useState } from 'react'

const ICONS = [
  '🍔', '🚗', '🏠', '🛒', '💊', '🎬', '📚', '💻', 
  '✈️', '🏥', '💪', '🎮', '☕', '🍕', '👕', '📱'
]

const COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
  '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#06B6D4'
]

const CALCULATION_TYPES = [
  { value: 'sum', label: 'Sum of all fields' },
  { value: 'product', label: 'Multiply fields' },
  { value: 'custom', label: 'Custom calculation' }
]

export default function CategoryForm({ initialData, onSave, onCancel }) {
  const [category, setCategory] = useState({
    name: initialData?.name || '',
    icon: initialData?.icon || ICONS[0],
    color: initialData?.color || COLORS[0],
    calculation_type: initialData?.calculation_type || 'sum',
    calculation_formula: initialData?.calculation_formula || '',
    ...initialData
  })

  const [fields, setFields] = useState(
    initialData?.category_fields || [
      { field_name: '', field_type: 'number', is_required: true, order: 0 }
    ]
  )

  const addField = () => {
    setFields([
      ...fields,
      {
        field_name: '',
        field_type: 'number',
        is_required: true,
        order: fields.length
      }
    ])
  }

  const updateField = (index, updates) => {
    const newFields = [...fields]
    newFields[index] = { ...newFields[index], ...updates }
    setFields(newFields)
  }

  const removeField = (index) => {
    setFields(fields.filter((_, i) => i !== index))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!category.name) {
      alert('Category name is required')
      return
    }

    // Validate fields
    const validFields = fields.filter(f => f.field_name.trim() !== '')
    if (validFields.length === 0) {
      alert('Add at least one field')
      return
    }

    onSave(category, validFields)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Info */}
      <div>
        <label className="block text-sm font-medium mb-1">Category Name</label>
        <input
          type="text"
          value={category.name}
          onChange={(e) => setCategory({...category, name: e.target.value})}
          className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
          placeholder="e.g., Food, Transport, Entertainment"
          required
        />
      </div>

      {/* Icon Selector */}
      <div>
        <label className="block text-sm font-medium mb-2">Icon</label>
        <div className="grid grid-cols-8 gap-2">
          {ICONS.map(icon => (
            <button
              key={icon}
              type="button"
              onClick={() => setCategory({...category, icon})}
              className={`text-2xl p-2 rounded hover:bg-gray-100 ${
                category.icon === icon ? 'bg-blue-100 ring-2 ring-blue-500' : ''
              }`}
            >
              {icon}
            </button>
          ))}
        </div>
      </div>

      {/* Color Selector */}
      <div>
        <label className="block text-sm font-medium mb-2">Color</label>
        <div className="flex gap-2">
          {COLORS.map(color => (
            <button
              key={color}
              type="button"
              onClick={() => setCategory({...category, color})}
              className={`w-8 h-8 rounded-full ${
                category.color === color ? 'ring-2 ring-offset-2 ring-gray-400' : ''
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>

      {/* Calculation Type */}
      <div>
        <label className="block text-sm font-medium mb-2">How to calculate total?</label>
        <div className="space-y-2">
          {CALCULATION_TYPES.map(type => (
            <label key={type.value} className="flex items-center space-x-2 p-2 border rounded hover:bg-gray-50">
              <input
                type="radio"
                name="calculation_type"
                value={type.value}
                checked={category.calculation_type === type.value}
                onChange={(e) => setCategory({...category, calculation_type: e.target.value})}
                className="rounded"
              />
              <span className="text-sm">{type.label}</span>
            </label>
          ))}
        </div>
        
        {category.calculation_type === 'product' && (
          <p className="text-xs text-gray-500 mt-1">
            Example: liters × price = total
          </p>
        )}
        
        {category.calculation_type === 'custom' && (
          <div className="mt-2">
            <label className="block text-sm font-medium mb-1">Custom Formula</label>
            <input
              type="text"
              value={category.calculation_formula}
              onChange={(e) => setCategory({...category, calculation_formula: e.target.value})}
              placeholder="e.g., (liters * price) + tax"
              className="w-full p-2 border rounded text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Use field names in formula (coming soon)
            </p>
          </div>
        )}
      </div>

      {/* Custom Fields */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="block text-sm font-medium">Fields</label>
          <button
            type="button"
            onClick={addField}
            className="text-sm bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
          >
            + Add Field
          </button>
        </div>

        <div className="space-y-3">
          {fields.map((field, index) => (
            <div key={index} className="flex gap-2 items-start bg-gray-50 p-3 rounded">
              <div className="flex-1">
                <input
                  type="text"
                  value={field.field_name}
                  onChange={(e) => updateField(index, { field_name: e.target.value })}
                  placeholder="Field name (e.g., Breakfast, Liters, Quantity)"
                  className="w-full p-2 border rounded text-sm"
                  required
                />
              </div>
              
              <select
                value={field.field_type}
                onChange={(e) => updateField(index, { field_type: e.target.value })}
                className="w-24 p-2 border rounded text-sm"
              >
                <option value="number">Number</option>
                <option value="text">Text</option>
                <option value="select">Select</option>
              </select>

              <label className="flex items-center text-sm whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={field.is_required}
                  onChange={(e) => updateField(index, { is_required: e.target.checked })}
                  className="mr-1"
                />
                Required
              </label>

              <button
                type="button"
                onClick={() => removeField(index)}
                className="text-red-500 hover:text-red-600 text-sm px-2"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        {fields.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-4">
            Add fields to collect data for this category
          </p>
        )}
      </div>

      {/* Form Actions */}
      <div className="flex gap-2 pt-4">
        <button
          type="submit"
          className="flex-1 bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
        >
          Save Category
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 bg-gray-100 text-gray-700 py-2 rounded hover:bg-gray-200"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}