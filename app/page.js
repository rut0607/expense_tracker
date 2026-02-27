'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import CategoryManager from '@/components/categories/CategoryManager'
import ExpenseForm from '@/components/expenses/ExpenseForm'
import ExpenseList from '@/components/expenses/ExpenseList'
import PendingTransactions from '@/components/expenses/PendingTransactions'
import SplitSummary from '@/components/splits/SplitSummary'
import { getUserCategories } from '@/utils/categories'
import { getTodayExpenses, saveExpense, deleteExpense } from '@/utils/expenses'
import PDFButton from '@/components/pdf/PDFButton'
import { EnvelopeIcon } from '@heroicons/react/24/outline'

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  const [categories, setCategories] = useState([])
  const [expenses, setExpenses] = useState([])
  const [pendingTransactions, setPendingTransactions] = useState([])
  const [splitSummary, setSplitSummary] = useState({ owed: 0, toCollect: 0 })
  const [loading, setLoading] = useState(true)
  const [showCategoryManager, setShowCategoryManager] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [groups, setGroups] = useState([])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (session?.user?.id) {
      loadData()
      loadPendingTransactions()
      loadSplitSummary()
      loadGroups()
    }
  }, [session, status, router])

  const loadData = async () => {
    setLoading(true)
    try {
      const catResult = await getUserCategories(session.user.id)
      if (catResult.success) {
        setCategories(catResult.data)
      }

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

  const loadPendingTransactions = async () => {
    try {
      const res = await fetch('/api/email/pending')
      const data = await res.json()
      if (data.success) {
        setPendingTransactions(data.transactions || [])
      }
    } catch (error) {
      console.error('Error loading pending transactions:', error)
    }
  }

  const loadSplitSummary = async () => {
    try {
      const res = await fetch('/api/splits/summary')
      const data = await res.json()
      if (data.success) {
        setSplitSummary(data.summary)
      }
    } catch (error) {
      console.error('Error loading split summary:', error)
    }
  }

  const loadGroups = async () => {
    try {
      const res = await fetch('/api/splits/groups')
      const data = await res.json()
      if (data.success) {
        setGroups(data.data || [])
      }
    } catch (error) {
      console.error('Error loading groups:', error)
    }
  }

  const handleAddExpense = async (expenseData) => {
    const result = await saveExpense(session.user.id, expenseData)
    
    if (result.success) {
      showMessage('success', 'Expense added successfully!')
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

  const handlePendingTransaction = async (transaction) => {
    if (transaction.action === 'add' && transaction.categoryId) {
      // Add expense with selected category
      await handleAddExpense({
        category_id: transaction.categoryId,
        amount: transaction.amount,
        description: transaction.description || transaction.merchant,
        fields: {},
        date: transaction.date
      })

      // Remove from pending
      await fetch('/api/email/pending', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: transaction.id })
      })

      setPendingTransactions(prev => prev.filter(t => t.id !== transaction.id))
      showMessage('success', `Added to ${transaction.categoryName || 'expenses'}`)
    
    } else if (transaction.action === 'ignore') {
      await fetch('/api/email/pending', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: transaction.id })
      })
      setPendingTransactions(prev => prev.filter(t => t.id !== transaction.id))
      showMessage('info', 'Transaction ignored')
    
    } else if (transaction.action === 'split') {
      try {
        const res = await fetch('/api/splits/expenses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transactionId: transaction.id,
            totalAmount: transaction.amount,
            myShare: transaction.splitDetails.myShare,
            groupId: transaction.splitDetails.groupId,
            friends: transaction.splitDetails.friends,
            description: transaction.description || transaction.merchant,
            merchant: transaction.merchant
          })
        })

        const data = await res.json()
        if (data.success) {
          showMessage('success', 'Split expense created!')
          
          // Remove from pending
          await fetch('/api/email/pending', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: transaction.id })
          })
          
          setPendingTransactions(prev => prev.filter(t => t.id !== transaction.id))
          loadSplitSummary() // Refresh split summary
        } else {
          showMessage('error', data.error || 'Failed to create split')
        }
      } catch (error) {
        console.error('Error creating split:', error)
        showMessage('error', 'Failed to create split')
      }
    }
  }

  const scanEmails = async () => {
    try {
      const res = await fetch('/api/email/scan', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        if (data.found > 0) {
          showMessage('success', `Found ${data.found} new transactions!`)
          loadPendingTransactions()
        } else {
          showMessage('success', 'No new transactions found')
        }
      } else {
        showMessage('error', data.error || 'Failed to scan emails')
      }
    } catch (error) {
      console.error('Error scanning emails:', error)
      showMessage('error', 'Failed to scan emails')
    }
  }

  const handleCategoryUpdate = () => {
    loadData()
    setShowCategoryManager(false)
  }

  const showMessage = (type, text) => {
    setMessage({ type, text })
    setTimeout(() => setMessage({ type: '', text: '' }), 3000)
  }

  const todayTotal = expenses.reduce((sum, e) => sum + (e.amount || 0), 0)

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
        {/* Header with PDF Button */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">My Expenses</h1>
          <div className="flex space-x-2">
            <button
              onClick={scanEmails}
              className="bg-green-500 text-white px-3 py-2 rounded hover:bg-green-600 transition flex items-center"
              title="Scan emails for transactions"
            >
              <EnvelopeIcon className="w-5 h-5 mr-1" />
              Scan
            </button>
            <PDFButton 
              expenses={expenses} 
              categories={categories}
              date={new Date().toISOString().split('T')[0]}
            />
            <button
              onClick={() => setShowCategoryManager(!showCategoryManager)}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition"
            >
              {showCategoryManager ? '← Back' : 'Manage Categories'}
            </button>
          </div>
        </div>

        {/* Split Summary Card */}
        {(splitSummary.owed > 0 || splitSummary.toCollect > 0) && (
          <div className="mb-4 grid grid-cols-2 gap-4">
            {splitSummary.owed > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <p className="text-sm text-orange-600 mb-1">You owe</p>
                <p className="text-2xl font-bold text-orange-600">₹{splitSummary.owed}</p>
              </div>
            )}
            {splitSummary.toCollect > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-600 mb-1">To collect</p>
                <p className="text-2xl font-bold text-green-600">₹{splitSummary.toCollect}</p>
              </div>
            )}
          </div>
        )}

        {/* Message */}
        {message.text && (
          <div className={`p-3 mb-4 rounded ${
            message.type === 'error' ? 'bg-red-100 text-red-700' : 
            message.type === 'info' ? 'bg-blue-100 text-blue-700' :
            'bg-green-100 text-green-700'
          }`}>
            {message.text}
          </div>
        )}

        {/* Pending Transactions - Now with user categories */}
        {pendingTransactions.length > 0 && (
          <PendingTransactions 
            transactions={pendingTransactions}
            onProcess={handlePendingTransaction}
            groups={groups}
            userCategories={categories} // Pass user's custom categories
          />
        )}

        {showCategoryManager ? (
          // Category Manager View
          <CategoryManager 
            categories={categories}
            onUpdate={handleCategoryUpdate}
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
              {expenses.length > 0 && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Today's Total:</span>
                    <span className="text-xl font-bold text-blue-600">
                      ₹{todayTotal.toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  )
}