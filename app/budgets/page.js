'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { getUserCategories } from '@/utils/categories'
import { 
  ArrowTrendingUpIcon as TrendingUpIcon, 
  ArrowTrendingDownIcon as TrendingDownIcon,
  CurrencyRupeeIcon,
  ExclamationCircleIcon as ExclamationIcon,
  CheckCircleIcon,
  PencilIcon,
  DocumentCheckIcon as SaveIcon,
  XMarkIcon as XIcon
} from '@heroicons/react/24/outline'

export default function BudgetsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [categories, setCategories] = useState([])
  const [budgets, setBudgets] = useState([])
  const [spending, setSpending] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [overallBudget, setOverallBudget] = useState(0)
  const [editingOverall, setEditingOverall] = useState(false)
  const [tempOverallBudget, setTempOverallBudget] = useState('')
  const [categoryBudgets, setCategoryBudgets] = useState({})
  const [editingCategory, setEditingCategory] = useState(null)
  const [tempCategoryBudget, setTempCategoryBudget] = useState('')
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7))

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (session?.user?.id) {
      loadData()
    }
  }, [session, status, router, selectedMonth])

  const loadData = async () => {
    setLoading(true)
    try {
      // Load categories
      const catResult = await getUserCategories(session.user.id)
      if (catResult.success) {
        setCategories(catResult.data)
      }

      // Load user preferences (for overall budget)
      const prefsResponse = await fetch('/api/user/preferences')
      const prefsData = await prefsResponse.json()
      if (prefsData.success) {
        setOverallBudget(prefsData.data?.monthly_budget_total || 0)
      }

      // Load category budgets
      const budgetsResponse = await fetch('/api/budgets')
      const budgetsData = await budgetsResponse.json()
      
      if (Array.isArray(budgetsData)) {
        setBudgets(budgetsData)
        
        // Map category budgets
        const budgetMap = {}
        budgetsData.forEach(budget => {
          budgetMap[budget.category_id] = budget.monthly_limit
        })
        setCategoryBudgets(budgetMap)
      }

      // Load spending data
      await loadSpendingData()
    } catch (error) {
      console.error('Error loading data:', error)
      setMessage({ type: 'error', text: 'Failed to load data' })
    } finally {
      setLoading(false)
    }
  }

  const loadSpendingData = async () => {
    try {
      const [year, month] = selectedMonth.split('-')
      const response = await fetch(`/api/expenses/monthly?year=${year}&month=${month}`)
      const data = await response.json()
      if (data.success) {
        setSpending(data.spending || {})
      }
    } catch (error) {
      console.error('Error loading spending:', error)
      setSpending({})
    }
  }

  const handleSaveOverallBudget = async () => {
    if (!tempOverallBudget || isNaN(tempOverallBudget) || tempOverallBudget < 0) {
      setMessage({ type: 'error', text: 'Please enter a valid amount' })
      return
    }

    setSaving(true)
    try {
      const response = await fetch('/api/user/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          monthly_budget_total: parseFloat(tempOverallBudget),
          budget_month: selectedMonth + '-01'
        })
      })

      const data = await response.json()
      if (data.success) {
        setOverallBudget(parseFloat(tempOverallBudget))
        setEditingOverall(false)
        setMessage({ type: 'success', text: 'Overall budget updated!' })
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update budget' })
    } finally {
      setSaving(false)
      setTimeout(() => setMessage({ type: '', text: '' }), 3000)
    }
  }

  const handleSaveCategoryBudget = async (categoryId) => {
    if (!tempCategoryBudget || isNaN(tempCategoryBudget) || tempCategoryBudget < 0) {
      setMessage({ type: 'error', text: 'Please enter a valid amount' })
      return
    }

    // Check if category budget exceeds overall budget
    const currentTotal = Object.values(categoryBudgets).reduce((sum, val) => sum + val, 0)
    const newTotal = currentTotal - (categoryBudgets[categoryId] || 0) + parseFloat(tempCategoryBudget)
    
    if (overallBudget > 0 && newTotal > overallBudget) {
      setMessage({ type: 'error', text: 'Category budgets cannot exceed overall budget' })
      return
    }

    setSaving(true)
    try {
      const response = await fetch('/api/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category_id: categoryId,
          monthly_limit: parseFloat(tempCategoryBudget)
        })
      })

      if (!response.ok) throw new Error('Failed to save budget')
      
      const savedBudget = await response.json()
      
      setCategoryBudgets(prev => ({
        ...prev,
        [categoryId]: parseFloat(tempCategoryBudget)
      }))
      
      setBudgets(prev => {
        const existing = prev.find(b => b.category_id === categoryId)
        if (existing) {
          return prev.map(b => b.category_id === categoryId ? savedBudget : b)
        } else {
          return [...prev, savedBudget]
        }
      })

      setEditingCategory(null)
      setMessage({ type: 'success', text: 'Category budget saved!' })
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save budget' })
    } finally {
      setSaving(false)
      setTimeout(() => setMessage({ type: '', text: '' }), 3000)
    }
  }

  const calculateTotals = () => {
    const totalCategoryBudget = Object.values(categoryBudgets).reduce((sum, val) => sum + val, 0)
    const totalSpent = Object.values(spending).reduce((sum, val) => sum + val, 0)
    const remainingOverall = overallBudget - totalSpent
    const remainingCategories = totalCategoryBudget - totalSpent
    
    return {
      totalCategoryBudget,
      totalSpent,
      remainingOverall,
      remainingCategories,
      percentOverall: overallBudget > 0 ? (totalSpent / overallBudget) * 100 : 0,
      percentCategories: totalCategoryBudget > 0 ? (totalSpent / totalCategoryBudget) * 100 : 0
    }
  }

  const totals = calculateTotals()

  if (status === 'loading' || loading) {
    return (
      <>
        <Navbar />
        <div className="max-w-7xl mx-auto p-4 text-center">Loading...</div>
      </>
    )
  }

  return (
    <>
      <Navbar />
      <div className="max-w-7xl mx-auto p-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Budget Planning</h1>
          
          {/* Month Selector */}
          <div className="flex items-center space-x-4 mb-6">
            <label className="text-sm font-medium text-gray-700">Select Month:</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {message.text && (
            <div className={`mb-4 p-3 rounded ${
              message.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
            }`}>
              {message.text}
            </div>
          )}
        </div>

        {/* Overall Budget Card */}
        <div className="mb-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl shadow-lg overflow-hidden">
          <div className="p-6 text-white">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-semibold mb-1">Overall Monthly Budget</h2>
                <p className="text-blue-100 text-sm">Total spending limit for all categories</p>
              </div>
              {!editingOverall ? (
                <button
                  onClick={() => {
                    setTempOverallBudget(overallBudget.toString())
                    setEditingOverall(true)
                  }}
                  className="p-2 hover:bg-white/20 rounded-full transition"
                >
                  <PencilIcon className="w-5 h-5" />
                </button>
              ) : (
                <button
                  onClick={() => setEditingOverall(false)}
                  className="p-2 hover:bg-white/20 rounded-full transition"
                >
                  <XIcon className="w-5 h-5" />
                </button>
              )}
            </div>

            {editingOverall ? (
              <div className="flex items-center space-x-2">
                <span className="text-2xl">₹</span>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={tempOverallBudget}
                  onChange={(e) => setTempOverallBudget(e.target.value)}
                  className="flex-1 px-4 py-2 text-gray-900 rounded-lg"
                  placeholder="Enter total budget"
                  autoFocus
                />
                <button
                  onClick={handleSaveOverallBudget}
                  disabled={saving}
                  className="px-6 py-2 bg-white text-blue-600 rounded-lg font-medium hover:bg-blue-50 transition disabled:opacity-50"
                >
                  <SaveIcon className="w-5 h-5 inline mr-1" />
                  Save
                </button>
              </div>
            ) : (
              <div className="flex items-baseline space-x-2">
                <span className="text-4xl font-bold">₹{overallBudget.toLocaleString()}</span>
                {overallBudget === 0 && (
                  <span className="text-sm text-blue-200">(Click pencil to set budget)</span>
                )}
              </div>
            )}
          </div>

          {/* Overall Progress Bar */}
          {overallBudget > 0 && (
            <div className="bg-white/10 px-6 py-4">
              <div className="flex justify-between text-sm mb-1">
                <span>Spent: ₹{totals.totalSpent.toLocaleString()}</span>
                <span>Remaining: ₹{Math.max(0, totals.remainingOverall).toLocaleString()}</span>
                <span>{totals.percentOverall.toFixed(1)}% used</span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all ${
                    totals.percentOverall > 100 ? 'bg-red-400' :
                    totals.percentOverall > 80 ? 'bg-yellow-400' : 'bg-green-400'
                  }`}
                  style={{ width: `${Math.min(totals.percentOverall, 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Category Budgets Grid */}
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Category Budgets</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map(category => {
            const categoryBudget = categoryBudgets[category.id] || 0
            const spent = spending[category.id] || 0
            const percentUsed = categoryBudget > 0 ? (spent / categoryBudget) * 100 : 0
            const remaining = categoryBudget - spent
            const isEditing = editingCategory === category.id

            return (
              <div key={category.id} className="bg-white rounded-xl shadow-sm hover:shadow-md transition">
                <div className="p-5">
                  {/* Category Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div 
                        className="w-12 h-12 rounded-full flex items-center justify-center text-2xl text-white"
                        style={{ backgroundColor: category.color || '#3B82F6' }}
                      >
                        {category.icon || '📝'}
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{category.name}</h3>
                        <p className="text-sm text-gray-500">{category.category_fields?.length || 0} fields</p>
                      </div>
                    </div>
                    {!isEditing ? (
                      <button
                        onClick={() => {
                          setTempCategoryBudget(categoryBudget.toString())
                          setEditingCategory(category.id)
                        }}
                        className="p-2 hover:bg-gray-100 rounded-full transition"
                      >
                        <PencilIcon className="w-4 h-4 text-gray-500" />
                      </button>
                    ) : (
                      <button
                        onClick={() => setEditingCategory(null)}
                        className="p-2 hover:bg-gray-100 rounded-full transition"
                      >
                        <XIcon className="w-4 h-4 text-red-500" />
                      </button>
                    )}
                  </div>

                  {/* Budget Input or Display */}
                  {isEditing ? (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Monthly Budget
                      </label>
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-500">₹</span>
                        <input
                          type="number"
                          min="0"
                          step="100"
                          value={tempCategoryBudget}
                          onChange={(e) => setTempCategoryBudget(e.target.value)}
                          className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                          autoFocus
                        />
                        <button
                          onClick={() => handleSaveCategoryBudget(category.id)}
                          disabled={saving}
                          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition disabled:bg-gray-300"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mb-4">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">Budget</span>
                        <span className="font-semibold">
                          ₹{categoryBudget > 0 ? categoryBudget.toLocaleString() : 'Not set'}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Progress Bar */}
                  {categoryBudget > 0 && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Spent: ₹{spent.toLocaleString()}</span>
                        <span className={remaining < 0 ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}>
                          {remaining < 0 ? 'Overspent' : 'Left'}: ₹{Math.abs(remaining).toLocaleString()}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            percentUsed > 100 ? 'bg-red-500' :
                            percentUsed > 80 ? 'bg-yellow-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(percentUsed, 100)}%` }}
                        />
                      </div>
                      <div className="text-xs text-gray-500 text-right">
                        {percentUsed.toFixed(1)}% used
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Summary Section */}
        <div className="mt-8 bg-gray-50 rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4">Budget Summary</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <div className="text-sm text-gray-600 mb-1">Total Category Budgets</div>
              <div className="text-2xl font-bold text-blue-600">₹{totals.totalCategoryBudget.toLocaleString()}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <div className="text-sm text-gray-600 mb-1">Total Spent</div>
              <div className="text-2xl font-bold text-orange-600">₹{totals.totalSpent.toLocaleString()}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <div className="text-sm text-gray-600 mb-1">Remaining</div>
              <div className="text-2xl font-bold text-green-600">₹{Math.max(0, totals.remainingOverall).toLocaleString()}</div>
            </div>
          </div>
          
          {/* Validation Warning */}
          {overallBudget > 0 && totals.totalCategoryBudget > overallBudget && (
            <div className="mt-4 p-3 bg-yellow-100 text-yellow-800 rounded-lg">
              ⚠️ Your category budgets (₹{totals.totalCategoryBudget.toLocaleString()}) exceed your overall budget (₹{overallBudget.toLocaleString()}). 
              Consider reducing category budgets to stay within your overall limit.
            </div>
          )}
        </div>

        {/* Tips Card */}
        <div className="mt-6 bg-blue-50 rounded-lg p-4">
          <h3 className="font-semibold text-blue-800 mb-2">💡 Budgeting Tips</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Set an overall budget first, then allocate to categories</li>
            <li>• Category budgets should not exceed your overall budget</li>
            <li>• Track your spending regularly to stay on target</li>
            <li>• Adjust budgets monthly based on your actual needs</li>
          </ul>
        </div>
      </div>
    </>
  )
}