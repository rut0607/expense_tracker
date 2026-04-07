import { supabase } from '@/lib/supabase/client'
import { validateExpense } from '@/lib/validators/expenses'
import { AppError, NotFoundError } from '@/lib/utils/errors'
import { createLogger } from '@/lib/utils/logger'

const logger = createLogger('ExpenseService')

export class ExpenseService {
  constructor(userId) {
    this.userId = userId
    this.supabase = supabase.getClient()
  }

  // New method: Validate fields based on category configuration
  async validateCategoryFields(categoryId, fields = {}) {
    try {
      // Get category with its fields
      const { data: category, error } = await this.supabase
        .from('categories')
        .select(`
          *,
          category_fields (
            id,
            field_name,
            field_type,
            is_required,
            placeholder,
            options
          )
        `)
        .eq('id', categoryId)
        .eq('user_id', this.userId)
        .single()
      
      if (error || !category) {
        logger.error('Category not found for field validation', { categoryId, error })
        throw new NotFoundError('Category')
      }
      
      const errors = []
      const validatedFields = {}
      
      // If category has no fields, return empty object
      if (!category.category_fields || category.category_fields.length === 0) {
        return {}
      }
      
      // Validate each field based on its configuration
      category.category_fields.forEach(field => {
        const value = fields[field.field_name]
        
        // Check required fields
        if (field.is_required && (value === undefined || value === null || value === '')) {
          errors.push({
            field: field.field_name,
            message: `${field.field_name} is required`
          })
          return
        }
        
        // Skip validation if value is not provided and field is not required
        if (!field.is_required && (value === undefined || value === null || value === '')) {
          validatedFields[field.field_name] = null
          return
        }
        
        // Validate based on field type
        switch (field.field_type) {
          case 'number':
            if (isNaN(parseFloat(value))) {
              errors.push({
                field: field.field_name,
                message: `${field.field_name} must be a number`
              })
            } else {
              validatedFields[field.field_name] = parseFloat(value)
            }
            break
            
          case 'boolean':
            validatedFields[field.field_name] = Boolean(value)
            break
            
          case 'select':
            if (field.options && Array.isArray(field.options)) {
              if (!field.options.includes(value)) {
                errors.push({
                  field: field.field_name,
                  message: `${field.field_name} must be one of: ${field.options.join(', ')}`
                })
              } else {
                validatedFields[field.field_name] = value
              }
            } else {
              validatedFields[field.field_name] = value
            }
            break
            
          case 'date':
            const date = new Date(value)
            if (isNaN(date.getTime())) {
              errors.push({
                field: field.field_name,
                message: `${field.field_name} must be a valid date`
              })
            } else {
              validatedFields[field.field_name] = date.toISOString().split('T')[0]
            }
            break
            
          default: // text and other types
            validatedFields[field.field_name] = String(value).trim()
        }
      })
      
      if (errors.length > 0) {
        throw new AppError(JSON.stringify(errors), 400)
      }
      
      return validatedFields
    } catch (error) {
      logger.error('Field validation failed', error, { userId: this.userId, categoryId, fields })
      throw error
    }
  }

  // Updated create method with field validation
  async create(data) {
    try {
      // Validate basic expense data
      const validation = validateExpense(data)
      if (!validation.isValid) {
        throw new AppError(JSON.stringify(validation.errors), 400)
      }

      // Validate category fields
      const validatedFields = await this.validateCategoryFields(
        validation.data.category_id, 
        data.fields || {}
      )

      // Check budget limits
      await this.checkBudgetLimit(validation.data.category_id, validation.data.amount)

      // Create expense with validated fields
      const { data: expense, error } = await this.supabase
        .from('expenses')
        .insert({
          ...validation.data,
          fields: validatedFields,
          user_id: this.userId
        })
        .select(`
          *,
          categories (
            id,
            name,
            icon,
            color,
            category_fields (
              field_name,
              field_type,
              placeholder,
              is_required,
              options
            )
          )
        `)
        .single()

      if (error) {
        logger.error('Failed to create expense', error)
        throw new AppError(error.message, 400)
      }

      // Check if we need to notify about budget (async, don't await)
      this.checkAndNotifyBudget(expense).catch(err => {
        logger.error('Failed to check budget notification', err)
      })

      return expense
    } catch (error) {
      logger.error('Expense creation failed', error, { userId: this.userId, data })
      throw error
    }
  }

