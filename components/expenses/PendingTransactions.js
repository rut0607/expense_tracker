'use client'

import { useState } from 'react'
import { 
  EnvelopeIcon, 
  UserGroupIcon,
  XMarkIcon,
  CheckIcon,
  PencilIcon
} from '@heroicons/react/24/outline'

export default function PendingTransactions({ transactions, onProcess, groups = [], userCategories = [] }) {
  const [selectedTx, setSelectedTx] = useState(null)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [showSplitModal, setShowSplitModal] = useState(false)
  const [splitDetails, setSplitDetails] = useState({ 
    myShare: 0, 
    groupId: '',
    customFriends: []
  })
  const [newFriend, setNewFriend] = useState({ name: '', email: '' })
  const [showAddFriend, setShowAddFriend] = useState(false)

  // Predefined categories (fallback if no user categories)
  const PREDEFINED_CATEGORIES = [
    { id: 'food', name: 'Food', icon: '🍔', color: '#FF6B6B' },
    { id: 'shopping', name: 'Shopping', icon: '🛍️', color: '#4ECDC4' },
    { id: 'transport', name: 'Transport', icon: '🚗', color: '#45B7D1' },
    { id: 'bills', name: 'Bills', icon: '📃', color: '#96CEB4' },
    { id: 'entertainment', name: 'Entertainment', icon: '🎬', color: '#FFE194' },
    { id: 'health', name: 'Health', icon: '💊', color: '#FF8A8A' },
    { id: 'education', name: 'Education', icon: '📚', color: '#9B59B6' },
    { id: 'travel', name: 'Travel', icon: '✈️', color: '#3498DB' },
    { id: 'other', name: 'Other', icon: '📦', color: '#95A5A6' }
  ]

  // Use user categories if available, otherwise use predefined
  const categories = userCategories.length > 0 
    ? userCategories.map(cat => ({
        id: cat.id,
        name: cat.name,
        icon: cat.icon || '📝',
        color: cat.color || '#3B82F6',
        isCustom: true
      }))
    : PREDEFINED_CATEGORIES

  const handleAddClick = (tx) => {
    setSelectedTx(tx)
    setSelectedCategory(null)
    setShowCategoryModal(true)
  }

  const handleAddWithCategory = () => {
    if (selectedCategory && selectedTx) {
      onProcess({
        ...selectedTx,
        action: 'add',
        categoryId: selectedCategory.id,
        categoryName: selectedCategory.name,
        categoryIcon: selectedCategory.icon,
        categoryColor: selectedCategory.color
      })
      setShowCategoryModal(false)
      setSelectedTx(null)
    }
  }

  const handleSplit = (tx) => {
    setSelectedTx(tx)
    setSplitDetails({
      myShare: Math.round(tx.amount / 2),
      groupId: '',
      customFriends: []
    })
    setShowSplitModal(true)
  }

  const handleAddFriend = () => {
    if (newFriend.name) {
      setSplitDetails({
        ...splitDetails,
        customFriends: [...splitDetails.customFriends, { ...newFriend, id: Date.now() }]
      })
      setNewFriend({ name: '', email: '' })
      setShowAddFriend(false)
    }
  }

  const removeFriend = (friendId) => {
    setSplitDetails({
      ...splitDetails,
      customFriends: splitDetails.customFriends.filter(f => f.id !== friendId)
    })
  }

  const calculateShares = () => {
    const totalFriends = splitDetails.customFriends.length
    if (totalFriends === 0) return { myShare: selectedTx.amount, friendShare: 0 }
    
    const friendShare = (selectedTx.amount - splitDetails.myShare) / totalFriends
    return {
      myShare: splitDetails.myShare,
      friendShare: Math.round(friendShare * 100) / 100
    }
  }

  const handleConfirmSplit = async () => {
    if (!splitDetails.groupId && splitDetails.customFriends.length === 0) {
      alert('Please select a group or add friends to split with')
      return
    }

    const myShare = parseFloat(splitDetails.myShare)
    if (isNaN(myShare) || myShare <= 0 || myShare >= selectedTx.amount) {
      alert('Please enter a valid share amount')
      return
    }

    const shares = calculateShares()
    
    await onProcess({
      ...selectedTx,
      action: 'split',
      splitDetails: {
        myShare: shares.myShare,
        friendShare: shares.friendShare,
        groupId: splitDetails.groupId,
        friends: splitDetails.customFriends
      }
    })

    setShowSplitModal(false)
    setSelectedTx(null)
  }

  if (!transactions?.length) return null

  return (
    <div className="bg-yellow-50 rounded-xl shadow-sm border border-yellow-200 mb-6 overflow-hidden">
      <div className="px-4 py-3 bg-yellow-100 border-b border-yellow-200 flex items-center justify-between">
        <h3 className="font-semibold text-yellow-800 flex items-center">
          <EnvelopeIcon className="w-5 h-5 mr-2" />
          Detected from Email ({transactions.length})
        </h3>
        <span className="text-xs text-yellow-600 bg-yellow-200 px-2 py-1 rounded-full">
          Auto-detected
        </span>
      </div>

      <div className="divide-y divide-yellow-100">
        {transactions.map(tx => (
          <div key={tx.id} className="p-4 hover:bg-yellow-50/50 transition">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center flex-wrap gap-2 mb-1">
                  <span className="font-medium text-gray-900">{tx.merchant || 'Unknown'}</span>
                  {tx.confidence > 0.8 && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                      {Math.round(tx.confidence * 100)}% confidence
                    </span>
                  )}
                  {tx.is_split_candidate && (
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full flex items-center">
                      <UserGroupIcon className="w-3 h-3 mr-1" />
                      Split candidate
                    </span>
                  )}
                </div>
                
                <p className="text-sm text-gray-600 mb-1">{tx.description || tx.merchant}</p>
                
                <div className="flex items-center text-xs text-gray-500 space-x-2">
                  <span>{new Date(tx.date).toLocaleDateString('en-IN')}</span>
                </div>
              </div>
              
              <div className="text-right ml-4">
                <p className="text-lg font-bold text-blue-600">₹{tx.amount}</p>
                <div className="mt-2 flex flex-col space-y-2">
                  {/* Add Button with Category Selection */}
                  <button
                    onClick={() => handleAddClick(tx)}
                    className="text-xs bg-green-500 text-white px-3 py-1.5 rounded-lg hover:bg-green-600 transition font-medium flex items-center justify-center"
                  >
                    <PencilIcon className="w-3 h-3 mr-1" />
                    Add to Category
                  </button>
                  
                  <div className="flex space-x-2">
                    {tx.is_split_candidate && (
                      <button
                        onClick={() => handleSplit(tx)}
                        className="text-xs bg-purple-500 text-white px-3 py-1.5 rounded-lg hover:bg-purple-600 transition font-medium flex items-center"
                      >
                        <UserGroupIcon className="w-3 h-3 mr-1" />
                        Split
                      </button>
                    )}
                    <button
                      onClick={() => onProcess({ ...tx, action: 'ignore' })}
                      className="text-xs bg-gray-500 text-white px-3 py-1.5 rounded-lg hover:bg-gray-600 transition font-medium"
                    >
                      Ignore
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Category Selection Modal */}
      {showCategoryModal && selectedTx && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold flex items-center">
                  <PencilIcon className="w-5 h-5 mr-2 text-blue-500" />
                  Select Category
                </h3>
                <button
                  onClick={() => setShowCategoryModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              {/* Transaction Summary */}
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <p className="font-medium text-gray-900">{selectedTx.merchant}</p>
                <p className="text-sm text-gray-600 mt-1">{selectedTx.description}</p>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-sm text-gray-500">Amount</span>
                  <span className="text-xl font-bold text-blue-600">₹{selectedTx.amount}</span>
                </div>
              </div>

              {/* Categories Grid */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                {categories.map(category => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category)}
                    className={`p-3 rounded-lg border-2 transition flex flex-col items-center ${
                      selectedCategory?.id === category.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    style={{ 
                      backgroundColor: selectedCategory?.id === category.id ? category.color + '20' : 'transparent'
                    }}
                  >
                    <span className="text-2xl mb-1">{category.icon}</span>
                    <span className="text-sm font-medium">{category.name}</span>
                    {category.isCustom && (
                      <span className="text-xs text-gray-500 mt-1">Custom</span>
                    )}
                  </button>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowCategoryModal(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddWithCategory}
                  disabled={!selectedCategory}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition disabled:bg-gray-300 flex items-center"
                >
                  <CheckIcon className="w-4 h-4 mr-1" />
                  Add to {selectedCategory?.name || 'Category'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Split Modal (keep existing split modal code) */}
      {showSplitModal && selectedTx && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          {/* ... existing split modal code ... */}
        </div>
      )}
    </div>
  )
}