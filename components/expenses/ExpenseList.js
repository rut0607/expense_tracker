'use client'

import { useState } from 'react'

export default function ExpenseList({ expenses, onDelete }) {
  const [expandedCategories, setExpandedCategories] = useState({})

  // Group expenses by category
  const groupedExpenses = expenses.reduce((groups, expense) => {
    const categoryId = expense.categories?.id || expense.category_id || 'uncategorized'
    const categoryName = expense.categories?.name || expense.category_name || 'Uncategorized'
    const categoryIcon = expense.categories?.icon || expense.category_icon || '📝'
    const categoryColor = expense.categories?.color || expense.category_color || '#3B82F6'
    
    if (!groups[categoryId]) {
      groups[categoryId] = {
        id: categoryId,
        name: categoryName,
        icon: categoryIcon,
        color: categoryColor,
        items: [],
        total: 0
      }
    }
    
    groups[categoryId].items.push(expense)
    groups[categoryId].total += Number(expense.amount) || 0
    return groups
  }, {})

  // Calculate grand total
  const grandTotal = Object.values(groupedExpenses).reduce(
    (sum, category) => sum + category.total, 0
  )

  const toggleCategory = (categoryId) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }))
  }

  if (expenses.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg p-8 text-center text-gray-500">
        <p className="mb-2">No expenses added today</p>
        <p className="text-sm">Add your first expense using the form</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Category-wise breakdown */}
      {Object.values(groupedExpenses).map(category => (
        <div key={category.id} className="bg-white shadow rounded-lg overflow-hidden">
          {/* Category Header */}
          <div 
            className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition"
            onClick={() => toggleCategory(category.id)}
            style={{ borderLeft: `4px solid ${category.color}` }}
          >
            <div className="flex items-center space-x-3">
              <span className="text-2xl">{category.icon}</span>
              <div>
                <h3 className="font-semibold text-lg">{category.name}</h3>
                <p className="text-sm text-gray-500">
                  {category.items.length} {category.items.length === 1 ? 'item' : 'items'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="font-bold text-xl" style={{ color: category.color }}>
                ₹{category.total.toFixed(2)}
              </span>
              <span className="text-gray-400 text-xl transform transition-transform duration-200">
                {expandedCategories[category.id] ? '▼' : '▶'}
              </span>
            </div>
          </div>

          {/* Category Items */}
          {expandedCategories[category.id] && (
            <div className="border-t divide-y divide-gray-100">
              {category.items.map(expense => (
                <div key={expense.id} className="p-4 hover:bg-gray-50 transition">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      {/* Amount and delete button */}
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-bold text-blue-600">
                          ₹{Number(expense.amount).toFixed(2)}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            if (window.confirm('Are you sure you want to delete this expense?')) {
                              onDelete(expense.id)
                            }
                          }}
                          className="text-red-500 hover:text-red-600 text-sm px-2 py-1 rounded hover:bg-red-50 transition"
                        >
                          ✕ Remove
                        </button>
                      </div>
                      
                      {/* Description */}
                      {expense.description && (
                        <p className="text-sm text-gray-600 mb-2 italic">
                          "{expense.description}"
                        </p>
                      )}
                      
                      {/* Custom fields */}
                      {expense.fields && Object.keys(expense.fields).length > 0 && (
                        <div className="grid grid-cols-2 gap-2 text-sm bg-gray-50 p-3 rounded-lg">
                          {Object.entries(expense.fields).map(([key, value]) => (
                            <div key={key}>
                              <span className="font-medium text-gray-600">{key}:</span>{' '}
                              <span className="text-gray-800">{String(value)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Grand Total Section */}
      <div className="mt-6 p-5 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border border-blue-200">
        <div className="flex justify-between items-center mb-3">
          <span className="font-semibold text-lg">Grand Total:</span>
          <span className="text-2xl font-bold text-blue-600">
            ₹{grandTotal.toFixed(2)}
          </span>
        </div>
        
        {/* Category totals summary */}
        {Object.values(groupedExpenses).length > 0 && (
          <div className="pt-3 border-t border-blue-200">
            <p className="text-sm font-medium text-gray-600 mb-2">Category Breakdown:</p>
            <div className="grid grid-cols-2 gap-2">
              {Object.values(groupedExpenses).map(category => (
                <div key={category.id} className="flex justify-between items-center text-sm">
                  <span className="flex items-center space-x-1">
                    <span>{category.icon}</span>
                    <span className="text-gray-600">{category.name}:</span>
                  </span>
                  <span className="font-medium" style={{ color: category.color }}>
                    ₹{category.total.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}