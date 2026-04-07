'use client'

import { useState, useEffect } from 'react'
import { UserGroupIcon, CheckCircleIcon } from '@heroicons/react/24/outline'

export default function SplitSummary() {
  const [summary, setSummary] = useState({ totalPending: 0, groups: [] })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSummary()
  }, [])

  const loadSummary = async () => {
    try {
      const res = await fetch('/api/splits/summary')
      const data = await res.json()
      if (data.success) {
        setSummary(data.summary)
      }
    } catch (error) {
      console.error('Error loading split summary:', error)
    } finally {
      setLoading(false)
    }
  }

  const settleShare = async (shareId) => {
    try {
      const res = await fetch('/api/splits/settle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shareId })
      })
      if (res.ok) {
        loadSummary()
      }
    } catch (error) {
      console.error('Error settling share:', error)
    }
  }

  if (loading) {
    return <div className="text-center p-4">Loading...</div>
  }

  if (summary.groups.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
        <UserGroupIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p>No active splits</p>
        <p className="text-sm">Create a group to start splitting expenses</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="font-semibold mb-2">Total Pending</h3>
        <p className="text-3xl font-bold text-blue-600">₹{summary.totalPending}</p>
      </div>

      {summary.groups.map(group => (
        <div key={group.id} className="bg-white rounded-lg shadow p-4">
          <h4 className="font-medium mb-2">{group.name}</h4>
          <p className="text-sm text-gray-600 mb-2">
            Pending: ₹{group.pendingAmount}
          </p>
          
          {Object.values(group.balances).map((balance, idx) => (
            balance.pending.length > 0 && (
              <div key={idx} className="text-sm border-t pt-2 mt-2">
                <span className="font-medium">{balance.name}</span>
                {balance.pending.map((p, i) => (
                  <div key={i} className="flex justify-between items-center mt-1 pl-2">
                    <span>Owes {p.to}: ₹{p.amount}</span>
                    <button
                      onClick={() => settleShare(p.shareId)}
                      className="text-green-600 hover:text-green-700"
                    >
                      <CheckCircleIcon className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            )
          ))}
        </div>
      ))}
    </div>
  )
}