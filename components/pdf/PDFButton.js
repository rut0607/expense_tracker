'use client'

import { generatePDF } from '@/utils/pdfGenerator'

export default function PDFButton({ expenses, categories, date }) {
  const handleGeneratePDF = () => {
    if (!expenses || expenses.length === 0) {
      alert('No expenses to generate PDF')
      return
    }
    
    generatePDF(expenses, categories, date)
  }

  return (
    <button
      onClick={handleGeneratePDF}
      className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition flex items-center space-x-2"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <span>Download PDF</span>
    </button>
  )
}