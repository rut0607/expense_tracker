export default function PetrolForm({ expenses, updateExpenses }) {
  const handleChange = (value) => {
    updateExpenses({ 
      ...expenses, 
      petrol: Number(value) || 0 
    })
  }

  return (
    <div className="bg-white shadow rounded-lg p-4 mb-4">
      <h2 className="text-xl font-bold mb-3">Petrol</h2>
      
      <div className="mb-3">
        <label className="block text-sm font-medium mb-1">Petrol Amount (₹)</label>
        <input
          type="number"
          min="0"
          value={expenses.petrol}
          onChange={(e) => handleChange(e.target.value)}
          className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>
  )
}