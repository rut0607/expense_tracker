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
  BanknotesIcon,
  ClipboardDocumentListIcon,
  ClockIcon,
  ArrowsRightLeftIcon,
  Squares2X2Icon,
  ChevronRightIcon,
  PlusIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline'

// ─── Tiny reusable glass card ────────────────────────────────────────────────
function GlassCard({ children, className = '' }) {
  return (
    <div
      className={`bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-sm ${className}`}
    >
      {children}
    </div>
  )
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, accent = false }) {
  return (
    <GlassCard className="p-5 flex items-start gap-4 hover:bg-white/15 transition-all duration-300">
      <div
        className={`p-2.5 rounded-xl ${
          accent ? 'bg-orange-500/20 text-orange-400' : 'bg-white/10 text-gray-300'
        }`}
      >
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-xs text-gray-400 font-medium mb-1">{label}</p>
        <p className="text-2xl font-bold text-white leading-none">{value}</p>
      </div>
    </GlassCard>
  )
}

// ─── Section label ────────────────────────────────────────────────────────────
function SectionLabel({ children }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-3">
      {children}
    </p>
  )
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  // ── State (unchanged) ──────────────────────────────────────────────────────
  const [categories, setCategories] = useState([])
  const [expenses, setExpenses] = useState([])
  const [pendingTransactions, setPendingTransactions] = useState([])
  const [splitSummary, setSplitSummary] = useState({ owed: 0, toCollect: 0 })
  const [loading, setLoading] = useState(true)
  const [showCategoryManager, setShowCategoryManager] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [groups, setGroups] = useState([])

  // ── Effects (unchanged) ────────────────────────────────────────────────────
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

  // ── Data loaders (unchanged) ───────────────────────────────────────────────
  const loadData = async () => {
    setLoading(true)
    try {
      const catResult = await getUserCategories(session.user.id)
      if (catResult.success) setCategories(catResult.data)
      const expResult = await getTodayExpenses(session.user.id)
      if (expResult.success) setExpenses(expResult.data)
    } catch (error) {
      showMessage('error', 'Failed to load data')
    } finally {
      setLoading(false)
    }
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
      if (data.success && data.summary) {
        setSplitSummary({
          owed: data.summary.owed || 0,
          toCollect: data.summary.toCollect || 0
        })
      }
    } catch (e) {}
  }

  const loadGroups = async () => {
    try {
      const res = await fetch('/api/splits/groups')
      const data = await res.json()
      if (data.success) setGroups(data.data || [])
    } catch (e) {}
  }

  // ── Handlers (unchanged) ───────────────────────────────────────────────────
  const handleAddExpense = async (expenseData) => {
    const result = await saveExpense(session.user.id, expenseData)
    if (result.success) {
      showMessage('success', 'Expense saved')
      const expResult = await getTodayExpenses(session.user.id)
      if (expResult.success) setExpenses(expResult.data)
    } else {
      showMessage('error', 'Failed to save')
    }
  }

  const handleDeleteExpense = async (expenseId) => {
    if (!confirm('Delete this expense?')) return
    const result = await deleteExpense(expenseId)
    if (result.success) {
      showMessage('success', 'Deleted')
      setExpenses(expenses.filter((e) => e.id !== expenseId))
    }
  }

  const handlePendingTransaction = async (transaction) => {
    if (transaction.action === 'add' && transaction.categoryId) {
      await handleAddExpense({
        category_id: transaction.categoryId,
        amount: transaction.amount,
        description: transaction.description || transaction.merchant,
        fields: {},
        date: transaction.date,
      })
      await fetch('/api/email/pending', {
        method: 'DELETE',
        body: JSON.stringify({ id: transaction.id }),
      })
      setPendingTransactions((prev) => prev.filter((t) => t.id !== transaction.id))
    }
  }

  const scanEmails = async () => {
    try {
      const res = await fetch('/api/email/scan', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        showMessage('success', data.found > 0 ? `Synced ${data.found} transactions` : 'No new emails')
        loadPendingTransactions()
      }
    } catch (e) {
      showMessage('error', 'Sync failed')
    }
  }

  const showMessage = (type, text) => {
    setMessage({ type, text })
    setTimeout(() => setMessage({ type: '', text: '' }), 3000)
  }

  const todayTotal = expenses.reduce((sum, e) => sum + (e.amount || 0), 0)

  // ── Loading state ──────────────────────────────────────────────────────────
  if (status === 'loading' || loading) {
    return (
      <div className="h-screen bg-[#12141a] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-orange-500/30 border-t-orange-500 animate-spin rounded-full" />
          <p className="text-sm text-gray-500 font-medium">Loading dashboard…</p>
        </div>
      </div>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#12141a] text-white font-sans selection:bg-orange-500/30">

      {/* ── Ambient background blobs ── */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-15%] left-[-8%] w-[45%] h-[45%] bg-orange-500/8 blur-[140px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[35%] h-[35%] bg-indigo-600/8 blur-[120px] rounded-full" />
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.8) 0.5px, transparent 0.5px)`,
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      <Navbar />

      <main className="relative z-10 max-w-[1600px] mx-auto px-6 lg:px-10 pt-28 pb-16">

        {/* ══════════════════════════════════════════════════════════════════
            TOP — PAGE HEADER + STAT CARDS
        ══════════════════════════════════════════════════════════════════ */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-white mb-1">Personal Dashboard</h1>
          <p className="text-sm text-gray-500">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={BanknotesIcon}
            label="Today's Expenses"
            value={`₹${todayTotal.toLocaleString()}`}
            accent
          />
          <StatCard
            icon={ClipboardDocumentListIcon}
            label="Transactions"
            value={expenses.length}
          />
          <StatCard
            icon={ClockIcon}
            label="Pending"
            value={pendingTransactions.length}
          />
          <StatCard
            icon={ArrowsRightLeftIcon}
            label="Receivable"
            value={`₹${splitSummary.toCollect || 0}`}
          />
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            MAIN GRID — (8 col content) + (4 col sidebar)
        ══════════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* ── LEFT / CENTER COLUMN ─────────────────────────────────────── */}
          <div className="lg:col-span-8 space-y-6">

            {/* Chart placeholder row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Bar chart placeholder */}
              <GlassCard className="p-5">
                <SectionLabel>Monthly Expenses</SectionLabel>
                <div className="h-36 flex items-end gap-1.5">
                  {[40, 65, 50, 80, 55, 90, 45, 70, 60, 85, 50, 75].map((h, i) => (
                    <div key={i} className="flex-1 flex flex-col justify-end">
                      <div
                        className={`rounded-sm transition-all duration-500 ${
                          i === 7 ? 'bg-orange-500' : 'bg-white/10'
                        }`}
                        style={{ height: `${h}%` }}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-[10px] text-gray-600 mt-2">
                  <span>May</span><span>Jun</span><span>Jul</span><span>Aug</span><span>Sep</span><span>Oct</span>
                </div>
              </GlassCard>

              {/* Donut chart placeholder */}
              <GlassCard className="p-5">
                <SectionLabel>By Category</SectionLabel>
                <div className="flex items-center gap-6">
                  {/* SVG donut */}
                  <svg viewBox="0 0 80 80" className="w-24 h-24 shrink-0">
                    {[
                      { pct: 38.6, color: '#f97316', offset: 0 },
                      { pct: 22.5, color: '#6366f1', offset: 38.6 },
                      { pct: 30.8, color: '#22d3ee', offset: 61.1 },
                      { pct: 8.1, color: '#a3a3a3', offset: 91.9 },
                    ].map((seg, i) => {
                      const r = 30, circ = 2 * Math.PI * r
                      return (
                        <circle
                          key={i}
                          cx="40" cy="40" r={r}
                          fill="none"
                          stroke={seg.color}
                          strokeWidth="10"
                          strokeDasharray={`${(seg.pct / 100) * circ} ${circ}`}
                          strokeDashoffset={`${-((seg.offset / 100) * circ)}`}
                          transform="rotate(-90 40 40)"
                          className="opacity-80"
                        />
                      )
                    })}
                    <circle cx="40" cy="40" r="22" fill="rgba(255,255,255,0.03)" />
                  </svg>
                  <div className="space-y-2 text-xs">
                    {[
                      { label: 'Food', pct: '38.6%', color: 'bg-orange-500' },
                      { label: 'Transport', pct: '22.5%', color: 'bg-indigo-500' },
                      { label: 'Shopping', pct: '30.8%', color: 'bg-cyan-400' },
                      { label: 'Other', pct: '8.1%', color: 'bg-gray-500' },
                    ].map((l) => (
                      <div key={l.label} className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${l.color}`} />
                        <span className="text-gray-400">{l.label}</span>
                        <span className="ml-auto text-white font-medium">{l.pct}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </GlassCard>
            </div>

            {/* Expense List */}
            <GlassCard>
              {/* Card header */}
              <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Squares2X2Icon className="w-4 h-4 text-gray-400" />
                  <h2 className="text-sm font-semibold text-white">Transaction Log</h2>
                </div>
                <button
                  onClick={() => setShowCategoryManager(!showCategoryManager)}
                  className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-orange-400 transition-colors duration-200"
                >
                  <PlusIcon className="w-3.5 h-3.5" />
                  {showCategoryManager ? 'Close' : 'Manage Categories'}
                </button>
              </div>

              <div className="p-6 min-h-[320px]">
                {showCategoryManager ? (
                  <CategoryManager
                    categories={categories}
                    onUpdate={() => { loadData(); setShowCategoryManager(false) }}
                    userId={session.user.id}
                  />
                ) : expenses.length === 0 ? (
                  <div className="h-64 flex flex-col items-center justify-center gap-3 opacity-30">
                    <BanknotesIcon className="w-10 h-10" />
                    <p className="text-sm font-medium">No transactions today</p>
                  </div>
                ) : (
                  <ExpenseList expenses={expenses} onDelete={handleDeleteExpense} />
                )}
              </div>
            </GlassCard>

            {/* Split Summary */}
            <div className="grid grid-cols-2 gap-4">
              <GlassCard className="p-5">
                <p className="text-xs text-gray-400 font-medium mb-2">Amount Owed</p>
                <p className="text-2xl font-bold text-white">₹{(splitSummary?.owed ?? 0).toLocaleString()}</p>
                <p className="text-[10px] text-red-400 mt-1 font-medium">Outstanding balance</p>
              </GlassCard>
              <GlassCard className="p-5 border-orange-500/20">
                <p className="text-xs text-gray-400 font-medium mb-2">To Collect</p>
                <p className="text-2xl font-bold text-orange-400">₹{(splitSummary?.toCollect ?? 0).toLocaleString()}</p>
                <p className="text-[10px] text-orange-400/60 mt-1 font-medium">Receivable amount</p>
              </GlassCard>
            </div>

          </div>

          {/* ── RIGHT SIDEBAR ─────────────────────────────────────────────── */}
          <div className="lg:col-span-4 space-y-5">

            {/* User Profile Card */}
            <GlassCard className="p-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shrink-0">
                  <UserCircleIcon className="w-7 h-7 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{session?.user?.name || 'User'}</p>
                  <p className="text-xs text-gray-500">{session?.user?.email}</p>
                </div>
              </div>
            </GlassCard>

            {/* Quick Actions */}
            <GlassCard className="p-5">
              <SectionLabel>Quick Actions</SectionLabel>
              <div className="space-y-2">
                <button
                  onClick={scanEmails}
                  className="w-full flex items-center justify-between bg-orange-500 hover:bg-orange-400 text-white text-sm font-semibold px-4 py-3 rounded-xl transition-all duration-300"
                >
                  <span className="flex items-center gap-2">
                    <ArrowPathIcon className="w-4 h-4" />
                    Sync Emails
                  </span>
                  <ChevronRightIcon className="w-4 h-4 opacity-60" />
                </button>
                <div className="flex items-center justify-between bg-white/5 hover:bg-white/10 px-4 py-3 rounded-xl transition-all duration-300">
                  <span className="text-sm font-medium text-gray-300">Generate PDF Report</span>
                  <PDFButton expenses={expenses} categories={categories} />
                </div>
              </div>
            </GlassCard>

            {/* Pending Transactions */}
            {pendingTransactions.length > 0 && (
              <GlassCard className="overflow-hidden border-orange-500/20">
                <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-white">Pending Review</h3>
                    <p className="text-xs text-gray-500 mt-0.5">From email scan</p>
                  </div>
                  <span className="text-xs font-bold bg-orange-500 text-white px-2.5 py-1 rounded-full">
                    {pendingTransactions.length}
                  </span>
                </div>
                <div className="p-4 max-h-[340px] overflow-y-auto">
                  <PendingTransactions
                    transactions={pendingTransactions}
                    onProcess={handlePendingTransaction}
                    groups={groups}
                    userCategories={categories}
                  />
                </div>
              </GlassCard>
            )}

            {/* Manual Entry Form */}
            <GlassCard className="p-5">
              <SectionLabel>Add Expense</SectionLabel>
              <ExpenseForm categories={categories} onSave={handleAddExpense} />
            </GlassCard>

          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            FOOTER
        ══════════════════════════════════════════════════════════════════ */}
        <footer className="mt-12 pt-6 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
            <span>Connected · Build v2.0.8</span>
          </div>
          <span className="text-xs text-gray-700">Sync latency: 12ms</span>
        </footer>

      </main>

      {/* ── Toast notification (unchanged logic) ── */}
      {message.text && (
        <div
          className={`fixed bottom-8 right-8 z-[200] px-5 py-3 rounded-xl text-sm font-semibold shadow-lg transition-all duration-500 ${
            message.type === 'success'
              ? 'bg-green-500 text-white'
              : 'bg-red-500 text-white'
          }`}
        >
          {message.text}
        </div>
      )}
    </div>
  )
}