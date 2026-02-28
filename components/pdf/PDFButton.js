'use client'

import { useState } from 'react'
import { generatePDF } from '@/utils/pdfGenerator'

export default function PDFButton({ expenses, date }) {
  const [loading, setLoading] = useState(false)

  const handleGeneratePDF = async () => {
    if (!expenses || expenses.length === 0) {
      alert('No expenses to generate PDF')
      return
    }

    setLoading(true)
    try {
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
      className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition disabled:bg-green-300"
    >
      {loading ? 'Generating...' : 'Download PDF'}
    </button>
  )
}