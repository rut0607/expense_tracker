'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import { getExpensesByDateRange } from '@/utils/expenses'

export default function HistoryPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [expenses, setExpenses] = useState([])
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7))

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (session?.user?.id) {
      loadExpenseHistory()
    }
  }, [session, status, router, selectedMonth])

  const loadExpenseHistory = async () => {
    try {
      setLoading(true)
      
      const [year, month] = selectedMonth.split('-')
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1).toISOString().split('T')[0]
      const endDate = new Date(parseInt(year), parseInt(month), 0).toISOString().split('T')[0]

      const result = await getExpensesByDateRange(session.user.id, startDate, endDate)
      
      if (result.success) {
        // Group expenses by date
        const groupedByDate = {}
        result.data.forEach(expense => {
          const date = expense.expense_date
          if (!groupedByDate[date]) {
            groupedByDate[date] = {
              date,
              expenses: [],
              total: 0
            }
          }
          groupedByDate[date].expenses.push(expense)
          groupedByDate[date].total += expense.amount
        })

        // Convert to array and sort by date
        const formattedExpenses = Object.values(groupedByDate).sort((a, b) => 
          new Date(b.date) - new Date(a.date)
        )

        setExpenses(formattedExpenses)
      }
    } catch (error) {
      console.error('Error loading history:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  if (status === 'loading' || loading) {
    return (
      <>
        <Navbar />
        <div className="max-w-4xl mx-auto p-4 text-center">Loading...</div>
      </>
    )
  }

  return (
    <>
      <Navbar />
      <div className="max-w-4xl mx-auto p-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Expense History</h1>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {expenses.length === 0 ? (
          <div className="bg-white shadow rounded-lg p-8 text-center">
            <p className="text-gray-500 mb-4">No expenses found for this month</p>
            <Link href="/" className="text-blue-500 hover:text-blue-600">
              Add your first expense →
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {expenses.map((day) => (
              <div key={day.date} className="bg-white shadow rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 border-b flex justify-between items-center">
                  <h3 className="font-semibold">{formatDate(day.date)}</h3>
                  <span className="text-lg font-bold text-blue-600">
                    ₹{day.total.toLocaleString()}
                  </span>
                </div>
                <div className="divide-y divide-gray-100">
                  {day.expenses.map((expense) => (
                    <div key={expense.id} className="p-4 hover:bg-gray-50">
                      <div className="flex justify-between items-start">
                        <div className="flex items-start space-x-3">
                          <div 
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm"
                            style={{ backgroundColor: expense.categories?.color || '#3B82F6' }}
                          >
                            {expense.categories?.icon || '📝'}
                          </div>
                          <div>
                            <h4 className="font-medium">{expense.categories?.name}</h4>
                            {expense.description && (
                              <p className="text-sm text-gray-600">{expense.description}</p>
                            )}
                            {expense.fields && Object.keys(expense.fields).length > 0 && (
                              <div className="mt-1 text-xs text-gray-500">
                                {Object.entries(expense.fields).map(([key, value]) => (
                                  <span key={key} className="mr-2">
                                    {key}: {value}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        <span className="font-bold text-blue-600">
                          ₹{expense.amount.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}