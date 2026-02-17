'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import FoodForm from '@/components/food/FoodForm'
import PetrolForm from '@/components/petrol/PetrolForm'
import ExtraForm from '@/components/extra/ExtraForm'
import ExtraList from '@/components/extra/ExtraList'
import PDFButton from '@/components/pdf/PDFButton'
import Navbar from '@/components/Navbar'
import { getTodayExpenses, saveTodayExpenses } from '@/utils/storage'

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  const [expenses, setExpenses] = useState({
    food: { breakfast: 0, lunch: 0, snacks: 0, dinner: 0 },
    petrol: 0,
    extra: []
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  // Load today's expenses when page loads
  useEffect(() => {
    if (session?.user?.id) {
      loadExpenses()
    }
  }, [session])

  const loadExpenses = async () => {
    setLoading(true)
    try {
      const data = await getTodayExpenses(session.user.id)
      setExpenses(data)
    } catch (error) {
      console.error('Error loading expenses:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage('')
    
    try {
      const result = await saveTodayExpenses(expenses, session.user.id)
      
      if (result.success) {
        setMessage('Expenses saved successfully!')
        setTimeout(() => setMessage(''), 3000)
      } else {
        setMessage('Error saving expenses. Please try again.')
      }
    } catch (error) {
      console.error('Error saving:', error)
      setMessage('Error saving expenses. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const updateExpenses = (newExpenses) => {
    setExpenses(newExpenses)
  }

  const formattedDate = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })

  if (status === 'loading' || loading) {
    return (
      <>
        <Navbar />
        <div className="max-w-md mx-auto p-4 text-center">
          Loading...
        </div>
      </>
    )
  }

  return (
    <>
      <Navbar />
      <main className="max-w-md mx-auto p-4">
        <h1 className="text-2xl font-bold mb-2">Daily Expense Tracker</h1>
        <p className="text-gray-600 mb-6">{formattedDate}</p>
        
        {message && (
          <div className={`p-3 mb-4 rounded ${
            message.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
          }`}>
            {message}
          </div>
        )}
        
        <FoodForm expenses={expenses} updateExpenses={updateExpenses} />
        <PetrolForm expenses={expenses} updateExpenses={updateExpenses} />
        <ExtraForm expenses={expenses} updateExpenses={updateExpenses} />
        <ExtraList expenses={expenses} updateExpenses={updateExpenses} />
        
        <div className="flex gap-3 mt-6">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-blue-500 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-600 transition disabled:bg-blue-300"
          >
            {saving ? 'Saving...' : 'Save Day'}
          </button>
          
          <PDFButton expenses={expenses} date={formattedDate} />
        </div>
      </main>
    </>
  )
}