export default function ExtraList({ expenses, updateExpenses }) {
  const removeExtra = (indexToRemove) => {
    // Filter out the item at the specified index
    const updatedExtras = expenses.extra.filter((_, index) => index !== indexToRemove)
    
    // Update parent component
    updateExpenses({ 
      ...expenses, 
      extra: updatedExtras 
    })
  }

  // Don't show anything if no extras
  if (!expenses.extra || expenses.extra.length === 0) {
    return null
  }

  return (
    <div className="bg-white shadow rounded-lg p-4 mb-4">
      <h3 className="font-semibold mb-2">Added Extras:</h3>
      {expenses.extra.map((item, index) => (
        <div 
          key={index} 
          className="flex justify-between items-center mb-2 p-2 bg-gray-50 rounded"
        >
          <div>
            <span className="font-medium">{item.reason}:</span>{' '}
            <span className="text-green-600">₹{item.amount}</span>
          </div>
          <button
            onClick={() => removeExtra(index)}
            className="text-red-500 hover:text-red-700 text-sm font-medium"
          >
            ✕ Remove
          </button>
        </div>
      ))}
      
      {/* Show total for extras */}
      <div className="mt-3 pt-2 border-t border-gray-200 text-right">
        <span className="font-bold">
          Total: ₹{expenses.extra.reduce((sum, item) => sum + Number(item.amount), 0)}
        </span>
      </div>
    </div>
  )
}