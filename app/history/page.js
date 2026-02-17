'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import { supabase } from '@/utils/supabase'

export default function HistoryPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [expenses, setExpenses] = useState([])
  const [selectedDate, setSelectedDate] = useState(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (session?.user?.id) {
      loadExpenseHistory()
    }
  }, [session, status, router])

  const loadExpenseHistory = async () => {
  try {
    setLoading(true)
    console.log('1. Starting to load history...')
    console.log('2. User ID:', session?.user?.id)
    
    // First, check if user is authenticated
    if (!session?.user?.id) {
      console.error('No user ID found')
      return
    }

    // Test basic connection first
    console.log('3. Testing Supabase connection...')
    const { data: testData, error: testError } = await supabase
      .from('daily_expenses')
      .select('count', { count: 'exact', head: true })
    
    console.log('4. Connection test result:', { testData, testError })

    // Get all daily expenses for this user
    console.log('5. Fetching expenses for user:', session.user.id)
    
    const { data: dailyExpenses, error } = await supabase
      .from('daily_expenses')
      .select(`
        id,
        date,
        breakfast_amount,
        lunch_amount,
        snacks_amount,
        dinner_amount,
        petrol_amount,
        extra_expenses (
          amount,
          reason
        )
      `)
      .eq('user_id', session.user.id)
      .order('date', { ascending: false })

    console.log('6. Query result:', { dailyExpenses, error })

    if (error) {
      console.error('7. Supabase error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })
      throw error
    }

    console.log('8. Raw data received:', dailyExpenses)

    // Format the data
    const formattedExpenses = (dailyExpenses || []).map(day => {
      console.log('9. Processing day:', day.date)
      
      const foodTotal = (day.breakfast_amount || 0) + 
                       (day.lunch_amount || 0) + 
                       (day.snacks_amount || 0) + 
                       (day.dinner_amount || 0)
      
      const extraTotal = (day.extra_expenses || []).reduce(
        (sum, e) => sum + (e.amount || 0), 0
      )
      
      const grandTotal = foodTotal + (day.petrol_amount || 0) + extraTotal

      return {
        id: day.id,
        date: day.date,
        food: {
          breakfast: day.breakfast_amount || 0,
          lunch: day.lunch_amount || 0,
          snacks: day.snacks_amount || 0,
          dinner: day.dinner_amount || 0,
          total: foodTotal
        },
        petrol: day.petrol_amount || 0,
        extra: day.extra_expenses || [],
        extraTotal,
        grandTotal
      }
    })

    console.log('10. Formatted expenses:', formattedExpenses)
    setExpenses(formattedExpenses)
  } catch (error) {
    console.error('11. Error loading history - full error:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      error: error
    })
  } finally {
    setLoading(false)
    console.log('12. Loading complete')
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
        <div className="max-w-md mx-auto p-4 text-center">Loading...</div>
      </>
    )
  }

  return (
    <>
      <Navbar />
      <div className="max-w-md mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6">Expense History</h1>

        {expenses.length === 0 ? (
          <div className="bg-white shadow rounded-lg p-8 text-center">
            <p className="text-gray-500 mb-4">No expenses recorded yet</p>
            <Link href="/" className="text-blue-500 hover:text-blue-600">
              Add your first expense →
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {expenses.map((day) => (
              <div key={day.id} className="bg-white shadow rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-semibold">{formatDate(day.date)}</h3>
                  <span className="text-lg font-bold text-blue-600">
                    ₹{day.grandTotal}
                  </span>
                </div>
                
                <div className="text-sm text-gray-600 space-y-1">
                  <div className="flex justify-between">
                    <span>Food:</span>
                    <span>₹{day.food.total}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Petrol:</span>
                    <span>₹{day.petrol}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Extra:</span>
                    <span>₹{day.extraTotal}</span>
                  </div>
                  {day.extra.length > 0 && (
                    <div className="mt-2 pt-2 border-t text-xs">
                      {day.extra.map((e, i) => (
                        <div key={i} className="flex justify-between text-gray-500">
                          <span>{e.reason}:</span>
                          <span>₹{e.amount}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}