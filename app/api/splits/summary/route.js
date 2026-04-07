import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { SplitService } from '@/lib/services/split.service'
import { createLogger } from '@/lib/utils/logger'

const logger = createLogger('SplitSummaryAPI')

// GET /api/splits/summary - Get pending amounts across all groups
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const service = new SplitService(session.user.id)
    const summary = await service.getPendingSummary()

    return NextResponse.json({
      success: true,
      summary
    })
  } catch (error) {
    logger.error('Failed to get pending summary', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.status || 500 }
    )
  }
}