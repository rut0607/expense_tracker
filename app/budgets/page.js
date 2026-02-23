'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { getUserCategories } from '@/utils/categories'

export default function BudgetsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [categories, setCategories] = useState([])
  const [budgets, setBudgets] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [editingBudgets, setEditingBudgets] = useState({})

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (session?.user?.id) {
      loadData()
    }
  }, [session, status, router])

  const loadData = async () => {
    setLoading(true)
    try {
      // Load categories
      const catResult = await getUserCategories(session.user.id)
      if (catResult.success) {
        setCategories(catResult.data)
        
        // Initialize editing budgets with empty values
        const initialBudgets = {}
        catResult.data.forEach(cat => {
          initialBudgets[cat.id] = ''
        })
        setEditingBudgets(initialBudgets)
      }

      // Load existing budgets for current month
      const response = await fetch('/api/budgets')
      const data = await response.json()
      
      if (Array.isArray(data)) {
        setBudgets(data)
        
        // Populate editing budgets with existing values
        const budgetMap = {}
        data.forEach(budget => {
          budgetMap[budget.category_id] = budget.monthly_limit
        })
        setEditingBudgets(prev => ({ ...prev, ...budgetMap }))
      }
    } catch (error) {
      console.error('Error loading data:', error)
      setMessage({ type: 'error', text: 'Failed to load data' })
    } finally {
      setLoading(false)
    }
  }

  const handleBudgetChange = (categoryId, value) => {
    setEditingBudgets(prev => ({
      ...prev,
      [categoryId]: value
    }))
  }

  const handleSaveBudget = async (categoryId) => {
    const limit = editingBudgets[categoryId]
    if (!limit || isNaN(limit) || limit <= 0) {
      setMessage({ type: 'error', text: 'Please enter a valid amount' })
      return
    }

    setSaving(true)
    try {
      const response = await fetch('/api/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category_id: categoryId,
          monthly_limit: parseFloat(limit)
        })
      })

      if (!response.ok) throw new Error('Failed to save budget')
      
      const savedBudget = await response.json()
      
      // Update budgets list
      setBudgets(prev => {
        const existing = prev.find(b => b.category_id === categoryId)
        if (existing) {
          return prev.map(b => b.category_id === categoryId ? savedBudget : b)
        } else {
          return [...prev, savedBudget]
        }
      })

      setMessage({ type: 'success', text: 'Budget saved successfully!' })
      setTimeout(() => setMessage({ type: '', text: '' }), 3000)
    } catch (error) {
      console.error('Error saving budget:', error)
      setMessage({ type: 'error', text: 'Failed to save budget' })
    } finally {
      setSaving(false)
    }
  }

  const handleSaveAll = async () => {
    setSaving(true)
    let successCount = 0
    let errorCount = 0

    for (const category of categories) {
      const limit = editingBudgets[category.id]
      if (limit && !isNaN(limit) && limit > 0) {
        try {
          const response = await fetch('/api/budgets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              category_id: category.id,
              monthly_limit: parseFloat(limit)
            })
          })
          if (response.ok) {
            successCount++
            const savedBudget = await response.json()
            setBudgets(prev => {
              const existing = prev.find(b => b.category_id === category.id)
              if (existing) {
                return prev.map(b => b.category_id === category.id ? savedBudget : b)
              } else {
                return [...prev, savedBudget]
              }
            })
          } else {
            errorCount++
          }
        } catch {
          errorCount++
        }
      }
    }

    if (errorCount === 0) {
      setMessage({ type: 'success', text: `All budgets saved successfully!` })
    } else {
      setMessage({ type: 'warning', text: `${successCount} saved, ${errorCount} failed` })
    }
    setTimeout(() => setMessage({ type: '', text: '' }), 3000)
    setSaving(false)
  }

  // Calculate spending for each category (using insights data structure)
  const getCategorySpending = (categoryId) => {
    // This will be enhanced later when we connect to actual expense data
    return 0
  }

  if (status === 'loading' || loading) {
    return (
      <>
        <Navbar />
        <div className="max-w-4xl mx-auto p-4 text-center">Loading...</div>
      </>
    )
  }

  return (
    <>
      <Navbar />
      <div className="max-w-4xl mx-auto p-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Monthly Budgets</h1>
          <button
            onClick={handleSaveAll}
            disabled={saving}
            className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition disabled:bg-blue-300"
          >
            {saving ? 'Saving...' : 'Save All Changes'}
          </button>
        </div>

        {message.text && (
          <div className={`p-3 mb-4 rounded ${
            message.type === 'error' ? 'bg-red-100 text-red-700' : 
            message.type === 'warning' ? 'bg-yellow-100 text-yellow-700' :
            'bg-green-100 text-green-700'
          }`}>
            {message.text}
          </div>
        )}

        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-6 py-3 border-b">
            <div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-600">
              <div className="col-span-5">Category</div>
              <div className="col-span-3">Monthly Budget (₹)</div>
              <div className="col-span-2">Spent</div>
              <div className="col-span-2">Remaining</div>
            </div>
          </div>

          <div className="divide-y divide-gray-200">
            {categories.map(category => {
              const budget = budgets.find(b => b.category_id === category.id)
              const currentBudget = editingBudgets[category.id] || ''
              const spent = getCategorySpending(category.id)
              const remaining = (parseFloat(currentBudget) || 0) - spent
              const percentUsed = spent > 0 ? (spent / (parseFloat(currentBudget) || 1)) * 100 : 0

              return (
                <div key={category.id} className="px-6 py-4 hover:bg-gray-50 transition">
                  <div className="grid grid-cols-12 gap-4 items-center">
                    {/* Category Info */}
                    <div className="col-span-5 flex items-center space-x-3">
                      <div 
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white"
                        style={{ backgroundColor: category.color || '#3B82F6' }}
                      >
                        <span className="text-sm">{category.icon || '📝'}</span>
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">{category.name}</h3>
                        <p className="text-xs text-gray-500">{category.category_fields?.length || 0} fields</p>
                      </div>
                    </div>

                    {/* Budget Input */}
                    <div className="col-span-3">
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-500">₹</span>
                        <input
                          type="number"
                          min="0"
                          step="100"
                          value={currentBudget}
                          onChange={(e) => handleBudgetChange(category.id, e.target.value)}
                          placeholder="0"
                          className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          onClick={() => handleSaveBudget(category.id)}
                          disabled={saving || !editingBudgets[category.id]}
                          className="px-3 py-2 text-sm bg-green-500 text-white rounded hover:bg-green-600 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
                        >
                          Save
                        </button>
                      </div>
                    </div>

                    {/* Spent */}
                    <div className="col-span-2">
                      <span className="font-medium text-gray-900">₹{spent.toFixed(0)}</span>
                    </div>

                    {/* Remaining with Progress Bar */}
                    <div className="col-span-2">
                      <div className="space-y-1">
                        <span className={`font-medium ${
                          remaining < 0 ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {remaining < 0 ? '-' : ''}₹{Math.abs(remaining).toFixed(0)}
                        </span>
                        {currentBudget > 0 && (
                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full ${
                                percentUsed > 100 ? 'bg-red-500' : 
                                percentUsed > 80 ? 'bg-yellow-500' : 'bg-green-500'
                              }`}
                              style={{ width: `${Math.min(percentUsed, 100)}%` }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Quick Stats Row */}
                  {budget && (
                    <div className="mt-2 text-xs text-gray-500 grid grid-cols-12 gap-4">
                      <div className="col-span-5"></div>
                      <div className="col-span-3">
                        Current: ₹{budget.monthly_limit}
                      </div>
                      <div className="col-span-2">
                        {percentUsed > 0 && `${Math.round(percentUsed)}% used`}
                      </div>
                      <div className="col-span-2"></div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Summary Footer */}
          <div className="bg-gray-50 px-6 py-4 border-t">
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-5 font-medium">Total Monthly Budget</div>
              <div className="col-span-3 font-bold text-lg text-blue-600">
                ₹{Object.values(editingBudgets).reduce((sum, val) => sum + (parseFloat(val) || 0), 0).toFixed(0)}
              </div>
              <div className="col-span-2 text-gray-600">
                {categories.length} categories
              </div>
              <div className="col-span-2"></div>
            </div>
          </div>
        </div>

        {/* Info Card */}
        <div className="mt-6 bg-blue-50 rounded-lg p-4">
          <h3 className="font-semibold text-blue-800 mb-2">💡 About Budgets</h3>
          <p className="text-sm text-blue-700">
            Set monthly budgets for each category to get personalized insights and alerts. 
            Your Telegram bot will notify you when you're near or over budget, and provide 
            investment recommendations based on your savings.
          </p>
        </div>
      </div>
    </>
  )
}