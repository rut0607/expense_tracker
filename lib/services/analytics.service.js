import { supabase } from '@/lib/supabase/client'
import { AppError } from '@/lib/utils/errors'
import { createLogger } from '@/lib/utils/logger'

const logger = createLogger('AnalyticsService')

export class AnalyticsService {
  constructor(userId) {
    this.userId = userId
    this.supabase = supabase.getClient()
  }

  // 1. Get spending trends over time
  // In lib/services/analytics.service.js
// Replace the entire getTrends method with this:

async getTrends(monthsCount = 6) {
  try {
    const endDate = new Date()
    const startDate = new Date()
    startDate.setMonth(startDate.getMonth() - monthsCount)
    
    const startDateStr = startDate.toISOString().split('T')[0]
    const endDateStr = endDate.toISOString().split('T')[0]

    const { data, error } = await this.supabase
      .from('expenses')
      .select(`
        amount,
        expense_date,
        categories (
          name,
          icon,
          color
        )
      `)
      .eq('user_id', this.userId)
      .gte('expense_date', startDateStr)
      .lte('expense_date', endDateStr)
      .order('expense_date', { ascending: true })

    if (error) {
      throw new AppError(error.message, 400)
    }

    // Group by month and category
    const monthlyData = {}
    const categoryTotals = {}

    data.forEach(expense => {
      const month = expense.expense_date.substring(0, 7) // YYYY-MM
      const categoryId = expense.categories?.id || 'uncategorized'
      const categoryName = expense.categories?.name || 'Uncategorized'
      
      // Monthly totals
      if (!monthlyData[month]) {
        monthlyData[month] = {
          month,
          total: 0,
          categories: {}
        }
      }
      monthlyData[month].total += expense.amount
      
      // Category breakdown by month
      if (!monthlyData[month].categories[categoryId]) {
        monthlyData[month].categories[categoryId] = {
          name: categoryName,
          icon: expense.categories?.icon || '📦',
          color: expense.categories?.color || '#6B7280',
          total: 0
        }
      }
      monthlyData[month].categories[categoryId].total += expense.amount
      
      // Overall category totals
      if (!categoryTotals[categoryId]) {
        categoryTotals[categoryId] = {
          name: categoryName,
          icon: expense.categories?.icon || '📦',
          color: expense.categories?.color || '#6B7280',
          total: 0,
          count: 0
        }
      }
      categoryTotals[categoryId].total += expense.amount
      categoryTotals[categoryId].count++
    })

    // Calculate trends
    const months = Object.keys(monthlyData).sort()
    const trends = {
      labels: months,
      data: months.map(m => monthlyData[m].total),
      monthlyBreakdown: monthlyData,
      categoryTotals: Object.values(categoryTotals).sort((a, b) => b.total - a.total),
      summary: {
        totalSpent: data.reduce((sum, e) => sum + e.amount, 0),
        averagePerMonth: data.length > 0 && months.length > 0
          ? (data.reduce((sum, e) => sum + e.amount, 0) / months.length).toFixed(2)
          : 0,
        totalTransactions: data.length,
        topCategory: Object.values(categoryTotals).sort((a, b) => b.total - a.total)[0] || null
      }
    }

    return trends
  } catch (error) {
    logger.error('Failed to get trends', error, { userId: this.userId, monthsCount })
    throw error
  }
}

