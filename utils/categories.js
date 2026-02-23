import { supabase } from './supabase'

// Get all categories for a user
export const getUserCategories = async (userId) => {
  try {
    if (!userId) throw new Error('User ID is required')

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

// Get category by ID
export const getCategoryById = async (categoryId, userId) => {
  try {
    if (!categoryId) throw new Error('Category ID is required')

    const { data, error } = await supabase
      .from('categories')
      .select(`
        *,
        category_fields (*)
      `)
      .eq('id', categoryId)
      .eq('user_id', userId)
      .eq('is_active', true)
      .single()

    if (error) throw error
    return { success: true, data }
  } catch (error) {
    console.error('Error fetching category:', error)
    return { success: false, error: error.message }
  }
}

// Create a new category with fields
export const createCategory = async (userId, categoryData, fields = []) => {
  try {
    if (!userId) throw new Error('User ID is required')
    if (!categoryData.name) throw new Error('Category name is required')

    // Check for duplicate name
    const { data: existing } = await supabase
      .from('categories')
      .select('id')
      .eq('user_id', userId)
      .eq('name', categoryData.name)
      .eq('is_active', true)
      .maybeSingle()

    if (existing) {
      throw new Error('A category with this name already exists')
    }

    // Insert category
    const { data: category, error: catError } = await supabase
      .from('categories')
      .insert({
        user_id: userId,
        name: categoryData.name,
        icon: categoryData.icon || '📝',
        color: categoryData.color || '#3B82F6',
        order: categoryData.order || 0
      })
      .select()
      .single()

    if (catError) throw catError

    // Insert fields if any
    if (fields.length > 0) {
      const fieldsWithCategory = fields.map((field, index) => ({
        ...field,
        category_id: category.id,
        order: index
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
    if (!categoryId) throw new Error('Category ID is required')

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
      const fieldsWithCategory = fields.map((field, index) => ({
        ...field,
        category_id: categoryId,
        order: index
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

// Delete a category (soft delete)
export const deleteCategory = async (categoryId) => {
  try {
    if (!categoryId) throw new Error('Category ID is required')

    const { error } = await supabase
      .from('categories')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', categoryId)

    if (error) throw error
    return { success: true }
  } catch (error) {
    console.error('Error deleting category:', error)
    return { success: false, error: error.message }
  }
}