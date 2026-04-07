import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { EmailService } from '@/lib/services/email.service'
import { createLogger } from '@/lib/utils/logger'

const logger = createLogger('EmailConfirmAPI')

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id, categoryId, description, action } = await request.json()

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Transaction ID is required' },
        { status: 400 }
      )
    }

    const emailService = new EmailService(session.user.id)

    // Handle different actions
    if (action === 'ignore') {
      await emailService.ignoreTransaction(id)
      return NextResponse.json({
        success: true,
        message: 'Transaction ignored successfully'
      })
    }

    // Default action is 'add' (confirm)
    if (!categoryId) {
      return NextResponse.json(
        { success: false, error: 'Category ID is required to add expense' },
        { status: 400 }
      )
    }

    const expense = await emailService.confirmTransaction(id, categoryId, description)

    logger.info('Transaction confirmed and added to expenses', {
      userId: session.user.id,
      expenseId: expense.id,
      amount: expense.amount
    })

    return NextResponse.json({
      success: true,
      expense,
      message: 'Transaction added to expenses successfully'
    })

  } catch (error) {
    logger.error('Failed to confirm transaction', error)
    
    // Handle specific error cases
    if (error.message === 'Transaction not found') {
      return NextResponse.json(
        { success: false, error: 'Transaction not found or already processed' },
        { status: 404 }
      )
    }
    
    if (error.message.includes('category')) {
      return NextResponse.json(
        { success: false, error: 'Invalid category' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to confirm transaction' 
      },
      { status: error.status || 500 }
    )
  }
}

// Optional: Batch confirm multiple transactions
export async function PUT(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { transactions } = await request.json()
    
    if (!Array.isArray(transactions) || transactions.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Transactions array is required' },
        { status: 400 }
      )
    }

    const emailService = new EmailService(session.user.id)
    const results = []

    for (const tx of transactions) {
      try {
        if (tx.action === 'ignore') {
          await emailService.ignoreTransaction(tx.id)
          results.push({ id: tx.id, success: true, action: 'ignored' })
        } else {
          const expense = await emailService.confirmTransaction(
            tx.id, 
            tx.categoryId, 
            tx.description
          )
          results.push({ 
            id: tx.id, 
            success: true, 
            action: 'added',
            expenseId: expense.id 
          })
        }
      } catch (error) {
        results.push({ 
          id: tx.id, 
          success: false, 
          error: error.message 
        })
      }
    }

    return NextResponse.json({
      success: true,
      results
    })

  } catch (error) {
    logger.error('Failed to batch confirm transactions', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}