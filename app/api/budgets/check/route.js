import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { BudgetService } from '@/lib/services/budget.service'

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
    
    // Check if expense would exceed any budgets
    const check = await service.checkExpenseAgainstBudgets(body)

    return NextResponse.json({ 
      success: true, 
      ...check
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.status || 500 }
    )
  }
}