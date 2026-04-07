import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { AnalyticsService } from '@/lib/services/analytics.service'
import { createLogger } from '@/lib/utils/logger'

const logger = createLogger('AnalyticsComparisonAPI')

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
    const months = parseInt(searchParams.get('months') || '3')

    const service = new AnalyticsService(session.user.id)
    const comparison = await service.getMonthlyComparison(months)

    return NextResponse.json({
      success: true,
      comparison
    })
  } catch (error) {
    logger.error('Monthly comparison failed', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.status || 500 }
    )
  }
}