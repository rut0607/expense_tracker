'use client'

export default function InsightsCards({ insights, summary }) {
  if (!insights?.length) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
        <p>Not enough data to generate insights yet.</p>
        <p className="text-sm mt-2">Keep adding expenses!</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {insights.map((insight, idx) => (
        <div key={idx} className={`bg-white rounded-lg shadow p-5 border-l-4 ${
          insight.type === 'alert' ? 'border-red-500' : 
          insight.type === 'trend' && insight.value > 0 ? 'border-green-500' : 'border-blue-500'
        }`}>
          <h3 className="font-semibold text-lg mb-1">{insight.title}</h3>
          <p className="text-gray-700">{insight.message}</p>
          {insight.details && (
            <div className="mt-3 text-sm bg-gray-50 p-3 rounded">
              {insight.details.map((d, i) => (
                <div key={i} className="flex justify-between mb-1">
                  <span>{new Date(d.date).toLocaleDateString()} - {d.category}</span>
                  <span className="font-medium">₹{d.amount}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Summary Card */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg shadow p-5">
        <h3 className="font-semibold text-lg mb-2">📋 Summary</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">This Month</p>
            <p className="text-xl font-bold">₹{summary?.currentTotal?.toFixed(0) || 0}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Daily Average</p>
            <p className="text-xl font-bold">₹{summary?.dailyAvg?.toFixed(0) || 0}</p>
          </div>
        </div>
      </div>
    </div>
  )
}