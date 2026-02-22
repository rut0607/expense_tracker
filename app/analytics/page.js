'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import AnalyticsDashboard from '@/components/analytics/AnalyticsDashboard'
import InsightsCards from '@/components/analytics/InsightsCards'

export default function AnalyticsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [insights, setInsights] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (session?.user?.id) {
      fetchInsights()
    }
  }, [session, status, router])

  const fetchInsights = async () => {
    try {
      const res = await fetch('/api/analytics/insights')
      const data = await res.json()
      setInsights(data)
    } catch (error) {
      console.error('Failed to fetch insights:', error)
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <>
        <Navbar />
        <div className="max-w-7xl mx-auto p-4 text-center">Loading...</div>
      </>
    )
  }

  return (
    <>
      <Navbar />
      <div className="max-w-7xl mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6">Analytics Dashboard</h1>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <AnalyticsDashboard />
          </div>
          <div className="md:col-span-1">
            <h2 className="text-lg font-semibold mb-4">💡 Smart Insights</h2>
            <InsightsCards insights={insights?.insights} summary={insights?.summary} />
          </div>
        </div>
      </div>
    </>
  )
}