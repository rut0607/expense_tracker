'use client'

import { useState, useEffect } from 'react'
import {
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CalendarIcon,
  CurrencyRupeeIcon,
} from '@heroicons/react/24/outline'

export default function AnalyticsDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const fetchAnalytics = async () => {
    try {
      // Get current month
      const today = new Date()
      const currentMonth = today.toISOString().slice(0, 7)
      
      // Fetch category analysis for current month
      const categoryRes = await fetch(`/api/analytics/categories?month=${currentMonth}`)
      const categoryResult = await categoryRes.json()
      
      // Fetch trends for daily average
      const trendsRes = await fetch('/api/analytics/trends?months=1')
      const trendsResult = await trendsRes.json()
      
      console.log('Category data:', categoryResult)
      console.log('Trends data:', trendsResult)
      
      if (categoryResult.success) {
        // Transform data for dashboard
        const analysis = categoryResult.analysis
        const todayStr = today.toISOString().split('T')[0]
        
        // Calculate today's spending from dailySpending
        const todaySpent = analysis.dailySpending?.[todayStr] || 0
        
        // Calculate this week's spending
        const weekAgo = new Date()
        weekAgo.setDate(weekAgo.getDate() - 7)
        let weekTotal = 0
        Object.entries(analysis.dailySpending || {}).forEach(([date, amount]) => {
          if (date >= weekAgo.toISOString().split('T')[0]) {
            weekTotal += amount
          }
        })
        
        setData({
          periods: {
            today: todaySpent,
            week: weekTotal,
            month: analysis.summary.totalSpent || 0
          },
          averages: {
            daily: analysis.summary.averagePerDay || 0
          },
          categories: analysis.categories || [],
          insights: {
            topCategory: analysis.categories?.[0] || null
          }
        })
      } else {
        setError(categoryResult.error || 'Failed to load analytics')
      }
    } catch (err) {
      console.error('Fetch error:', err)
      setError('Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
        Error: {error}
      </div>
    )
  }

  if (!data || !data.periods || data.periods.month === 0) {
    return (
      <div className="bg-white shadow rounded-lg p-8 text-center">
        <h2 className="text-xl font-semibold mb-2">No Data Yet</h2>
        <p className="text-gray-600">
          Start adding expenses to see your analytics dashboard!
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-gray-500 text-sm">Today</div>
            <CalendarIcon className="w-5 h-5 text-blue-500" />
          </div>
          <div className="text-2xl font-bold">₹{data.periods.today?.toLocaleString() || 0}</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-gray-500 text-sm">This Week</div>
            <ArrowTrendingUpIcon className="w-5 h-5 text-green-500" />
          </div>
          <div className="text-2xl font-bold">₹{data.periods.week?.toLocaleString() || 0}</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-gray-500 text-sm">This Month</div>
            <CurrencyRupeeIcon className="w-5 h-5 text-purple-500" />
          </div>
          <div className="text-2xl font-bold">₹{data.periods.month?.toLocaleString() || 0}</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-gray-500 text-sm">Daily Avg</div>
            <ArrowTrendingDownIcon className="w-5 h-5 text-orange-500" />
          </div>
          <div className="text-2xl font-bold">
            ₹{Math.round(data.averages?.daily || 0).toLocaleString()}
          </div>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Spending by Category</h2>
        <div className="space-y-4">
          {data.categories && data.categories.length > 0 ? (
            data.categories.map((category, index) => (
              <div key={index}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="flex items-center">
                    <span className="mr-2">{category.icon || '📝'}</span>
                    {category.name}
                  </span>
                  <span className="font-medium">₹{category.total?.toLocaleString() || 0}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="h-2 rounded-full"
                    style={{
                      width: `${((category.total || 0) / (data.periods?.month || 1) * 100)}%`,
                      backgroundColor: category.color || '#3B82F6'
                    }}
                  />
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-center">No category data available</p>
          )}
        </div>
      </div>

      {/* Insights Card */}
      {data.insights?.topCategory && (
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow p-6 text-white">
          <h3 className="text-lg font-semibold mb-2">💡 Insight</h3>
          <p className="text-xl">
            Your highest spending category is{' '}
            <span className="font-bold">
              {data.insights.topCategory.icon || '📝'} {data.insights.topCategory.name}
            </span>{' '}
            at ₹{(data.insights.topCategory.total || 0).toLocaleString()} this month.
          </p>
        </div>
      )}
    </div>
  )
}