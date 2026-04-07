import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { BudgetService } from '@/lib/services/budget.service'
import { createLogger } from '@/lib/utils/logger'

const logger = createLogger('BudgetsAPI')

// Helper function to get current month in YYYY-MM-DD format
function getCurrentMonth() {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`
}

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
    const month = searchParams.get('month')
    const summary = searchParams.get('summary') === 'true'

    const service = new BudgetService(session.user.id)

    if (summary) {
      // If month is provided, use it, otherwise get current month
      const targetMonth = month || getCurrentMonth()
      const budgetSummary = await service.getSummary(targetMonth)
      return NextResponse.json({ 
        success: true, 
        summary: budgetSummary 
      })
    } else if (month) {
      // Return budgets for specific month
      const budgets = await service.getBudgetsByMonth(month)
      return NextResponse.json({ 
        success: true, 
        budgets 
      })
    } else {
      // Return current month budgets
      const budgets = await service.getCurrentMonthBudgets()
      return NextResponse.json({ 
        success: true, 
        budgets 
      })
    }
  } catch (error) {
    logger.error('Budget fetch failed', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.status || 500 }
    )
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const service = new BudgetService(session.user.id)
    const budget = await service.create(body)

    return NextResponse.json({ 
      success: true, 
      budget 
    }, { status: 201 })
  } catch (error) {
    logger.error('Budget creation failed', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.status || 500 }
    )
  }
}