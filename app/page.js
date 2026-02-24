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
import { EnvelopeIcon, UserGroupIcon } from '@heroicons/react/24/outline'

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
  const [showSplitModal, setShowSplitModal] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState(null)
  const [splitDetails, setSplitDetails] = useState({ 
    myShare: 0, 
    groupId: '',
    friends: []
  })
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
    if (transaction.action === 'add') {
      // Find appropriate category
      const category = categories.find(c => 
        c.name.toLowerCase().includes(transaction.category?.toLowerCase())
      ) || categories[0]

      await handleAddExpense({
        category_id: category?.id,
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
    
    } else if (transaction.action === 'ignore') {
      await fetch('/api/email/pending', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: transaction.id })
      })
      setPendingTransactions(prev => prev.filter(t => t.id !== transaction.id))
    
    } else if (transaction.action === 'split') {
      setSelectedTransaction(transaction)
      setSplitDetails({
        ...splitDetails,
        myShare: Math.round(transaction.amount / 2) // Default to equal split with 1 friend
      })
      setShowSplitModal(true)
    }
  }

  const handleSplitConfirm = async () => {
    if (!splitDetails.groupId && splitDetails.friends.length === 0) {
      alert('Please select a group or add friends')
      return
    }

    const myShare = parseFloat(splitDetails.myShare)
    if (isNaN(myShare) || myShare <= 0 || myShare >= selectedTransaction.amount) {
      alert('Please enter a valid share amount')
      return
    }

    try {
      const res = await fetch('/api/splits/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId: selectedTransaction.id,
          totalAmount: selectedTransaction.amount,
          myShare: myShare,
          groupId: splitDetails.groupId,
          friends: splitDetails.friends,
          description: selectedTransaction.description || selectedTransaction.merchant,
          merchant: selectedTransaction.merchant
        })
      })

      const data = await res.json()
      if (data.success) {
        showMessage('success', 'Split expense created!')
        setShowSplitModal(false)
        setSelectedTransaction(null)
        loadSplitSummary()
        
        // Remove from pending
        await fetch('/api/email/pending', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: selectedTransaction.id })
        })
        setPendingTransactions(prev => prev.filter(t => t.id !== selectedTransaction.id))
      }
    } catch (error) {
      console.error('Error creating split:', error)
      showMessage('error', 'Failed to create split')
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
            message.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
          }`}>
            {message.text}
          </div>
        )}

        {/* Pending Transactions */}
        {pendingTransactions.length > 0 && (
          <PendingTransactions 
            transactions={pendingTransactions}
            onProcess={handlePendingTransaction}
            groups={groups}
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

      {/* Split Modal */}
      {showSplitModal && selectedTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Split Expense</h3>
            
            <div className="mb-4 p-3 bg-gray-50 rounded">
              <p className="font-medium">{selectedTransaction.merchant}</p>
              <p className="text-sm text-gray-600">{selectedTransaction.description}</p>
              <p className="text-lg font-bold text-blue-600 mt-1">
                ₹{selectedTransaction.amount}
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">
                Your Share (₹)
              </label>
              <input
                type="number"
                value={splitDetails.myShare}
                onChange={(e) => setSplitDetails({
                  ...splitDetails, 
                  myShare: e.target.value
                })}
                className="w-full p-2 border rounded"
                placeholder="Enter your portion"
                min="1"
                max={selectedTransaction.amount - 1}
              />
              <p className="text-xs text-gray-500 mt-1">
                Friends will owe: ₹{selectedTransaction.amount - (splitDetails.myShare || 0)}
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">
                Split with Group
              </label>
              <select
                value={splitDetails.groupId}
                onChange={(e) => setSplitDetails({
                  ...splitDetails, 
                  groupId: e.target.value
                })}
                className="w-full p-2 border rounded"
              >
                <option value="">Select a group</option>
                {groups.map(group => (
                  <option key={group.id} value={group.id}>
                    {group.name} ({group.group_members?.length || 0} members)
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowSplitModal(false)}
                className="px-4 py-2 border rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSplitConfirm}
                className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
              >
                Create Split
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}