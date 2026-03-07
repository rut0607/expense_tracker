'use client'

import { useState, useEffect } from 'react'
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
  ArrowPathIcon, 
  BoltIcon,
  SparklesIcon,
  FingerPrintIcon,
  CpuChipIcon,
  CircleStackIcon,
  CommandLineIcon,
  BanknotesIcon,
  RadarIcon
} from '@heroicons/react/24/outline'

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
    } catch (error) { showMessage('error', 'SYNC_ERROR') } finally { setLoading(false) }
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
      showMessage('success', 'SECURED')
      const expResult = await getTodayExpenses(session.user.id)
      if (expResult.success) setExpenses(expResult.data)
    } else { showMessage('error', 'FAILED') }
  }

  const handleDeleteExpense = async (expenseId) => {
    if (!confirm('ARCHIVE_TRANSACTION?')) return
    const result = await deleteExpense(expenseId)
    if (result.success) {
      showMessage('success', 'PURGED')
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

  const scanEmails = async () => {
    try {
      const res = await fetch('/api/email/scan', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        showMessage('success', data.found > 0 ? `SYNCED_${data.found}` : 'CLEAN_SYNC')
        loadPendingTransactions()
      }
    } catch (e) { showMessage('error', 'SYNC_ERROR') }
  }

  const showMessage = (type, text) => {
    setMessage({ type, text })
    setTimeout(() => setMessage({ type: '', text: '' }), 3000)
  }

  const todayTotal = expenses.reduce((sum, e) => sum + (e.amount || 0), 0)

  if (status === 'loading' || loading) {
    return (
      <div className="h-screen bg-[#0c0c0c] flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <div className="w-12 h-12 border-2 border-brand-green/20 border-t-brand-green animate-spin rounded-full" />
          <p className="text-[10px] font-black tracking-[0.5em] text-zinc-500 uppercase">System_Booting</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0c0c0c] text-white selection:bg-brand-green selection:text-black relative overflow-x-hidden font-sans">
      
      {/* --- LAYER 0: NEBULA-GRAIN BACKGROUND --- */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 opacity-[0.04] mix-blend-overlay" 
             style={{ backgroundImage: `url("https://grainy-gradients.vercel.app/noise.svg")` }} />
        <div className="absolute top-[-10%] left-[-5%] w-[50%] h-[50%] bg-brand-green/10 blur-[150px] rounded-full animate-pulse" />
        <div className="absolute bottom-[0%] right-[-5%] w-[40%] h-[40%] bg-zinc-800/30 blur-[130px] rounded-full" />
        <div className="absolute inset-0 opacity-[0.07]" 
             style={{ backgroundImage: `radial-gradient(circle, #fff 0.5px, transparent 0.5px)`, backgroundSize: '50px 50px' }} />
      </div>

      <Navbar />

      <main className="relative z-10 max-w-[1600px] mx-auto px-6 lg:px-12 pt-36 pb-20">
        
        {/* --- SECTION 1: THE TITAN DISPLAY --- */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-12">
          
          <div className="lg:col-span-8 bg-zinc-900/30 border border-white/5 backdrop-blur-3xl rounded-[3rem] p-12 relative overflow-hidden group">
            <div className="absolute -right-10 -bottom-10 opacity-[0.02] group-hover:opacity-[0.06] transition-opacity duration-1000">
              <CircleStackIcon className="w-96 h-96" />
            </div>
            
            <div className="flex items-center gap-4 mb-20">
              <span className="px-3 py-1 bg-brand-green text-black text-[9px] font-black uppercase tracking-widest rounded-full">Vault_Active</span>
              <div className="h-px w-8 bg-zinc-800" />
              <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-[0.4em]">Live_Equity_Stream</span>
            </div>

            <div className="relative z-10">
              <p className="text-zinc-500 text-sm font-medium mb-2 uppercase tracking-tight italic">Aggregate Settlement Today</p>
              <h1 className="nike-display text-[14vw] lg:text-[11rem] leading-[0.8] tracking-[-0.06em] tabular-nums">
                ₹{todayTotal.toLocaleString()}
              </h1>
            </div>
          </div>

          <div className="lg:col-span-4 flex flex-col gap-6">
            <button 
              onClick={scanEmails}
              className="flex-1 bg-brand-green hover:bg-white text-black rounded-[3rem] p-10 transition-all duration-700 group flex flex-col justify-between items-start overflow-hidden relative"
            >
              <ArrowPathIcon className="w-12 h-12 group-hover:rotate-180 transition-transform duration-1000 relative z-10" />
              <div className="relative z-10">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-50">Sync_Protocol</span>
                <h3 className="nike-display text-5xl italic leading-none mt-2 uppercase">Sync_Now</h3>
              </div>
            </button>
            <div className="bg-zinc-900/40 border border-white/5 p-8 rounded-[2.5rem] flex items-center justify-between">
               <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Reports</span>
               <PDFButton expenses={expenses} categories={categories} />
            </div>
          </div>
        </div>

        {/* --- SECTION 2: WORKSPACE GRID --- */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* THE LEDGER (LEFT) */}
          <div className="lg:col-span-7">
            <div className="bg-zinc-900/20 border border-white/5 backdrop-blur-md rounded-[3rem] overflow-hidden">
              <div className="px-10 py-8 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <CommandLineIcon className="w-5 h-5 text-brand-green" />
                  <h2 className="text-[10px] font-black uppercase tracking-[0.4em]">Transaction_Audit_Log</h2>
                </div>
                <button 
                  onClick={() => setShowCategoryManager(!showCategoryManager)}
                  className="text-[9px] font-black text-zinc-500 hover:text-white tracking-widest transition-all uppercase"
                >
                  {showCategoryManager ? "× Close_Schema" : "⊕ Manage_Categories"}
                </button>
              </div>

              <div className="p-10 min-h-[500px]">
                {showCategoryManager ? (
                  <CategoryManager categories={categories} onUpdate={() => { loadData(); setShowCategoryManager(false); }} userId={session.user.id} />
                ) : (
                  expenses.length === 0 ? (
                    <div className="h-[400px] flex flex-col items-center justify-center space-y-4 opacity-20">
                      <BanknotesIcon className="w-12 h-12" />
                      <p className="nike-display text-2xl italic">System_Idle</p>
                    </div>
                  ) : (
                    <ExpenseList expenses={expenses} onDelete={handleDeleteExpense} />
                  )
                )}
              </div>
            </div>
          </div>

          {/* THE CONTROL (RIGHT) */}
          <div className="lg:col-span-5 space-y-10">
            
            {/* ENHANCED RAPID CAPTURE SCANNER */}
            {pendingTransactions.length > 0 && (
              <div className="relative group">
                {/* Exterior Aura */}
                <div className="absolute -inset-1.5 bg-brand-green/30 blur-3xl opacity-50 group-hover:opacity-100 transition duration-1000"></div>
                
                <div className="relative bg-white text-black p-10 rounded-[3rem] shadow-2xl overflow-hidden border border-brand-green/20">
                  
                  {/* Decorative Neural Header */}
                  <div className="flex items-center justify-between mb-10 relative z-20">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <SparklesIcon className="w-6 h-6 text-brand-green fill-brand-green/10" />
                        <h3 className="nike-display text-base tracking-widest italic uppercase">Rapid_Capture</h3>
                      </div>
                      <span className="text-[8px] font-black text-zinc-400 tracking-[0.3em] mt-1 uppercase">Diagnostics: Active</span>
                    </div>
                    <div className="flex items-center gap-3 bg-zinc-900 text-white px-5 py-2 rounded-full shadow-lg">
                       <div className="w-1.5 h-1.5 bg-brand-green rounded-full animate-pulse shadow-[0_0_8px_#d9ff00]" />
                       <span className="text-[10px] font-black tabular-nums">{pendingTransactions.length} NEW_UNITS</span>
                    </div>
                  </div>
                  
                  {/* THE SCANNER BEAM (Updated for high visibility) */}
                  <div className="absolute top-28 left-0 w-full h-[60px] bg-gradient-to-b from-brand-green/20 to-transparent animate-[high_vis_scan_4s_linear_infinite] pointer-events-none z-10 border-t border-brand-green/60 shadow-[0_-10px_20px_-5px_rgba(217,255,0,0.3)]" />

                  <div className="relative z-20 max-h-[380px] overflow-y-auto custom-scrollbar pr-2">
                    <PendingTransactions 
                      transactions={pendingTransactions} 
                      onProcess={handlePendingTransaction} 
                      groups={groups} 
                      userCategories={categories} 
                    />
                  </div>

                  {/* Diagnostic Footer */}
                  <div className="mt-8 pt-6 border-t border-zinc-100 flex items-center justify-between opacity-40">
                    <div className="flex gap-1.5">
                      {[1,2,3,4].map(i => <div key={i} className="w-1 h-1 bg-zinc-300 rounded-full" />)}
                    </div>
                    <span className="text-[8px] font-bold uppercase tracking-[0.2em]">Neural_Processing_Ready</span>
                  </div>
                </div>
              </div>
            )}

            {/* SPLIT SUMMARY */}
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-[#111] border border-white/5 p-8 rounded-[2.5rem]">
                <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-4">Total_Owed</p>
                <p className="nike-display text-4xl">₹{splitSummary.owed}</p>
              </div>
              <div className="bg-zinc-800/20 border border-brand-green/20 p-8 rounded-[2.5rem]">
                <p className="text-[9px] font-black text-brand-green uppercase tracking-widest mb-4">Receivable</p>
                <p className="nike-display text-4xl text-brand-green">₹{splitSummary.toCollect}</p>
              </div>
            </div>

            {/* MANUAL ENTRY */}
            <div className="bg-zinc-900/40 border border-white/5 p-10 rounded-[3rem]">
              <div className="flex items-center gap-3 mb-10 border-l-2 border-brand-green pl-6">
                <CpuChipIcon className="w-5 h-5 text-zinc-500" />
                <h3 className="text-[10px] font-black uppercase tracking-widest">Manual_Entry_Terminal</h3>
              </div>
              <ExpenseForm categories={categories} onSave={handleAddExpense} />
            </div>
          </div>
        </div>

        {/* --- SYSTEM STATUS FOOTER --- */}
        <footer className="mt-20 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
           <div className="flex items-center gap-8 text-[9px] font-black text-zinc-600 uppercase tracking-[0.3em]">
             <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-brand-green rounded-full shadow-[0_0_8px_#d9ff00]" />
                Connection_Established
             </div>
             <span>Build_v2.0.8 // Production_MVP</span>
           </div>
           <div className="flex items-center gap-4 text-zinc-400">
              <span className="text-[9px] font-bold uppercase tracking-widest">Neural Sync Latency: 12ms</span>
           </div>
        </footer>

      </main>

      {/* --- NOTIFICATION ENGINE --- */}
      {message.text && (
        <div className="fixed bottom-12 right-12 z-[200] bg-brand-green text-black px-10 py-5 rounded-2xl nike-display text-2xl italic shadow-[0_20px_60px_rgba(217,255,0,0.3)] animate-in slide-in-from-bottom-10 duration-500">
          {message.text}
        </div>
      )}
    </div>
  )
}