  // 2. Get category analysis with insights
  async getCategoryAnalysis(month) {
    try {
      const targetMonth = month || new Date().toISOString().slice(0, 7)
      const startDate = `${targetMonth}-01`
      const nextMonth = new Date(startDate)
      nextMonth.setMonth(nextMonth.getMonth() + 1)
      const endDate = nextMonth.toISOString().split('T')[0]

      // Get all expenses for the month with category details
      const { data: expenses, error } = await this.supabase
        .from('expenses')
        .select(`
          amount,
          expense_date,
          categories (
            id,
            name,
            icon,
            color
          )
        `)
        .eq('user_id', this.userId)
        .gte('expense_date', startDate)
        .lt('expense_date', endDate)

      if (error) {
        throw new AppError(error.message, 400)
      }

      // Get budgets for the month
      const { data: budgets } = await this.supabase
        .from('budgets')
        .select(`
          *,
          categories (
            name,
            icon,
            color
          )
        `)
        .eq('user_id', this.userId)
        .eq('month', startDate)

      // Build category analysis
      const categoryMap = {}
      const dailySpending = {}

      expenses.forEach(expense => {
        const catId = expense.categories?.id || 'uncategorized'
        const date = expense.expense_date
        
        // Category totals
        if (!categoryMap[catId]) {
          categoryMap[catId] = {
            id: catId,
            name: expense.categories?.name || 'Uncategorized',
            icon: expense.categories?.icon || '📦',
            color: expense.categories?.color || '#6B7280',
            total: 0,
            count: 0,
            average: 0,
            transactions: [],
            daily: {}
          }
        }
        categoryMap[catId].total += expense.amount
        categoryMap[catId].count++
        categoryMap[catId].transactions.push({
          amount: expense.amount,
          date: expense.expense_date
        })
        
        // Daily spending for this category
        if (!categoryMap[catId].daily[date]) {
          categoryMap[catId].daily[date] = 0
        }
        categoryMap[catId].daily[date] += expense.amount
        
        // Overall daily spending
        if (!dailySpending[date]) {
          dailySpending[date] = 0
        }
        dailySpending[date] += expense.amount
      })

      // Calculate averages and add budget info
      const categories = Object.values(categoryMap).map(cat => {
        cat.average = (cat.total / cat.count).toFixed(2)
        
        // Find budget for this category
        const budget = budgets?.find(b => b.category_id === cat.id)
        if (budget) {
          cat.budget = {
            limit: budget.monthly_limit,
            spent: cat.total,
            remaining: budget.monthly_limit - cat.total,
            percentUsed: ((cat.total / budget.monthly_limit) * 100).toFixed(1)
          }
        }
        
        return cat
      })

      // Sort categories by total spent
      categories.sort((a, b) => b.total - a.total)

      // Generate insights
      const insights = await this.generateInsights(expenses, categories, dailySpending, budgets)

      return {
        month: targetMonth,
        summary: {
          totalSpent: expenses.reduce((sum, e) => sum + e.amount, 0),
          totalTransactions: expenses.length,
          averagePerDay: (expenses.reduce((sum, e) => sum + e.amount, 0) / Object.keys(dailySpending).length).toFixed(2),
          busiestDay: this.findBusiestDay(dailySpending)
        },
        categories,
        dailySpending,
        insights
      }
    } catch (error) {
      logger.error('Failed to get category analysis', error, { userId: this.userId, month })
      throw error
    }
  }

  // 3. Generate smart insights
  async generateInsights(expenses, categories, dailySpending, budgets) {
    const insights = []

    // Insight 1: Top spending category
    if (categories.length > 0) {
      const topCategory = categories[0]
      const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0)
      const percentage = ((topCategory.total / totalSpent) * 100).toFixed(1)
      
      insights.push({
        type: 'top_category',
        title: '🎯 Top Spending Category',
        message: `You spent the most on ${topCategory.name} (${topCategory.icon}) - ₹${topCategory.total} (${percentage}% of total)`,
        severity: 'info',
        data: topCategory
      })
    }

    // Insight 2: Budget alerts
    categories.forEach(cat => {
      if (cat.budget) {
        if (cat.budget.percentUsed >= 90) {
          insights.push({
            type: 'budget_critical',
            title: '⚠️ Budget Critical!',
            message: `${cat.name} budget is at ${cat.budget.percentUsed}% (₹${cat.budget.spent} of ₹${cat.budget.limit})`,
            severity: 'danger',
            data: cat
          })
        } else if (cat.budget.percentUsed >= 75) {
          insights.push({
            type: 'budget_warning',
            title: '⚠️ Budget Warning',
            message: `${cat.name} budget is at ${cat.budget.percentUsed}% (₹${cat.budget.spent} of ₹${cat.budget.limit})`,
            severity: 'warning',
            data: cat
          })
        }
      }
    })

