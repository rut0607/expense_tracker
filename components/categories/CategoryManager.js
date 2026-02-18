'use client'

import { useState } from 'react'
import CategoryForm from './CategoryForm'
import CategoryList from './CategoryList'
import { createCategory, updateCategory, deleteCategory } from '@/utils/categories'

export default function CategoryManager({ categories, onUpdate, userId }) {
  const [editingCategory, setEditingCategory] = useState(null)
  const [showForm, setShowForm] = useState(false)

  const handleSaveCategory = async (categoryData, fields) => {
    let result
    
    if (editingCategory) {
      result = await updateCategory(editingCategory.id, categoryData, fields)
    } else {
      result = await createCategory(userId, categoryData, fields)
    }

    if (result.success) {
      setShowForm(false)
      setEditingCategory(null)
      onUpdate() // Reload categories
    } else {
      alert('Error: ' + result.error)
    }
  }

  const handleDeleteCategory = async (categoryId) => {
    if (!confirm('Are you sure? This will delete all expenses in this category.')) return
    
    const result = await deleteCategory(categoryId)
    if (result.success) {
      onUpdate()
    } else {
      alert('Error: ' + result.error)
    }
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">My Categories</h2>
        <button
          onClick={() => {
            setEditingCategory(null)
            setShowForm(!showForm)
          }}
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
        >
          + New Category
        </button>
      </div>

      {showForm && (
        <div className="mb-6 p-4 border rounded-lg bg-gray-50">
          <h3 className="font-medium mb-4">
            {editingCategory ? 'Edit Category' : 'Create New Category'}
          </h3>
          <CategoryForm
            initialData={editingCategory}
            onSave={handleSaveCategory}
            onCancel={() => {
              setShowForm(false)
              setEditingCategory(null)
            }}
          />
        </div>
      )}

      <CategoryList
        categories={categories}
        onEdit={(category) => {
          setEditingCategory(category)
          setShowForm(true)
        }}
        onDelete={handleDeleteCategory}
      />
    </div>
  )
}