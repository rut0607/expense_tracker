import { generatePDF } from '@/utils/pdfGenerator'

export default function PDFButton({ expenses, date }) {
  return (
    <button
      onClick={() => generatePDF(expenses, date)}
      className="flex-1 bg-green-500 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-600 transition"
    >
      Generate PDF
    </button>
  )
}