import { supabase } from './supabase'

// Helper function to validate UUID format
const isValidUUID = (uuid) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

// NEW: Helper function to get real UUID from email
// Simplified helper function to get real UUID from email
const getRealUserId = async (userId, email) => {
  console.log('🔍 getRealUserId called with:', { userId, email })
  
  // If it's already a valid UUID, return it
  if (isValidUUID(userId)) {
    console.log('✅ userId is already valid UUID:', userId)
    return userId
  }
  
  // If we have an email, look up the user in public.users
  if (email) {
    console.log('🔍 Looking up user by email in public.users:', email)
    
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle()
    
    if (error) {
      console.error('Error looking up user by email:', error)
      return null
    }
    
    if (data) {
      console.log('✅ Found user UUID:', data.id)
      return data.id
    } else {
      console.log('❌ No user found with email:', email)
    }
  }
  
  return null
}

// Helper function to log errors consistently
const logError = (context, error, additionalInfo = {}) => {
  console.error(`🔴 Error in ${context}:`, {
    message: error.message,
    details: error.details,
    hint: error.hint,
    code: error.code,
    ...additionalInfo
  })
}

export const getTodayDate = () => {
  const today = new Date()
  return today.toISOString().split('T')[0]
}

// UPDATED: Now accepts email parameter
export const getTodayExpenses = async (userId, userEmail) => {
  try {
    // Get the real UUID first
    const realUserId = await getRealUserId(userId, userEmail)
    
    if (!realUserId) {
      console.error('🔴 Could not resolve real user ID')
      return {
        food: { breakfast: 0, lunch: 0, snacks: 0, dinner: 0 },
        petrol: 0,
        extra: []
      }
    }

    const today = getTodayDate()
    console.log('📅 Fetching expenses for:', { realUserId, today })
    
    // Get the daily expense record for today for this user
    const { data: dailyExpense, error: dailyError } = await supabase
      .from('daily_expenses')
      .select('*')
      .eq('date', today)
      .eq('user_id', realUserId)
      .maybeSingle()

    if (dailyError) {
      logError('getTodayExpenses - daily', dailyError, { userId: realUserId, today })
    }

    if (!dailyExpense) {
      console.log('ℹ️ No existing expense found for today')
      return {
        food: { breakfast: 0, lunch: 0, snacks: 0, dinner: 0 },
        petrol: 0,
        extra: []
      }
    }

    // Get extra expenses for today for this user
    const { data: extraExpenses, error: extraError } = await supabase
      .from('extra_expenses')
      .select('amount, reason')
      .eq('daily_expense_id', dailyExpense.id)
      .eq('user_id', realUserId)

    if (extraError) {
      logError('getTodayExpenses - extra', extraError, { dailyExpenseId: dailyExpense.id })
    }

    return {
      food: {
        breakfast: dailyExpense.breakfast_amount || 0,
        lunch: dailyExpense.lunch_amount || 0,
        snacks: dailyExpense.snacks_amount || 0,
        dinner: dailyExpense.dinner_amount || 0
      },
      petrol: dailyExpense.petrol_amount || 0,
      extra: extraExpenses || []
    }
  } catch (error) {
    logError('getTodayExpenses - catch', error)
    return {
      food: { breakfast: 0, lunch: 0, snacks: 0, dinner: 0 },
      petrol: 0,
      extra: []
    }
  }
}

// UPDATED: Now accepts email parameter
export const saveTodayExpenses = async (expenses, userId, userEmail) => {
  try {
    // Get the real UUID first
    const realUserId = await getRealUserId(userId, userEmail)
    
    if (!realUserId) {
      console.error('🔴 Could not resolve real user ID for save')
      return { success: false, error: 'Could not resolve user ID' }
    }

    const today = getTodayDate()
    console.log('💾 Saving expenses for:', { realUserId, today })
    
    // Check if there's an existing record for today for this user
    const { data: existingRecord, error: fetchError } = await supabase
      .from('daily_expenses')
      .select('id')
      .eq('date', today)
      .eq('user_id', realUserId)
      .maybeSingle()

    if (fetchError) {
      logError('saveTodayExpenses - fetch', fetchError, { userId: realUserId, today })
      return { success: false, error: fetchError.message }
    }

    let dailyExpenseId

    if (existingRecord) {
      console.log('ℹ️ Updating existing record:', existingRecord.id)
      
      // Update existing record
      const { error: updateError } = await supabase
        .from('daily_expenses')
        .update({
          breakfast_amount: expenses.food.breakfast,
          lunch_amount: expenses.food.lunch,
          snacks_amount: expenses.food.snacks,
          dinner_amount: expenses.food.dinner,
          petrol_amount: expenses.petrol,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingRecord.id)
        .eq('user_id', realUserId)

      if (updateError) {
        logError('saveTodayExpenses - update', updateError, { recordId: existingRecord.id })
        return { success: false, error: updateError.message }
      }
      
      dailyExpenseId = existingRecord.id

      // Delete old extra expenses
      const { error: deleteError } = await supabase
        .from('extra_expenses')
        .delete()
        .eq('daily_expense_id', existingRecord.id)
        .eq('user_id', realUserId)

      if (deleteError) {
        logError('saveTodayExpenses - delete extras', deleteError, { recordId: existingRecord.id })
        return { success: false, error: deleteError.message }
      }

    } else {
      console.log('ℹ️ Creating new record')
      
      // Insert new record
      const { data: newRecord, error: insertError } = await supabase
        .from('daily_expenses')
        .insert({
          date: today,
          user_id: realUserId,
          breakfast_amount: expenses.food.breakfast,
          lunch_amount: expenses.food.lunch,
          snacks_amount: expenses.food.snacks,
          dinner_amount: expenses.food.dinner,
          petrol_amount: expenses.petrol
        })
        .select('id')
        .single()

      if (insertError) {
        logError('saveTodayExpenses - insert', insertError)
        return { success: false, error: insertError.message }
      }
      
      dailyExpenseId = newRecord.id
    }

    // Insert new extra expenses
    if (expenses.extra && expenses.extra.length > 0) {
      console.log('ℹ️ Saving extra expenses:', expenses.extra.length)
      
      // Validate each extra item
      const validExtras = expenses.extra.filter(item => 
        item && 
        typeof item.amount === 'number' && 
        item.amount > 0 && 
        item.reason && 
        item.reason.trim() !== ''
      )

      if (validExtras.length > 0) {
        const extraRecords = validExtras.map(item => ({
          daily_expense_id: dailyExpenseId,
          user_id: realUserId,
          amount: item.amount,
          reason: item.reason.trim()
        }))

        const { error: extraInsertError } = await supabase
          .from('extra_expenses')
          .insert(extraRecords)

        if (extraInsertError) {
          logError('saveTodayExpenses - insert extras', extraInsertError, { 
            recordCount: validExtras.length 
          })
          return { success: false, error: extraInsertError.message }
        }
        
        console.log('✅ Extra expenses saved successfully')
      }
    }

    console.log('✅ All expenses saved successfully')
    return { success: true }
  } catch (error) {
    logError('saveTodayExpenses - catch', error)
    return { success: false, error: error.message }
  }
}