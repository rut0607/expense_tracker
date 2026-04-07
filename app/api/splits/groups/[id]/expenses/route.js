import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { SplitService } from '@/lib/services/split.service'
import { createLogger } from '@/lib/utils/logger'

const logger = createLogger('SplitExpensesAPI')

// GET /api/splits/groups/[id]/expenses - Get all expenses for a group
export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const service = new SplitService(session.user.id)
    const expenses = await service.getGroupExpenses(params.id)

    return NextResponse.json({
      success: true,
      expenses
    })
  } catch (error) {
    logger.error('Failed to fetch group expenses', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.status || 500 }
    )
  }
}

// POST /api/splits/groups/[id]/expenses - Create a new split expense
export async function POST(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    
    // Validate required fields
    if (!body.description) {
      return NextResponse.json(
        { success: false, error: 'Description is required' },
        { status: 400 }
      )
    }
    
    if (!body.total_amount || body.total_amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Valid total amount is required' },
        { status: 400 }
      )
    }
    
    if (!body.paid_by) {
      return NextResponse.json(
        { success: false, error: 'Paid by member is required' },
        { status: 400 }
      )
    }

    // Add group_id to body
    body.group_id = params.id

    const service = new SplitService(session.user.id)
    const expense = await service.createSplitExpense(body)

    return NextResponse.json({
      success: true,
      expense
    }, { status: 201 })
  } catch (error) {
    logger.error('Failed to create split expense', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.status || 500 }
    )
  }
}