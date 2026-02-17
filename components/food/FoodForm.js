export default function FoodForm({ expenses, updateExpenses }) {
  const handleChange = (field, value) => {
    const newFood = { 
      ...expenses.food, 
      [field]: Number(value) || 0 
    }
    updateExpenses({ 
      ...expenses, 
      food: newFood 
    })
  }

  return (
    <div className="bg-white shadow rounded-lg p-4 mb-4">
      <h2 className="text-xl font-bold mb-3">Food</h2>
      
      <div className="mb-3">
        <label className="block text-sm font-medium mb-1">Breakfast (₹)</label>
        <input
          type="number"
          min="0"
          value={expenses.food.breakfast}
          onChange={(e) => handleChange('breakfast', e.target.value)}
          className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      
      <div className="mb-3">
        <label className="block text-sm font-medium mb-1">Lunch (₹)</label>
        <input
          type="number"
          min="0"
          value={expenses.food.lunch}
          onChange={(e) => handleChange('lunch', e.target.value)}
          className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      
      <div className="mb-3">
        <label className="block text-sm font-medium mb-1">Snacks (₹)</label>
        <input
          type="number"
          min="0"
          value={expenses.food.snacks}
          onChange={(e) => handleChange('snacks', e.target.value)}
          className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      
      <div className="mb-3">
        <label className="block text-sm font-medium mb-1">Dinner (₹)</label>
        <input
          type="number"
          min="0"
          value={expenses.food.dinner}
          onChange={(e) => handleChange('dinner', e.target.value)}
          className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>
  )
}