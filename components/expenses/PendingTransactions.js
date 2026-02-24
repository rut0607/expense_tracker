'use client'

import { useState } from 'react'
import { EnvelopeIcon } from '@heroicons/react/24/outline'

export default function PendingTransactions({ transactions, onProcess }) {
  const [selectedTx, setSelectedTx] = useState(null)
  const [showSplitModal, setShowSplitModal] = useState(false)
  const [splitDetails, setSplitDetails] = useState({ groupId: '', myShare: 0 })

  const handleSplit = (tx) => {
    setSelectedTx(tx)
    setShowSplitModal(true)
  }

  const confirmSplit = async () => {
    // Process split expense
    await onProcess({
      ...selectedTx,
      isSplit: true,
      myShare: splitDetails.myShare,
      groupId: splitDetails.groupId
    })
    setShowSplitModal(false)
  }

  if (!transactions?.length) return null

  return (
    <div className="bg-yellow-50 rounded-lg p-4 mb-6">
      <h3 className="font-semibold text-yellow-800 mb-3 flex items-center">
        <EnvelopeIcon className="w-5 h-5 mr-2" />
        Detected from Email ({transactions.length})
      </h3>

      <div className="space-y-3">
        {transactions.map(tx => (
          <div key={tx.id} className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center">
                  <span className="font-medium">{tx.merchant}</span>
                  {tx.confidence > 0.8 && (
                    <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                      High confidence
                    </span>
                  )}
                  {tx.is_split_candidate && (
                    <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                      🤝 Split candidate
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600">{tx.description}</p>
                <p className="text-xs text-gray-500">{tx.date}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-blue-600">₹{tx.amount}</p>
                <div className="mt-2 space-x-2">
                  <button
                    onClick={() => onProcess({ ...tx, action: 'add' })}
                    className="text-xs bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600"
                  >
                    Add
                  </button>
                  {tx.is_split_candidate && (
                    <button
                      onClick={() => handleSplit(tx)}
                      className="text-xs bg-purple-500 text-white px-2 py-1 rounded hover:bg-purple-600"
                    >
                      Split
                    </button>
                  )}
                  <button
                    onClick={() => onProcess({ ...tx, action: 'ignore' })}
                    className="text-xs bg-gray-500 text-white px-2 py-1 rounded hover:bg-gray-600"
                  >
                    Ignore
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Split Modal */}
      {showSplitModal && selectedTx && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Split Expense</h3>
            <p className="mb-4">Total Amount: ₹{selectedTx.amount}</p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Your Share (₹)</label>
              <input
                type="number"
                value={splitDetails.myShare}
                onChange={(e) => setSplitDetails({...splitDetails, myShare: e.target.value})}
                className="w-full p-2 border rounded"
                placeholder="Enter your portion"
              />
              <p className="text-xs text-gray-500 mt-1">
                Friends owe: ₹{selectedTx.amount - (splitDetails.myShare || 0)}
              </p>
            </div>

            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowSplitModal(false)}
                className="px-4 py-2 border rounded"
              >
                Cancel
              </button>
              <button
                onClick={confirmSplit}
                className="px-4 py-2 bg-purple-500 text-white rounded"
              >
                Confirm Split
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}