    // Insight 3: Spending pattern - weekends vs weekdays
    const weekendTotal = expenses.filter(e => {
      const day = new Date(e.expense_date).getDay()
      return day === 0 || day === 6 // Sunday or Saturday
    }).reduce((sum, e) => sum + e.amount, 0)

    const weekdayTotal = expenses.reduce((sum, e) => sum + e.amount, 0) - weekendTotal

    if (weekendTotal > weekdayTotal * 0.5) { // If weekend spending is >50% of weekday
      insights.push({
        type: 'weekend_spending',
        title: '📅 Weekend Spender',
        message: `You spend a lot on weekends! Weekend spending: ₹${weekendTotal} (${((weekendTotal/(weekdayTotal+weekendTotal))*100).toFixed(1)}% of total)`,
        severity: 'info',
        data: { weekendTotal, weekdayTotal }
      })
    }

    // Insight 4: Frequent small transactions vs large ones
    const smallTransactions = expenses.filter(e => e.amount < 100).length
    const largeTransactions = expenses.filter(e => e.amount > 1000).length

    if (smallTransactions > largeTransactions * 2) {
      insights.push({
        type: 'small_transactions',
        title: '💳 Many Small Transactions',
        message: `You have ${smallTransactions} small transactions (<₹100). These can add up quickly!`,
        severity: 'info',
        data: { smallTransactions, largeTransactions }
      })
    }

    // Insight 5: Compare with previous month (if budgets exist)
    if (budgets && budgets.length > 0) {
      const totalBudget = budgets.reduce((sum, b) => sum + b.monthly_limit, 0)
      const totalSpent = categories.reduce((sum, c) => sum + c.total, 0)
      const percentOfBudget = ((totalSpent / totalBudget) * 100).toFixed(1)

      if (percentOfBudget < 50) {
        insights.push({
          type: 'under_budget',
          title: '💰 Under Budget!',
          message: `You've only used ${percentOfBudget}% of your total budget this month. Great job!`,
          severity: 'success',
          data: { totalSpent, totalBudget, percentOfBudget }
        })
      }
    }

