'use client'

export default function CategoryList({ categories, onEdit, onDelete }) {
  if (categories.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="mb-2">No categories yet</p>
        <p className="text-sm">Create your first category to start tracking expenses</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {categories.map(category => (
        <div
          key={category.id}
          className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
        >
          <div className="flex items-center space-x-3">
            <div 
              className="w-8 h-8 rounded-full flex items-center justify-center text-white"
              style={{ backgroundColor: category.color }}
            >
              <span className="text-sm">{category.icon}</span>
            </div>
            <div>
              <h3 className="font-medium">{category.name}</h3>
              <p className="text-xs text-gray-500">
                {category.category_fields?.length || 0} fields
              </p>
            </div>
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={() => onEdit(category)}
              className="text-blue-500 hover:text-blue-600 text-sm px-2"
            >
              Edit
            </button>
            <button
              onClick={() => onDelete(category.id)}
              className="text-red-500 hover:text-red-600 text-sm px-2"
            >
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}