import { supabase } from '@/lib/supabase/client'
import { validateBudget, validateBudgetUpdate } from '@/lib/validators/budgets'
import { AppError, NotFoundError } from '@/lib/utils/errors'
import { createLogger } from '@/lib/utils/logger'

const logger = createLogger('BudgetService')

export class BudgetService {
  constructor(userId) {
    this.userId = userId
    this.supabase = supabase.getClient()
  }

  // Create a new budget
  async create(data) {
    try {
      // Validate input
      const validation = validateBudget(data)
      if (!validation.isValid) {
        throw new AppError(JSON.stringify(validation.errors), 400)
      }

      // Check if budget already exists for this category and month
      const existing = await this.getByCategoryAndMonth(
        validation.data.category_id, 
        validation.data.month
      )
      
      if (existing) {
        throw new AppError('Budget already exists for this category and month', 400)
      }

      // Create budget
      const { data: budget, error } = await this.supabase
        .from('budgets')
        .insert({
          ...validation.data,
          user_id: this.userId
        })
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
        logger.error('Failed to create budget', error)
        throw new AppError(error.message, 400)
      }

      logger.info('Budget created', { 
        userId: this.userId, 
        budgetId: budget.id,
        categoryId: budget.category_id,
        month: budget.month
      })

      return budget
    } catch (error) {
      logger.error('Budget creation failed', error, { userId: this.userId, data })
      throw error
    }
  }

  // Get all budgets for current month
  async getCurrentMonthBudgets() {
    const month = getCurrentMonth()
    return this.getBudgetsByMonth(month)
  }

  // Get budgets for a specific month
  async getBudgetsByMonth(month) {
    try {
      const { data: budgets, error } = await this.supabase
        .from('budgets')
        .select(`
          *,
          categories (
            id,
            name,
            icon,
            color,
            is_active
          )
        `)
        .eq('user_id', this.userId)
        .eq('month', month)
        .order('created_at', { ascending: false })

      if (error) {
        logger.error('Failed to fetch budgets', error)
        throw new AppError(error.message, 400)
      }

      // Get spending for each budget
      const budgetsWithSpending = await Promise.all(
        budgets.map(async (budget) => {
          const spending = await this.getCategorySpending(budget.category_id, month)
          return {
            ...budget,
            spent: spending,
            remaining: budget.monthly_limit - spending,
            percentUsed: budget.monthly_limit > 0 
              ? Math.round((spending / budget.monthly_limit) * 100) 
              : 0
          }
        })
      )

      return budgetsWithSpending
    } catch (error) {
      logger.error('Failed to get budgets by month', error, { userId: this.userId, month })
      throw error
    }
  }

  // Get single budget by ID
  async getById(budgetId) {
    const { data: budget, error } = await this.supabase
      .from('budgets')
      .select(`
        *,
        categories (
          name,
          icon,
          color
        )
      `)
      .eq('id', budgetId)
      .eq('user_id', this.userId)
      .single()

    if (error || !budget) {
      throw new NotFoundError('Budget')
    }

    // Get current spending
    const spending = await this.getCategorySpending(budget.category_id, budget.month)
    
    return {
      ...budget,
      spent: spending,
      remaining: budget.monthly_limit - spending,
      percentUsed: budget.monthly_limit > 0 
        ? Math.round((spending / budget.monthly_limit) * 100) 
        : 0
    }
  }

  // Get budget by category and month
  async getByCategoryAndMonth(categoryId, month) {
    const { data, error } = await this.supabase
      .from('budgets')
      .select('*')
      .eq('user_id', this.userId)
      .eq('category_id', categoryId)
      .eq('month', month)
      .maybeSingle()

    if (error) {
      logger.error('Failed to fetch budget by category', error)
      throw new AppError(error.message, 400)
    }

    return data
  }

  // Update budget
  async update(budgetId, data) {
    try {
      // Verify ownership
      await this.getById(budgetId)

      // Validate update data
      const validation = validateBudgetUpdate(data)
      if (!validation.isValid) {
        throw new AppError(JSON.stringify(validation.errors), 400)
      }

      const { data: updated, error } = await this.supabase
        .from('budgets')
        .update({
          ...validation.data,
          updated_at: new Date().toISOString()
        })
        .eq('id', budgetId)
        .eq('user_id', this.userId)
        .select()
        .single()

      if (error) {
        throw new AppError(error.message, 400)
      }

      return updated
    } catch (error) {
      logger.error('Budget update failed', error, { userId: this.userId, budgetId, data })
      throw error
    }
  }

  // Delete budget
  async delete(budgetId) {
    try {
      // Verify ownership
      await this.getById(budgetId)

      const { error } = await this.supabase
        .from('budgets')
        .delete()
        .eq('id', budgetId)
        .eq('user_id', this.userId)

      if (error) {
        throw new AppError(error.message, 400)
      }

      logger.info('Budget deleted', { userId: this.userId, budgetId })
      return { success: true }
    } catch (error) {
      logger.error('Budget deletion failed', error, { userId: this.userId, budgetId })
      throw error
    }
  }

  // Get total spending for a category in a month
  async getCategorySpending(categoryId, month) {
    const startDate = month
    const nextMonth = new Date(month)
    nextMonth.setMonth(nextMonth.getMonth() + 1)
    const endDate = nextMonth.toISOString().split('T')[0]

    const { data, error } = await this.supabase
      .from('expenses')
      .select('amount')
      .eq('user_id', this.userId)
      .eq('category_id', categoryId)
      .gte('expense_date', startDate)
      .lt('expense_date', endDate)

    if (error) {
      logger.error('Failed to calculate category spending', error)
      return 0
    }

    return data.reduce((sum, expense) => sum + (expense.amount || 0), 0)
  }

  // Get budget summary for dashboard
  async getSummary(month = getCurrentMonth()) {
    try {
      const budgets = await this.getBudgetsByMonth(month)
      
      const summary = {
        totalBudget: 0,
        totalSpent: 0,
        totalRemaining: 0,
        budgets: budgets,
        categories: {}
      }

      budgets.forEach(budget => {
        summary.totalBudget += budget.monthly_limit
        summary.totalSpent += budget.spent
        summary.totalRemaining += budget.remaining
        
        if (budget.categories) {
          summary.categories[budget.category_id] = {
            name: budget.categories.name,
            limit: budget.monthly_limit,
            spent: budget.spent,
            remaining: budget.remaining,
            percentUsed: budget.percentUsed
          }
        }
      })

      // Calculate overall percentage
      summary.percentUsed = summary.totalBudget > 0 
        ? Math.round((summary.totalSpent / summary.totalBudget) * 100) 
        : 0

      // Check for alerts (budgets over 80%)
      summary.alerts = budgets
        .filter(b => b.percentUsed >= 80)
        .map(b => ({
          categoryId: b.category_id,
          categoryName: b.categories?.name || 'Unknown',
          percentUsed: b.percentUsed,
          spent: b.spent,
          limit: b.monthly_limit
        }))

      return summary
    } catch (error) {
      logger.error('Failed to get budget summary', error, { userId: this.userId, month })
      throw error
    }
  }

  // Check if expense would exceed any budgets
  async checkExpenseAgainstBudgets(expenseData) {
    const month = expenseData.expense_date.substring(0, 7) + '-01'
    
    // Get budget for this category
    const budget = await this.getByCategoryAndMonth(expenseData.category_id, month)
    
    if (!budget) return { allowed: true }

    // Calculate current spending including this expense
    const currentSpending = await this.getCategorySpending(expenseData.category_id, month)
    const newTotal = currentSpending + expenseData.amount

    return {
      allowed: newTotal <= budget.monthly_limit,
      currentSpending,
      newTotal,
      limit: budget.monthly_limit,
      wouldExceedBy: newTotal > budget.monthly_limit ? newTotal - budget.monthly_limit : 0
    }
  }
}

// Helper function
function getCurrentMonth() {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`
}