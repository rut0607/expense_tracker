import { useState } from 'react'

export default function ExtraForm({ expenses, updateExpenses }) {
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')

  const addExtra = () => {
    // Validate inputs
    if (!amount || !reason) {
      alert('Please enter both amount and reason')
      return
    }

    // Convert amount to number
    const numAmount = Number(amount)
    
    // Check if it's a valid number
    if (isNaN(numAmount) || numAmount <= 0) {
      alert('Please enter a valid amount greater than 0')
      return
    }

    // Create new extra expense object
    const newExtraItem = {
      amount: numAmount,
      reason: reason.trim()
    }

    // Add to existing expenses
    const updatedExtras = [...expenses.extra, newExtraItem]
    
    // Update parent component
    updateExpenses({ 
      ...expenses, 
      extra: updatedExtras 
    })

    // Clear form
    setAmount('')
    setReason('')
  }

  return (
    <div className="bg-white shadow rounded-lg p-4 mb-4">
      <h2 className="text-xl font-bold mb-3">Extra Expenses</h2>
      
      <div className="mb-3">
        <label className="block text-sm font-medium mb-1">
          Amount (₹)
        </label>
        <input
          type="number"
          min="1"
          step="1"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Enter amount"
          className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      
      <div className="mb-3">
        <label className="block text-sm font-medium mb-1">
          Reason
        </label>
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g., Movie, Medicine, Shopping"
          className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      
      <button
        onClick={addExtra}
        className="w-full bg-gray-500 text-white py-2 px-4 rounded hover:bg-gray-600 transition"
      >
        Add Extra Expense
      </button>

      {/* Debug info - remove after testing */}
      {/* <div className="mt-2 text-xs text-gray-500">
        Current extras: {expenses.extra.length}
      </div> */}
    </div>
  )
}