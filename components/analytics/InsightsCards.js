'use client'

import { useState } from 'react'

export default function InsightsCards({ insights, summary }) {
  const [expandedInsights, setExpandedInsights] = useState({})

  const toggleInsight = (index) => {
    setExpandedInsights(prev => ({
      ...prev,
      [index]: !prev[index]
    }))
  }

  if (!insights?.length) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
        <p className="mb-2">📊 No insights yet</p>
        <p className="text-sm">Keep adding expenses to get personalized insights!</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {insights.map((insight, idx) => {
        const isExpanded = expandedInsights[idx]
        const isAlert = insight.type === 'alert'
        const isPositive = insight.type === 'trend' && insight.value > 0
        
        return (
          <div 
            key={idx} 
            className={`bg-white rounded-lg shadow p-5 border-l-4 cursor-pointer hover:shadow-md transition ${
              isAlert ? 'border-red-500' : 
              isPositive ? 'border-green-500' : 'border-blue-500'
            }`}
            onClick={() => toggleInsight(idx)}
          >
            <h3 className="font-semibold text-lg mb-1 flex items-center">
              {insight.title}
              <span className="ml-2 text-sm text-gray-400">
                {isExpanded ? '▼' : '▶'}
              </span>
            </h3>
            
            <p className="text-gray-700">{insight.message}</p>
            
            {isExpanded && insight.details && (
              <div className="mt-3 text-sm bg-gray-50 p-3 rounded-lg">
                {insight.details.map((d, i) => (
                  <div key={i} className="flex justify-between mb-1 last:mb-0">
                    <span className="text-gray-600">
                      {new Date(d.date).toLocaleDateString('en-IN')} - {d.category}
                    </span>
                    <span className="font-medium">₹{d.amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}

      {/* Summary Card */}
      {summary && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg shadow p-5">
          <h3 className="font-semibold text-lg mb-3">📋 Monthly Summary</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/50 p-3 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Total Spent</p>
              <p className="text-xl font-bold text-blue-600">
                ₹{summary.currentTotal?.toFixed(0) || 0}
              </p>
            </div>
            <div className="bg-white/50 p-3 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Daily Average</p>
              <p className="text-xl font-bold text-purple-600">
                ₹{summary.dailyAvg?.toFixed(0) || 0}
              </p>
            </div>
          </div>
          
          {summary.saved > 0 && (
            <div className="mt-3 p-3 bg-green-50 rounded-lg">
              <p className="text-sm text-green-700">
                💰 You saved ₹{summary.saved.toFixed(0)} this month!
              </p>
            </div>
          )}
          
          {summary.allowance > 0 && summary.saved < 0 && (
            <div className="mt-3 p-3 bg-yellow-50 rounded-lg">
              <p className="text-sm text-yellow-700">
                ⚠️ You overspent by ₹{Math.abs(summary.saved).toFixed(0)} this month
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}