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
    return null; // Handled by page.js
  }

  return (
    <div className="space-y-4">
      {/* Category-wise breakdown */}
      {Object.values(groupedExpenses).map(category => (
        <div key={category.id} className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-[0_2px_8px_rgb(0,0,0,0.02)] transition-all hover:shadow-[0_4px_12px_rgb(0,0,0,0.04)]">
          {/* Category Header */}
          <div
            className="flex items-center justify-between p-5 cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => toggleCategory(category.id)}
          >
            <div className="flex items-center space-x-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-sm"
                style={{ backgroundColor: `${category.color}15`, color: category.color }}
              >
                {category.icon}
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 text-lg">{category.name}</h3>
                <p className="text-sm font-medium text-gray-400">
                  {category.items.length} {category.items.length === 1 ? 'transaction' : 'transactions'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="font-semibold text-lg tracking-tight text-black">
                ₹{category.total.toFixed(2)}
              </span>
              <div className={`w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center transition-transform duration-200 ${expandedCategories[category.id] ? 'rotate-180' : ''}`}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
          </div>

          {/* Category Items */}
          {expandedCategories[category.id] && (
            <div className="border-t border-gray-100 bg-gray-50/50">
              {category.items.map((expense, idx) => (
                <div key={expense.id} className={`p-5 hover:bg-white transition-colors flex justify-between items-start gap-4 ${idx !== category.items.length - 1 ? 'border-b border-gray-100' : ''}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-semibold text-black">
                        ₹{Number(expense.amount).toFixed(2)}
                      </span>
                      {expense.description && (
                        <span className="text-sm text-gray-500 truncate">
                          {expense.description}
                        </span>
                      )}
                    </div>

                    {/* Custom fields */}
                    {expense.fields && Object.keys(expense.fields).length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {Object.entries(expense.fields).map(([key, value]) => (
                          <div key={key} className="inline-flex text-xs bg-white border border-gray-200 px-2 py-1 rounded-md text-gray-600">
                            <span className="font-medium mr-1">{key}:</span> {String(value)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      if (window.confirm('Delete this expense?')) {
                        onDelete(expense.id)
                      }
                    }}
                    className="text-gray-400 hover:text-red-500 flex-shrink-0 p-2 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete expense"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Grand Total Section */}
      <div className="mt-8 p-6 bg-black text-white rounded-3xl overflow-hidden relative">
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-[--color-brand-green] opacity-20 blur-3xl rounded-full"></div>
        <div className="relative z-10">
          <div className="flex justify-between items-center mb-4">
            <span className="font-medium text-gray-300">Grand Total</span>
            <span className="text-3xl font-semibold tracking-tight">
              ₹{grandTotal.toFixed(2)}
            </span>
          </div>

          {/* Category totals summary */}
          {Object.values(groupedExpenses).length > 0 && (
            <div className="pt-4 border-t border-gray-800">
              <div className="flex flex-wrap gap-3">
                {Object.values(groupedExpenses).map(category => (
                  <div key={category.id} className="flex items-center text-sm bg-gray-900 border border-gray-800 px-3 py-1.5 rounded-lg text-gray-300">
                    <span className="mr-2 text-base">{category.icon}</span>
                    <span className="mr-2">{category.name}</span>
                    <span className="font-medium text-white">₹{category.total.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}