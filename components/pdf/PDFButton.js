'use client'

import { useState } from 'react'
import { generatePDF } from '@/utils/pdfGenerator'
import { ArrowDownTrayIcon, SparklesIcon } from '@heroicons/react/24/outline'

export default function PDFButton({ expenses, date }) {
  const [loading, setLoading] = useState(false)

  const handleGeneratePDF = async () => {
    if (!expenses || expenses.length === 0) {
      alert('No expenses to generate PDF')
      return
    }

    setLoading(true)
    try {
      // Simulate a small delay for "SaaS polish" or call directly
      await generatePDF(expenses, date)
    } catch (error) {
      console.error('PDF generation error:', error)
      alert('Failed to generate PDF. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleGeneratePDF}
      disabled={loading}
      className={`
        group relative overflow-hidden
        flex items-center gap-3 px-6 py-3.5 
        bg-zinc-950 text-white
        rounded-[20px] shadow-xl shadow-zinc-200/50
        transition-all duration-500 ease-out
        hover:bg-zinc-800 hover:scale-[1.02] hover:shadow-zinc-300/60
        active:scale-95 disabled:opacity-70 disabled:grayscale
      `}
    >
      {/* Animated Shine Effect on Hover */}
      <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      {/* Icon Logic */}
      <div className="relative">
        {loading ? (
          <div className="w-4 h-4 border-2 border-white/20 border-t-emerald-400 rounded-full animate-spin" />
        ) : (
          <ArrowDownTrayIcon className="w-4 h-4 text-emerald-400 group-hover:animate-bounce" />
        )}
      </div>

      {/* Label */}
      <span className="relative text-[11px] font-black uppercase tracking-[0.2em] transition-colors">
        {loading ? 'Compiling...' : 'Export PDF'}
      </span>
    </button>
  )
}