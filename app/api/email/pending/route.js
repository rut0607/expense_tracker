import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { EmailService } from '@/lib/services/email.service'
import { createLogger } from '@/lib/utils/logger'

const logger = createLogger('EmailPendingAPI')

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const emailService = new EmailService(session.user.id)
    const transactions = await emailService.getPendingTransactions()

    return NextResponse.json({ 
      success: true, 
      transactions 
    })

  } catch (error) {
    logger.error('Failed to fetch pending transactions', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

export async function DELETE(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = await request.json()
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Transaction ID is required' },
        { status: 400 }
      )
    }

    const emailService = new EmailService(session.user.id)
    await emailService.ignoreTransaction(id)

    return NextResponse.json({ 
      success: true,
      message: 'Transaction ignored' 
    })

  } catch (error) {
    logger.error('Failed to delete transaction', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}