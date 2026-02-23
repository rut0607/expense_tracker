import { supabase } from './supabase'

// Save an expense
export const saveExpense = async (userId, expenseData) => {
  try {
    // Validate required fields
    if (!userId) throw new Error('User ID is required')
    if (!expenseData.category_id) throw new Error('Category ID is required')
    if (!expenseData.amount || isNaN(expenseData.amount) || expenseData.amount <= 0) {
      throw new Error('Valid amount is required')
    }

    const { data, error } = await supabase
      .from('expenses')
      .insert({
        user_id: userId,
        category_id: expenseData.category_id,
        expense_date: expenseData.date || new Date().toISOString().split('T')[0],
        amount: parseFloat(expenseData.amount),
        description: expenseData.description || '',
        fields: expenseData.fields || {}
      })
      .select()
      .single()

    if (error) throw error
    return { success: true, data }
  } catch (error) {
    console.error('Error saving expense:', error)
    return { success: false, error: error.message }
  }
}

// Get today's expenses
export const getTodayExpenses = async (userId) => {
  try {
    if (!userId) throw new Error('User ID is required')

    const today = new Date().toISOString().split('T')[0]
    
    const { data, error } = await supabase
      .from('expenses')
      .select(`
        *,
        categories (
          id,
          name,
          color,
          icon
        )
      `)
      .eq('user_id', userId)
      .eq('expense_date', today)
      .order('created_at', { ascending: false })

    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Error fetching today\'s expenses:', error)
    return { success: false, error: error.message }
  }
}

// Get expenses for a date range
export const getExpensesByDateRange = async (userId, startDate, endDate) => {
  try {
    if (!userId) throw new Error('User ID is required')
    if (!startDate || !endDate) throw new Error('Start and end dates are required')

    const { data, error } = await supabase
      .from('expenses')
      .select(`
        *,
        categories (
          id,
          name,
          color,
          icon
        )
      `)
      .eq('user_id', userId)
      .gte('expense_date', startDate)
      .lte('expense_date', endDate)
      .order('expense_date', { ascending: false })

    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Error fetching expenses:', error)
    return { success: false, error: error.message }
  }
}

// Get monthly expense summary by category
export const getMonthlyExpenses = async (userId, year, month) => {
  try {
    if (!userId) throw new Error('User ID is required')
    
    const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0]
    const endDate = new Date(year, month, 0).toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('expenses')
      .select(`
        amount,
        category_id,
        categories (
          id,
          name,
          color,
          icon
        )
      `)
      .eq('user_id', userId)
      .gte('expense_date', startDate)
      .lte('expense_date', endDate)

    if (error) throw error

    // Group by category
    const summary = {}
    data?.forEach(expense => {
      const catId = expense.category_id
      if (!summary[catId]) {
        summary[catId] = {
          category_id: catId,
          category: expense.categories,
          total: 0,
          count: 0
        }
      }
      summary[catId].total += expense.amount
      summary[catId].count++
    })

    return { 
      success: true, 
      data: Object.values(summary),
      total: data?.reduce((sum, e) => sum + e.amount, 0) || 0
    }
  } catch (error) {
    console.error('Error fetching monthly expenses:', error)
    return { success: false, error: error.message }
  }
}

// Delete an expense
export const deleteExpense = async (expenseId) => {
  try {
    if (!expenseId) throw new Error('Expense ID is required')

    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', expenseId)

    if (error) throw error
    return { success: true }
  } catch (error) {
    console.error('Error deleting expense:', error)
    return { success: false, error: error.message }
  }
}

// Update an expense
export const updateExpense = async (expenseId, updates) => {
  try {
    if (!expenseId) throw new Error('Expense ID is required')

    const { data, error } = await supabase
      .from('expenses')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', expenseId)
      .select()
      .single()

    if (error) throw error
    return { success: true, data }
  } catch (error) {
    console.error('Error updating expense:', error)
    return { success: false, error: error.message }
  }
}