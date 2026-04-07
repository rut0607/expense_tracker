import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ExpenseService } from '@/lib/services/expense.service'
import { BudgetService } from '@/lib/services/budget.service'
import { AnalyticsService } from '@/lib/services/analytics.service'
import { createLogger } from '@/lib/utils/logger'

const logger = createLogger('DashboardAPI')

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const monthParam = searchParams.get('month')
    
    // Safely get current month
    const today = new Date()
    const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`
    const month = monthParam || currentMonth

    // Initialize services
    const expenseService = new ExpenseService(session.user.id)
    const budgetService = new BudgetService(session.user.id)
    const analyticsService = new AnalyticsService(session.user.id)

    // Fetch all dashboard data in parallel with error handling for each
    let monthlyExpenses = { expenses: [], summary: { total: 0, count: 0, byCategory: {} } }
    let budgetSummary = { totalBudget: 0, totalSpent: 0, totalRemaining: 0, percentUsed: 0, alerts: [] }
    let categoryAnalysis = { categories: [], dailySpending: {}, insights: [] }
    let trends = { labels: [], data: [], summary: {} }

    try {
      monthlyExpenses = await expenseService.getMonthlySummary(month)
    } catch (error) {
      logger.error('Failed to fetch monthly expenses', error)
    }

    try {
      budgetSummary = await budgetService.getSummary(month)
    } catch (error) {
      logger.error('Failed to fetch budget summary', error)
    }

    try {
      categoryAnalysis = await analyticsService.getCategoryAnalysis(month)
    } catch (error) {
      logger.error('Failed to fetch category analysis', error)
    }

    try {
      trends = await analyticsService.getTrends(3)
    } catch (error) {
      logger.error('Failed to fetch trends', error)
    }

    // Get recent transactions safely
    const recentTransactions = (monthlyExpenses.expenses || [])
      .slice(0, 5)
      .map(e => ({
        id: e.id,
        amount: e.amount || 0,
        description: e.description || '',
        date: e.expense_date || '',
        category: {
          name: e.categories?.name || 'Uncategorized',
          icon: e.categories?.icon || '📦',
          color: e.categories?.color || '#6B7280'
        },
        fields: e.fields || {}
      }))

    // Calculate quick stats safely
    const quickStats = {
      totalSpent: monthlyExpenses.summary?.total || 0,
      totalTransactions: monthlyExpenses.summary?.count || 0,
      averagePerDay: monthlyExpenses.summary?.total > 0 
        ? (monthlyExpenses.summary.total / 31).toFixed(2)
        : "0",
      remainingBudget: budgetSummary.totalRemaining || 0,
      budgetStatus: budgetSummary.percentUsed || 0,
      topCategory: categoryAnalysis.categories?.[0] || null,
      alerts: budgetSummary.alerts?.length || 0
    }

    // Get daily spending for chart safely
    const dailySpending = Object.entries(categoryAnalysis.dailySpending || {})
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date))

    return NextResponse.json({
      success: true,
      dashboard: {
        month,
        quickStats,
        budgetSummary: {
          total: budgetSummary.totalBudget || 0,
          spent: budgetSummary.totalSpent || 0,
          remaining: budgetSummary.totalRemaining || 0,
          percentUsed: budgetSummary.percentUsed || 0,
          alerts: budgetSummary.alerts || []
        },
        categoryBreakdown: (categoryAnalysis.categories || []).map(cat => ({
          id: cat.id,
          name: cat.name || 'Unknown',
          icon: cat.icon || '📦',
          color: cat.color || '#6B7280',
          total: cat.total || 0,
          count: cat.count || 0,
          budget: cat.budget || null
        })),
        recentTransactions,
        dailySpending,
        trends: {
          labels: trends.labels || [],
          data: trends.data || [],
          summary: trends.summary || {}
        },
        insights: (categoryAnalysis.insights || []).slice(0, 3)
      }
    })
  } catch (error) {
    logger.error('Dashboard data fetch failed', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.status || 500 }
    )
  }
}