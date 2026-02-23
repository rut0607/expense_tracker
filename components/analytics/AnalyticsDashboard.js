'use client'

import { useState, useEffect } from 'react'
import {
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CalendarIcon,
  CurrencyRupeeIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'

export default function AnalyticsDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const fetchAnalytics = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }
    
    try {
      const res = await fetch('/api/analytics/summary')
      const result = await res.json()
      
      if (result.success) {
        setData(result.data)
        setError('')
      } else {
        setError(result.error || 'Failed to load analytics')
      }
    } catch (err) {
      console.error('Fetch error:', err)
      setError('Failed to load analytics')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const SummaryCard = ({ title, value, icon: Icon, color, loading: cardLoading }) => (
    <div className="bg-white rounded-lg shadow p-6 relative">
      {(loading || cardLoading) ? (
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-8 bg-gray-300 rounded w-2/3"></div>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-2">
            <div className="text-gray-500 text-sm">{title}</div>
            <Icon className={`w-5 h-5 text-${color}-500`} />
          </div>
          <div className="text-2xl font-bold">₹{value?.toLocaleString() || 0}</div>
        </>
      )}
    </div>
  )

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
        <p className="font-medium">Error: {error}</p>
        <button
          onClick={() => fetchAnalytics()}
          className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
        >
          Try again
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Refresh */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Overview</h2>
        <button
          onClick={() => fetchAnalytics(true)}
          disabled={refreshing}
          className="flex items-center space-x-2 text-sm text-gray-600 hover:text-blue-600 transition disabled:opacity-50"
        >
          <ArrowPathIcon className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <SummaryCard 
          title="Today" 
          value={data?.periods?.today} 
          icon={CalendarIcon} 
          color="blue"
          loading={loading}
        />
        <SummaryCard 
          title="This Week" 
          value={data?.periods?.week} 
          icon={ArrowTrendingUpIcon} 
          color="green"
          loading={loading}
        />
        <SummaryCard 
          title="This Month" 
          value={data?.periods?.month} 
          icon={CurrencyRupeeIcon} 
          color="purple"
          loading={loading}
        />
        <SummaryCard 
          title="Daily Avg" 
          value={Math.round(data?.averages?.daily || 0)} 
          icon={ArrowTrendingDownIcon} 
          color="orange"
          loading={loading}
        />
      </div>

      {/* No Data Message */}
      {!loading && (!data?.periods || data.periods.month === 0) && (
        <div className="bg-white shadow rounded-lg p-8 text-center">
          <h2 className="text-xl font-semibold mb-2">No Data Yet</h2>
          <p className="text-gray-600">
            Start adding expenses to see your analytics dashboard!
          </p>
        </div>
      )}

      {/* Category Breakdown */}
      {!loading && data?.categories?.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Spending by Category</h2>
          <div className="space-y-4">
            {data.categories.map((category, index) => (
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
                    className="h-2 rounded-full transition-all duration-500"
                    style={{
                      width: `${((category.total || 0) / (data.periods?.month || 1) * 100)}%`,
                      backgroundColor: category.color || '#3B82F6'
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Insights Card */}
      {!loading && data?.insights?.topCategory && (
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