  // Updated update method with field validation
  async update(expenseId, data) {
    try {
      // First verify ownership and get current expense
      const existingExpense = await this.getById(expenseId)
      
      // Validate basic expense data (if provided)
      const validationData = {
        category_id: data.categoryId || existingExpense.category_id,
        amount: data.amount || existingExpense.amount,
        description: data.description || existingExpense.description,
        expense_date: data.expense_date || existingExpense.expense_date,
        fields: data.fields || existingExpense.fields
      }
      
      const validation = validateExpense(validationData)
      if (!validation.isValid) {
        throw new AppError(JSON.stringify(validation.errors), 400)
      }

      // Validate fields if category changed or fields provided
      let validatedFields = existingExpense.fields
      if (data.fields || data.categoryId) {
        const categoryId = data.categoryId || existingExpense.category_id
        validatedFields = await this.validateCategoryFields(
          categoryId,
          data.fields || existingExpense.fields || {}
        )
      }

      // Check budget limits if amount changed
      if (data.amount && data.amount !== existingExpense.amount) {
        const amountDiff = data.amount - existingExpense.amount
        if (amountDiff > 0) {
          await this.checkBudgetLimit(
            existingExpense.category_id,
            amountDiff,
            existingExpense.expense_date
          )
        }
      }

      // Update expense
      const { data: updated, error } = await this.supabase
        .from('expenses')
        .update({
          ...(data.amount && { amount: data.amount }),
          ...(data.description && { description: data.description }),
          ...(data.expense_date && { expense_date: data.expense_date }),
          ...(data.categoryId && { category_id: data.categoryId }),
          fields: validatedFields,
          updated_at: new Date().toISOString()
        })
        .eq('id', expenseId)
        .eq('user_id', this.userId)
        .select(`
          *,
          categories (
            name,
            icon,
            color
          )
        `)
        .single()

      if (error) {
        throw new AppError(error.message, 400)
      }

      return updated
    } catch (error) {
      logger.error('Expense update failed', error, { userId: this.userId, expenseId, data })
      throw error
    }
  }

  // Enhanced getById to include field information
  async getById(expenseId) {
    const { data, error } = await this.supabase
      .from('expenses')
      .select(`
        *,
        categories (
          id,
          name,
          icon,
          color,
          category_fields (
            field_name,
            field_type,
            placeholder,
            is_required,
            options
          )
        )
      `)
      .eq('id', expenseId)
      .eq('user_id', this.userId)
      .single()

    if (error || !data) {
      throw new NotFoundError('Expense')
    }

    return data
  }

  // Enhanced getMonthlySummary to include fields in response
  async getMonthlySummary(month) {
    try {
      const startDate = month
      const nextMonth = new Date(month)
      nextMonth.setMonth(nextMonth.getMonth() + 1)
      const endDate = nextMonth.toISOString().split('T')[0]

      const { data, error } = await this.supabase
        .from('expenses')
        .select(`
          *,
          categories (
            id,
            name,
            icon,
            color,
            category_fields (
              field_name,
              field_type
            )
          )
        `)
        .eq('user_id', this.userId)
        .gte('expense_date', startDate)
        .lt('expense_date', endDate)
        .order('expense_date', { ascending: false })

      if (error) {
        logger.error('Failed to fetch monthly summary', error)
        throw new AppError(error.message, 400)
      }

      // Calculate totals by category
      const categoryTotals = {}
      data.forEach(expense => {
        const categoryId = expense.categories?.id || 'uncategorized'
        if (!categoryTotals[categoryId]) {
          categoryTotals[categoryId] = {
            id: categoryId,
            name: expense.categories?.name || 'Uncategorized',
            icon: expense.categories?.icon || '📦',
            color: expense.categories?.color || '#6B7280',
            total: 0,
            count: 0,
            fields: expense.categories?.category_fields || []
          }
        }
        categoryTotals[categoryId].total += expense.amount
        categoryTotals[categoryId].count++
      })

      return {
        expenses: data,
        summary: {
          total: data.reduce((sum, e) => sum + e.amount, 0),
          count: data.length,
          byCategory: categoryTotals
        }
      }
    } catch (error) {
      logger.error('Failed to get monthly summary', error, { userId: this.userId, month })
      throw error
    }
  }