    return insights
  }

  // 4. Get monthly comparison
  async getMonthlyComparison(months = 3) {
    try {
      const endDate = new Date()
      const startDate = new Date()
      startDate.setMonth(startDate.getMonth() - months)
      
      const startDateStr = startDate.toISOString().split('T')[0]
      const endDateStr = endDate.toISOString().split('T')[0]

      const { data, error } = await this.supabase
        .from('expenses')
        .select(`
          amount,
          expense_date,
          categories (
            name,
            icon,
            color
          )
        `)
        .eq('user_id', this.userId)
        .gte('expense_date', startDateStr)
        .lte('expense_date', endDateStr)

      if (error) {
        throw new AppError(error.message, 400)
      }

      // Group by month
      const monthlyStats = {}
      
      data.forEach(expense => {
        const month = expense.expense_date.substring(0, 7)
        
        if (!monthlyStats[month]) {
          monthlyStats[month] = {
            month,
            total: 0,
            count: 0,
            categories: {}
          }
        }
        
        monthlyStats[month].total += expense.amount
        monthlyStats[month].count++
        
        const catId = expense.categories?.id || 'uncategorized'
        if (!monthlyStats[month].categories[catId]) {
          monthlyStats[month].categories[catId] = {
            name: expense.categories?.name || 'Uncategorized',
            icon: expense.categories?.icon || '📦',
            total: 0
          }
        }
        monthlyStats[month].categories[catId].total += expense.amount
      })

      // Calculate changes
      const monthsList = Object.keys(monthlyStats).sort()
      const comparison = []
      
      for (let i = 0; i < monthsList.length; i++) {
        const currentMonth = monthsList[i]
        const prevMonth = monthsList[i - 1]
        
        const stat = {
          ...monthlyStats[currentMonth],
          change: null,
          changePercentage: null
        }
        
        if (prevMonth) {
          const prevTotal = monthlyStats[prevMonth].total
          stat.change = stat.total - prevTotal
          stat.changePercentage = ((stat.change / prevTotal) * 100).toFixed(1)
        }
        
        comparison.push(stat)
      }

      return {
        months: monthsList,
        comparison,
        summary: {
          averageMonthlySpend: (monthsList.reduce((sum, m) => sum + monthlyStats[m].total, 0) / monthsList.length).toFixed(2),
          bestMonth: monthsList.reduce((best, m) => 
            monthlyStats[m].total < (monthlyStats[best]?.total || Infinity) ? m : best, monthsList[0]),
          worstMonth: monthsList.reduce((worst, m) => 
            monthlyStats[m].total > (monthlyStats[worst]?.total || 0) ? m : worst, monthsList[0])
        }
      }
    } catch (error) {
      logger.error('Failed to get monthly comparison', error, { userId: this.userId, months })
      throw error
    }
  }

  // 5. Get forecast (simple prediction based on trends)
  async getForecast() {
    try {
      // Get last 3 months of data
      const endDate = new Date()
      const startDate = new Date()
      startDate.setMonth(startDate.getMonth() - 3)
      
      const startDateStr = startDate.toISOString().split('T')[0]
      const endDateStr = endDate.toISOString().split('T')[0]

      const { data, error } = await this.supabase
        .from('expenses')
        .select('amount, expense_date')
        .eq('user_id', this.userId)
        .gte('expense_date', startDateStr)
        .lte('expense_date', endDateStr)

      if (error) {
        throw new AppError(error.message, 400)
      }

      // Group by month
      const monthlyTotals = {}
      data.forEach(expense => {
        const month = expense.expense_date.substring(0, 7)
        monthlyTotals[month] = (monthlyTotals[month] || 0) + expense.amount
      })

      const months = Object.keys(monthlyTotals).sort()
      if (months.length < 2) {
        return {
          forecast: null,
          message: 'Need at least 2 months of data for forecast'
        }
      }

      // Simple linear regression for forecast
      const values = months.map(m => monthlyTotals[m])
      const xValues = months.map((_, i) => i)
      
      // Calculate trend
      const n = values.length
      const sumX = xValues.reduce((a, b) => a + b, 0)
      const sumY = values.reduce((a, b) => a + b, 0)
      const sumXY = xValues.reduce((sum, x, i) => sum + (x * values[i]), 0)
      const sumXX = xValues.reduce((sum, x) => sum + (x * x), 0)
      
      const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
      const intercept = (sumY - slope * sumX) / n

      // Predict next month
      const nextMonth = new Date()
      nextMonth.setMonth(nextMonth.getMonth() + 1)
      const nextMonthStr = nextMonth.toISOString().slice(0, 7)
      
      const predictedNext = slope * months.length + intercept

      return {
        forecast: {
          nextMonth: nextMonthStr,
          predictedAmount: Math.max(0, Math.round(predictedNext)),
          trend: slope > 0 ? 'increasing' : slope < 0 ? 'decreasing' : 'stable',
          confidence: values.length >= 3 ? 'high' : 'medium',
          basedOnMonths: months
        },
        historical: monthlyTotals
      }
    } catch (error) {
      logger.error('Failed to get forecast', error, { userId: this.userId })
      throw error
    }
  }

  // Helper: Find busiest spending day
  findBusiestDay(dailySpending) {
    let maxDay = null
    let maxAmount = 0
    
    Object.entries(dailySpending).forEach(([date, amount]) => {
      if (amount > maxAmount) {
        maxAmount = amount
        maxDay = date
      }
    })
    
    return maxDay ? { date: maxDay, amount: maxAmount } : null
  }
}