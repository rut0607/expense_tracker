import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { SplitService } from '@/lib/services/split.service'
import { createLogger } from '@/lib/utils/logger'

const logger = createLogger('SplitSettleAPI')

// POST /api/splits/settle/share/[shareId] - Settle a specific share
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get shareId from URL
    const url = new URL(request.url)
    const pathParts = url.pathname.split('/')
    const shareId = pathParts[pathParts.length - 1]

    if (!shareId) {
      return NextResponse.json(
        { success: false, error: 'Share ID is required' },
        { status: 400 }
      )
    }

    const service = new SplitService(session.user.id)
    const share = await service.settleShare(shareId)

    return NextResponse.json({
      success: true,
      share,
      message: 'Share settled successfully'
    })
  } catch (error) {
    logger.error('Failed to settle share', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.status || 500 }
    )
  }
}

// POST /api/splits/settle/expense/[expenseId] - Settle entire expense
export async function PUT(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get expenseId from URL
    const url = new URL(request.url)
    const pathParts = url.pathname.split('/')
    const expenseId = pathParts[pathParts.length - 1]

    if (!expenseId) {
      return NextResponse.json(
        { success: false, error: 'Expense ID is required' },
        { status: 400 }
      )
    }

    const service = new SplitService(session.user.id)
    const expense = await service.settleExpense(expenseId)

    return NextResponse.json({
      success: true,
      expense,
      message: 'Expense settled successfully'
    })
  } catch (error) {
    logger.error('Failed to settle expense', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.status || 500 }
    )
  }
}