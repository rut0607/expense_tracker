'use client'

import { useState } from 'react'
import { 
  EnvelopeIcon, 
  UserGroupIcon,
  XMarkIcon,
  CheckIcon,
  PencilIcon,
  SparklesIcon,
  ArrowRightIcon,
  TrashIcon
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

  // --- LOGIC PRESERVED ---
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
      alert('Select a group or add friends')
      return
    }
    const myShare = parseFloat(splitDetails.myShare)
    if (isNaN(myShare) || myShare <= 0 || myShare >= selectedTx.amount) {
      alert('Invalid share amount')
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
    <div className="space-y-4">
      {transactions.map(tx => (
        <div 
          key={tx.id} 
          className="group relative bg-white/5 border border-white/10 rounded-3xl p-5 transition-all duration-300 hover:bg-white/10 hover:border-white/20"
        >
          <div className="flex justify-between items-start gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="truncate font-bold text-sm tracking-tight text-white group-hover:text-emerald-400 transition-colors">
                  {tx.merchant || 'Unidentified'}
                </span>
                {tx.confidence > 0.8 && (
                  <div className="flex items-center px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-black text-emerald-500 uppercase">
                    Verified
                  </div>
                )}
              </div>
              
              <p className="text-xs text-zinc-400 truncate mb-3 leading-relaxed">
                {tx.description || tx.merchant}
              </p>
              
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                  {new Date(tx.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                </span>
                {tx.is_split_candidate && (
                  <span className="flex items-center gap-1 text-[9px] font-black text-purple-400 uppercase tracking-widest">
                    <UserGroupIcon className="w-3 h-3" />
                    Split Candidate
                  </span>
                )}
              </div>
            </div>
            
            <div className="text-right">
              <p className="text-xl font-black text-white tracking-tighter mb-4">
                ₹{tx.amount}
              </p>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleAddClick(tx)}
                  className="p-2 rounded-xl bg-emerald-500 text-zinc-950 hover:scale-110 transition-all active:scale-95 shadow-lg shadow-emerald-500/20"
                  title="Assign Category"
                >
                  <PencilIcon className="w-3.5 h-3.5 stroke-[3]" />
                </button>

                {tx.is_split_candidate && (
                  <button
                    onClick={() => handleSplit(tx)}
                    className="p-2 rounded-xl bg-purple-500 text-white hover:scale-110 transition-all active:scale-95 shadow-lg shadow-purple-500/20"
                    title="Split Expense"
                  >
                    <UserGroupIcon className="w-3.5 h-3.5 stroke-[2.5]" />
                  </button>
                )}

                <button
                  onClick={() => onProcess({ ...tx, action: 'ignore' })}
                  className="p-2 rounded-xl bg-white/5 text-zinc-500 hover:bg-red-500/20 hover:text-red-400 transition-all"
                  title="Ignore"
                >
                  <XMarkIcon className="w-3.5 h-3.5 stroke-[3]" />
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* --- CATEGORY SELECTION MODAL (GLASSMORPISM) --- */}
      {showCategoryModal && selectedTx && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 backdrop-blur-sm bg-black/40 animate-in fade-in duration-300">
          <div className="bg-zinc-900 border border-white/10 rounded-[40px] w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-8 border-b border-white/5 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black text-white tracking-tight">Assign Category</h3>
                <p className="text-xs text-zinc-500 font-medium mt-1 uppercase tracking-widest">Detection Stream</p>
              </div>
              <button onClick={() => setShowCategoryModal(false)} className="p-2 rounded-full hover:bg-white/5 text-zinc-500"><XMarkIcon className="w-6 h-6" /></button>
            </div>

            <div className="p-8 space-y-8">
              {/* Summary Card */}
              <div className="bg-white/5 rounded-3xl p-6 border border-white/5 flex justify-between items-center">
                <div>
                  <p className="text-lg font-bold text-white tracking-tight">{selectedTx.merchant}</p>
                  <p className="text-xs text-zinc-500 mt-1">{new Date(selectedTx.date).toLocaleDateString()}</p>
                </div>
                <p className="text-2xl font-black text-emerald-400 tracking-tighter">₹{selectedTx.amount}</p>
              </div>

              {/* Grid */}
              <div className="grid grid-cols-3 gap-3">
                {categories.map(category => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category)}
                    className={`group relative p-4 rounded-2xl border transition-all flex flex-col items-center gap-2 ${
                      selectedCategory?.id === category.id
                        ? 'bg-emerald-500 border-emerald-500 shadow-xl shadow-emerald-500/20'
                        : 'bg-white/5 border-white/5 hover:border-white/20'
                    }`}
                  >
                    <span className="text-2xl">{category.icon}</span>
                    <span className={`text-[10px] font-black uppercase tracking-widest ${selectedCategory?.id === category.id ? 'text-zinc-950' : 'text-zinc-400'}`}>
                      {category.name}
                    </span>
                  </button>
                ))}
              </div>

              <button
                onClick={handleAddWithCategory}
                disabled={!selectedCategory}
                className="w-full py-4 bg-white text-zinc-950 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-emerald-400 transition-all disabled:opacity-20 disabled:grayscale flex items-center justify-center gap-2"
              >
                Sync to {selectedCategory?.name || 'Ledger'}
                <ArrowRightIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- SPLIT MODAL (GLASSMORPISM) --- */}
      {showSplitModal && selectedTx && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 backdrop-blur-sm bg-black/60 animate-in fade-in zoom-in-95 duration-300">
          <div className="bg-zinc-900 border border-white/10 rounded-[40px] w-full max-w-xl overflow-hidden shadow-2xl text-white">
            <div className="p-8 border-b border-white/5 flex justify-between items-center bg-purple-500/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-500 flex items-center justify-center text-white"><UserGroupIcon className="w-6 h-6" /></div>
                <h3 className="text-xl font-black tracking-tight">Split Protocol</h3>
              </div>
              <button onClick={() => setShowSplitModal(false)} className="text-zinc-500 hover:text-white transition-colors"><XMarkIcon className="w-6 h-6" /></button>
            </div>

            <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Your Personal Share</label>
                <div className="relative">
                  <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-black text-zinc-500">₹</span>
                  <input 
                    type="number" 
                    value={splitDetails.myShare}
                    onChange={(e) => setSplitDetails({...splitDetails, myShare: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 pl-12 pr-6 text-2xl font-black focus:border-purple-500 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Friends Section */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                   <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Entities Involved</label>
                   <button onClick={() => setShowAddFriend(!showAddFriend)} className="text-[10px] font-black text-purple-400 uppercase tracking-widest">+ Add Member</button>
                </div>

                {showAddFriend && (
                  <div className="p-6 bg-white/5 border border-purple-500/30 rounded-3xl space-y-4 animate-in slide-in-from-top-2">
                    <input 
                      placeholder="Name" 
                      value={newFriend.name} 
                      onChange={e => setNewFriend({...newFriend, name: e.target.value})}
                      className="w-full bg-zinc-950 border border-white/5 rounded-xl px-4 py-3 text-sm focus:border-purple-500 outline-none"
                    />
                    <button onClick={handleAddFriend} className="w-full py-3 bg-purple-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest">Append Entity</button>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  {splitDetails.customFriends.map(friend => (
                    <div key={friend.id} className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl group">
                      <span className="text-sm font-bold truncate">{friend.name}</span>
                      <button onClick={() => removeFriend(friend.id)} className="text-zinc-600 hover:text-red-400 transition-colors"><TrashIcon className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-6 bg-purple-500/10 rounded-3xl border border-purple-500/20">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-[0.2em] text-purple-400 mb-2">
                  <span>Per Entity Share</span>
                  <span>Total Amount</span>
                </div>
                <div className="flex justify-between items-end">
                  <p className="text-2xl font-black">₹{calculateShares().friendShare}</p>
                  <p className="text-sm font-bold text-zinc-500 tracking-tighter">of ₹{selectedTx.amount}</p>
                </div>
              </div>

              <button
                onClick={handleConfirmSplit}
                className="w-full py-4 bg-purple-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-purple-400 transition-all shadow-xl shadow-purple-500/20"
              >
                Execute Split
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Internal Custom Scrollbar Styles */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
      `}</style>
    </div>
  )
}