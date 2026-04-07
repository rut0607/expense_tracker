import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { AnalyticsService } from '@/lib/services/analytics.service'
import { createLogger } from '@/lib/utils/logger'

const logger = createLogger('AnalyticsTrendsAPI')

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
    const monthsParam = searchParams.get('months')
    const months = monthsParam ? parseInt(monthsParam) : 6

    const service = new AnalyticsService(session.user.id)
    const trends = await service.getTrends(months)

    return NextResponse.json({
      success: true,
      trends
    })
  } catch (error) {
    logger.error('Trends analysis failed', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.status || 500 }
    )
  }
}