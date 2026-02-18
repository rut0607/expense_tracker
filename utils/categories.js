import { supabase } from './supabase'

// Get all categories for a user
export const getUserCategories = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select(`
        *,
        category_fields (*)
      `)
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('order', { ascending: true })

    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Error fetching categories:', error)
    return { success: false, error: error.message }
  }
}

// Create a new category with fields
export const createCategory = async (userId, categoryData, fields = []) => {
  try {
    // Insert category
    const { data: category, error: catError } = await supabase
      .from('categories')
      .insert({
        user_id: userId,
        name: categoryData.name,
        icon: categoryData.icon,
        color: categoryData.color,
        order: categoryData.order || 0
      })
      .select()
      .single()

    if (catError) throw catError

    // Insert fields if any
    if (fields.length > 0) {
      const fieldsWithCategory = fields.map(field => ({
        ...field,
        category_id: category.id
      }))

      const { error: fieldsError } = await supabase
        .from('category_fields')
        .insert(fieldsWithCategory)

      if (fieldsError) throw fieldsError
    }

    return { success: true, data: category }
  } catch (error) {
    console.error('Error creating category:', error)
    return { success: false, error: error.message }
  }
}

// Update a category
export const updateCategory = async (categoryId, updates, fields = []) => {
  try {
    // Update category
    const { error: catError } = await supabase
      .from('categories')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', categoryId)

    if (catError) throw catError

    // Delete existing fields
    const { error: deleteError } = await supabase
      .from('category_fields')
      .delete()
      .eq('category_id', categoryId)

    if (deleteError) throw deleteError

    // Insert new fields
    if (fields.length > 0) {
      const fieldsWithCategory = fields.map(field => ({
        ...field,
        category_id: categoryId
      }))

      const { error: fieldsError } = await supabase
        .from('category_fields')
        .insert(fieldsWithCategory)

      if (fieldsError) throw fieldsError
    }

    return { success: true }
  } catch (error) {
    console.error('Error updating category:', error)
    return { success: false, error: error.message }
  }
}

// Delete a category
export const deleteCategory = async (categoryId) => {
  try {
    const { error } = await supabase
      .from('categories')
      .update({ is_active: false })
      .eq('id', categoryId)

    if (error) throw error
    return { success: true }
  } catch (error) {
    console.error('Error deleting category:', error)
    return { success: false, error: error.message }
  }
}