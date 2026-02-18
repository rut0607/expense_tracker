import { supabase } from './supabase'

// Save an expense
export const saveExpense = async (userId, expenseData) => {
  try {
    const { data, error } = await supabase
      .from('expenses')
      .insert({
        user_id: userId,
        category_id: expenseData.category_id,
        expense_date: expenseData.date || new Date().toISOString().split('T')[0],
        amount: expenseData.amount,
        description: expenseData.description,
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
    const today = new Date().toISOString().split('T')[0]
    
    const { data, error } = await supabase
      .from('expenses')
      .select(`
        *,
        categories (
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
    const { data, error } = await supabase
      .from('expenses')
      .select(`
        *,
        categories (
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

// Delete an expense
export const deleteExpense = async (expenseId) => {
  try {
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