  // Enhanced checkBudgetLimit to handle specific month
  async checkBudgetLimit(categoryId, amount, expenseDate = new Date()) {
    // Get the month from expense date
    const date = new Date(expenseDate)
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`

    const { data: budget, error } = await this.supabase
      .from('budgets')
      .select('monthly_limit')
      .eq('user_id', this.userId)
      .eq('category_id', categoryId)
      .eq('month', month)
      .maybeSingle()

    if (error) {
      logger.error('Failed to check budget', error)
      return // Don't block expense if budget check fails
    }

    if (!budget) return

    // Calculate spent so far this month (excluding current expense if updating)
    const { data: expenses, error: expensesError } = await this.supabase
      .from('expenses')
      .select('amount')
      .eq('user_id', this.userId)
      .eq('category_id', categoryId)
      .gte('expense_date', month)

    if (expensesError) {
      logger.error('Failed to calculate spent amount', expensesError)
      return
    }

    const spent = expenses?.reduce((sum, e) => sum + e.amount, 0) || 0

    if (spent + amount > budget.monthly_limit) {
      throw new AppError('This expense would exceed your monthly budget for this category', 400)
    }
  }

  async checkAndNotifyBudget(expense) {
    try {
      // Get current month's spending for this category
      const month = expense.expense_date.substring(0, 7) + '-01'
      
      const { data: expenses } = await this.supabase
        .from('expenses')
        .select('amount')
        .eq('user_id', this.userId)
        .eq('category_id', expense.category_id)
        .gte('expense_date', month)

      const totalSpent = expenses?.reduce((sum, e) => sum + e.amount, 0) || 0

      // Get budget
      const { data: budget } = await this.supabase
        .from('budgets')
        .select('monthly_limit')
        .eq('user_id', this.userId)
        .eq('category_id', expense.category_id)
        .eq('month', month)
        .single()

      if (budget) {
        const percentUsed = (totalSpent / budget.monthly_limit) * 100
        
        // Notify if over 80% used
        if (percentUsed >= 80 && percentUsed < 100) {
          await this.sendBudgetNotification({
            categoryId: expense.category_id,
            categoryName: expense.categories?.name || 'Unknown',
            percentUsed,
            totalSpent,
            limit: budget.monthly_limit
          })
        }
      }
    } catch (error) {
      logger.error('Failed to check budget notification', error)
    }
  }

  async sendBudgetNotification(data) {
    try {
      // Get user preferences to know where to send notifications
      const { data: prefs, error } = await this.supabase
        .from('user_preferences')
        .select('telegram_enabled, telegram_chat_id, email_notifications')
        .eq('user_id', this.userId)
        .single()

      if (error) {
        logger.error('Failed to get user preferences for notification', error)
        return
      }

      if (prefs?.telegram_enabled && prefs?.telegram_chat_id) {
        // TODO: Implement Telegram notification
        // You can call your telegram service here
        logger.info('Would send Telegram notification', { userId: this.userId, data })
      }
      
      if (prefs?.email_notifications) {
        // TODO: Implement email notification
        logger.info('Would send email notification', { userId: this.userId, data })
      }
    } catch (error) {
      logger.error('Failed to send budget notification', error)
    }
  }

  // New method: Get expenses by field value
  async getByFieldValue(categoryId, fieldName, fieldValue) {
    try {
      // First verify category ownership
      const { data: category } = await this.supabase
        .from('categories')
        .select('id')
        .eq('id', categoryId)
        .eq('user_id', this.userId)
        .single()
      
      if (!category) {
        throw new NotFoundError('Category')
      }

      // Get all expenses and filter by field value (since fields is JSONB)
      const { data, error } = await this.supabase
        .from('expenses')
        .select(`
          *,
          categories (
            name,
            icon,
            color
          )
        `)
        .eq('user_id', this.userId)
        .eq('category_id', categoryId)
        .order('expense_date', { ascending: false })

      if (error) {
        throw new AppError(error.message, 400)
      }

      // Filter by field value
      const filtered = data.filter(expense => 
        expense.fields && expense.fields[fieldName] === fieldValue
      )

      return filtered
    } catch (error) {
      logger.error('Failed to get expenses by field', error, { userId: this.userId, categoryId, fieldName })
      throw error
    }
  }
}