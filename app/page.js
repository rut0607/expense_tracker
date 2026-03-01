'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import CategoryManager from '@/components/categories/CategoryManager'
import ExpenseForm from '@/components/expenses/ExpenseForm'
import ExpenseList from '@/components/expenses/ExpenseList'
import PendingTransactions from '@/components/expenses/PendingTransactions'
import { getUserCategories } from '@/utils/categories'
import { getTodayExpenses, saveExpense, deleteExpense } from '@/utils/expenses'
import PDFButton from '@/components/pdf/PDFButton'
import { 
  EnvelopeIcon, 
  ArrowPathIcon, 
  PlusIcon, 
  BoltIcon,
  ArrowUpRightIcon,
  SparklesIcon,
  QueueListIcon,
  CheckBadgeIcon
} from '@heroicons/react/24/outline'

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  // --- STATE ---
  const [categories, setCategories] = useState([])
  const [expenses, setExpenses] = useState([])
  const [pendingTransactions, setPendingTransactions] = useState([])
  const [splitSummary, setSplitSummary] = useState({ owed: 0, toCollect: 0 })
  const [loading, setLoading] = useState(true)
  const [showCategoryManager, setShowCategoryManager] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [groups, setGroups] = useState([])
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  // --- MOUSE FOLLOW ENGINE ---
  useEffect(() => {
    const handleMouseMove = (e) => setMousePos({ x: e.clientX, y: e.clientY })
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  // --- CORE LOGIC (PRESERVED) ---
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (session?.user?.id) {
      loadData(); loadPendingTransactions(); loadSplitSummary(); loadGroups();
    }
  }, [session, status, router])

  const loadData = async () => {
    setLoading(true)
    try {
      const catResult = await getUserCategories(session.user.id)
      if (catResult.success) setCategories(catResult.data)
      const expResult = await getTodayExpenses(session.user.id)
      if (expResult.success) setExpenses(expResult.data)
    } catch (error) { showMessage('error', 'Sync Failed') } finally { setLoading(false) }
  }

  const loadPendingTransactions = async () => {
    try {
      const res = await fetch('/api/email/pending')
      const data = await res.json()
      if (data.success) setPendingTransactions(data.transactions || [])
    } catch (e) {}
  }

  const loadSplitSummary = async () => {
    try {
      const res = await fetch('/api/splits/summary')
      const data = await res.json()
      if (data.success) setSplitSummary(data.summary)
    } catch (e) {}
  }

  const loadGroups = async () => {
    try {
      const res = await fetch('/api/splits/groups')
      const data = await res.json()
      if (data.success) setGroups(data.data || [])
    } catch (e) {}
  }

  const handleAddExpense = async (expenseData) => {
    const result = await saveExpense(session.user.id, expenseData)
    if (result.success) {
      showMessage('success', 'Entry Secured')
      const expResult = await getTodayExpenses(session.user.id)
      if (expResult.success) setExpenses(expResult.data)
    } else { showMessage('error', 'Log Failed') }
  }

  const handleDeleteExpense = async (expenseId) => {
    if (!confirm('Archive this transaction?')) return
    const result = await deleteExpense(expenseId)
    if (result.success) {
      showMessage('success', 'Entry Removed')
      setExpenses(expenses.filter(e => e.id !== expenseId))
    }
  }

  const handlePendingTransaction = async (transaction) => {
    if (transaction.action === 'add' && transaction.categoryId) {
      await handleAddExpense({
        category_id: transaction.categoryId,
        amount: transaction.amount,
        description: transaction.description || transaction.merchant,
        fields: {},
        date: transaction.date
      })
      await fetch('/api/email/pending', { method: 'DELETE', body: JSON.stringify({ id: transaction.id }) })
      setPendingTransactions(prev => prev.filter(t => t.id !== transaction.id))
    }
  }

  // --- NEW: APPROVE ALL FEATURE ---
  const handleApproveAll = async () => {
    const autoAddable = pendingTransactions.filter(t => t.categoryId);
    if (autoAddable.length === 0) {
        showMessage('info', 'Assign categories to items first');
        return;
    }
    
    showMessage('info', `Processing ${autoAddable.length} items...`);
    for (const t of autoAddable) {
        await handlePendingTransaction({ ...t, action: 'add' });
    }
    showMessage('success', 'Batch Processing Complete');
  }

  const scanEmails = async () => {
    try {
      const res = await fetch('/api/email/scan', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        showMessage('success', data.found > 0 ? `${data.found} New Syncs` : 'Data Current')
        loadPendingTransactions()
      }
    } catch (e) { showMessage('error', 'Sync Failed') }
  }

  const showMessage = (type, text) => {
    setMessage({ type, text })
    setTimeout(() => setMessage({ type: '', text: '' }), 3000)
  }

  const todayTotal = expenses.reduce((sum, e) => sum + (e.amount || 0), 0)

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-[#F4F4F7] flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-zinc-200 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F4F4F7] text-zinc-900 selection:bg-emerald-100 relative overflow-hidden">
      
      {/* --- CRAZY BACKGROUND ENGINE --- */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-5%] left-[-5%] w-[45%] h-[45%] rounded-full bg-emerald-400/15 blur-[120px] animate-pulse" />
        <div className="absolute bottom-[5%] right-[-5%] w-[35%] h-[35%] rounded-full bg-indigo-400/10 blur-[100px] animate-bounce [animation-duration:12s]" />
        
        {/* Spotlight Follow */}
        <div className="absolute w-[600px] h-[600px] rounded-full opacity-[0.12] blur-[100px] transition-transform duration-500 ease-out"
          style={{ 
            background: 'radial-gradient(circle, #10b981 0%, transparent 70%)',
            transform: `translate(${mousePos.x - 300}px, ${mousePos.y - 300}px)` 
          }}
        />

        {/* Dot Grid & Noise */}
        <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: `radial-gradient(#000 1px, transparent 1px)`, backgroundSize: '40px 40px' }} />
        <div className="absolute inset-0 opacity-[0.25] mix-blend-overlay" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }} />
      </div>

      <div className="relative z-10">
        <Navbar />

        <main className="max-w-[1440px] mx-auto px-6 lg:px-12 pt-32 pb-20">
          
          {/* HEADER SECTION */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-8">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">Financial OS v3.0</span>
              </div>
              <h1 className="text-6xl font-black tracking-tight text-zinc-950">Vantage Hub<span className="text-emerald-500">.</span></h1>
            </div>

            <div className="flex items-center gap-3 bg-white/40 backdrop-blur-md p-2 rounded-[24px] border border-white/40 shadow-xl shadow-zinc-200/50">
              <button onClick={scanEmails} className="flex items-center gap-2 px-6 py-3.5 bg-zinc-950 text-white rounded-[18px] text-xs font-bold hover:bg-zinc-800 transition-all active:scale-95 shadow-lg shadow-zinc-200">
                <ArrowPathIcon className="w-4 h-4" />
                Refresh Sync
              </button>
              <PDFButton expenses={expenses} categories={categories} date={new Date().toISOString().split('T')[0]} />
            </div>
          </div>

          {/* NOTIFICATION TOAST */}
          {message.text && (
            <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[110] px-8 py-3 bg-zinc-900 text-white rounded-full shadow-2xl text-[11px] font-black uppercase tracking-widest animate-in fade-in slide-in-from-top-4">
              {message.text}
            </div>
          )}

          <div className="grid grid-cols-12 gap-8 lg:gap-12">
            
            {/* LEFT COLUMN */}
            <div className="col-span-12 lg:col-span-4 space-y-10">
              
              {/* Split Cards */}
              <div className="grid grid-cols-2 gap-5">
                <div className="bg-white/60 backdrop-blur-md rounded-[32px] p-8 border border-white/60 shadow-sm transition-transform hover:translate-y-[-4px]">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">Liability</p>
                  <p className="text-4xl font-black text-zinc-950 tracking-tighter">₹{splitSummary.owed}</p>
                </div>
                <div className="bg-white/60 backdrop-blur-md rounded-[32px] p-8 border border-white/60 shadow-sm transition-transform hover:translate-y-[-4px]">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">Assets</p>
                  <p className="text-4xl font-black text-zinc-950 tracking-tighter">₹{splitSummary.toCollect}</p>
                </div>
              </div>

              {/* DETECTION ENGINE (WITH SCROLL) */}
              {pendingTransactions.length > 0 && (
                <div className="bg-zinc-950 rounded-[40px] p-8 text-white shadow-2xl relative overflow-hidden border border-white/5">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/20 blur-[60px] pointer-events-none" />
                  
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center gap-3">
                        <SparklesIcon className="w-5 h-5 text-emerald-400 animate-pulse" />
                        <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-500/80">Detection Engine</h3>
                      </div>
                      <div className="bg-white/10 px-2.5 py-1 rounded-lg text-[10px] font-black">{pendingTransactions.length} ITEMS</div>
                    </div>

                    <div className="relative">
                      <div className="max-h-[360px] overflow-y-auto pr-2 custom-scrollbar scroll-smooth">
                        <PendingTransactions transactions={pendingTransactions} onProcess={handlePendingTransaction} groups={groups} userCategories={categories} />
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-zinc-950 to-transparent pointer-events-none" />
                    </div>

                    <div className="mt-6 pt-6 border-t border-white/5 flex items-center justify-between">
                      <button onClick={handleApproveAll} className="flex items-center gap-2 text-[10px] font-black text-emerald-400 hover:text-white transition-all group">
                         <CheckBadgeIcon className="w-4 h-4 group-hover:scale-110" />
                         Batch Approve
                      </button>
                      <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Encrypted Stream</span>
                    </div>
                  </div>
                </div>
              )}

              {/* LOG FORM */}
              <div className="bg-white/80 backdrop-blur-md rounded-[40px] p-10 border border-white shadow-sm">
                 <div className="flex items-center gap-4 mb-10">
                    <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-emerald-200">
                      <PlusIcon className="w-6 h-6 stroke-[3]" />
                    </div>
                    <h2 className="text-2xl font-black tracking-tight">Manual Log</h2>
                 </div>
                 <ExpenseForm categories={categories} onSave={handleAddExpense} />
              </div>
            </div>

            {/* RIGHT COLUMN */}
            <div className="col-span-12 lg:col-span-8">
              {showCategoryManager ? (
                <div className="bg-white rounded-[48px] p-12 border border-white shadow-2xl">
                  <CategoryManager categories={categories} onUpdate={() => { loadData(); setShowCategoryManager(false); }} userId={session.user.id} />
                </div>
              ) : (
                <div className="space-y-12">
                  
                  {/* HERO STAT CARD */}
                  <div className="bg-white/30 backdrop-blur-2xl rounded-[56px] p-12 lg:p-20 border border-white shadow-xl relative overflow-hidden">
                    <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-12">
                      <div>
                        <span className="text-[11px] font-black uppercase tracking-[0.4em] text-zinc-400 block mb-8">Daily Liquidity Flow</span>
                        <h2 className="text-8xl md:text-[10rem] font-black tracking-[calc(-0.06em)] text-zinc-950 leading-[0.75]">
                          ₹{todayTotal.toLocaleString()}
                        </h2>
                      </div>
                      
                      <div className="flex flex-col items-start md:items-end gap-4">
                        <div className="flex -space-x-4">
                          {[1,2,3].map(i => <div key={i} className="w-14 h-14 rounded-full border-[6px] border-white bg-zinc-100 shadow-sm" />)}
                          <div className="w-14 h-14 rounded-full border-[6px] border-white bg-zinc-950 flex items-center justify-center text-[11px] font-black text-white shadow-2xl">{expenses.length}</div>
                        </div>
                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Verified Units</span>
                      </div>
                    </div>
                  </div>

                  {/* TRANSACTION LIST */}
                  <div className="bg-white rounded-[48px] p-10 lg:p-14 border border-white shadow-sm">
                    <div className="flex items-center justify-between mb-12">
                      <div className="flex items-center gap-3">
                        <QueueListIcon className="w-6 h-6 text-emerald-500" />
                        <h3 className="text-2xl font-black tracking-tight">Live Ledger</h3>
                      </div>
                      <button onClick={() => setShowCategoryManager(true)} className="text-[10px] font-black uppercase tracking-widest px-6 py-3 bg-zinc-50 border border-zinc-100 rounded-2xl hover:bg-zinc-950 hover:text-white transition-all">Configure Schema</button>
                    </div>
                    
                    {expenses.length === 0 ? (
                      <div className="py-28 text-center border-4 border-dotted border-zinc-100 rounded-[48px]">
                        <BoltIcon className="w-12 h-12 text-zinc-200 mx-auto mb-6" />
                        <h4 className="text-xl font-black italic">Awaiting Data Streams</h4>
                        <p className="text-zinc-400 text-sm mt-2 font-medium">No activity recorded on the ledger today.</p>
                      </div>
                    ) : (
                      <ExpenseList expenses={expenses} onDelete={handleDeleteExpense} />
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(16, 185, 129, 0.2); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(16, 185, 129, 0.5); }
      `}</style>
    </div>
  )
}