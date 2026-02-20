'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import CategoryManager from '@/components/categories/CategoryManager'
import ExpenseForm from '@/components/expenses/ExpenseForm'
import ExpenseList from '@/components/expenses/ExpenseList'
import { getUserCategories } from '@/utils/categories'
import { getTodayExpenses, saveExpense, deleteExpense } from '@/utils/expenses'
import PDFButton from '@/components/pdf/PDFButton'


export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  const [categories, setCategories] = useState([])
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCategoryManager, setShowCategoryManager] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

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
      }

      // Load today's expenses
      const expResult = await getTodayExpenses(session.user.id)
      if (expResult.success) {
        setExpenses(expResult.data)
      }
    } catch (error) {
      console.error('Error loading data:', error)
      showMessage('error', 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleAddExpense = async (expenseData) => {
    const result = await saveExpense(session.user.id, expenseData)
    
    if (result.success) {
      showMessage('success', 'Expense added successfully!')
      // Reload expenses
      const expResult = await getTodayExpenses(session.user.id)
      if (expResult.success) {
        setExpenses(expResult.data)
      }
    } else {
      showMessage('error', result.error || 'Failed to add expense')
    }
  }

  const handleDeleteExpense = async (expenseId) => {
    if (!confirm('Are you sure you want to delete this expense?')) return
    
    const result = await deleteExpense(expenseId)
    
    if (result.success) {
      showMessage('success', 'Expense deleted')
      setExpenses(expenses.filter(e => e.id !== expenseId))
    } else {
      showMessage('error', result.error || 'Failed to delete expense')
    }
  }

  const showMessage = (type, text) => {
    setMessage({ type, text })
    setTimeout(() => setMessage({ type: '', text: '' }), 3000)
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
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">My Expenses</h1>
          <button
            onClick={() => setShowCategoryManager(!showCategoryManager)}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition"
          >
            {showCategoryManager ? '← Back to Expenses' : 'Manage Categories'}
          </button>
        </div>

        {/* Message */}
        {message.text && (
          <div className={`p-3 mb-4 rounded ${
            message.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
          }`}>
            {message.text}
          </div>
        )}

        {showCategoryManager ? (
          // Category Manager View
          <CategoryManager 
            categories={categories}
            onUpdate={loadData}
            userId={session.user.id}
          />
        ) : (
          // Expenses View
          <div className="grid md:grid-cols-2 gap-6">
            {/* Left Column - Add Expense */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Add Expense</h2>
              <ExpenseForm 
                categories={categories}
                onSave={handleAddExpense}
              />
            </div>

            {/* Right Column - Today's Expenses */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Today's Expenses</h2>
              <ExpenseList 
                expenses={expenses}
                onDelete={handleDeleteExpense}
              />
              
              {/* Daily Total */}
            </div>
          </div>
        )}
      </div>
    </>
  )
}