import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { AnalyticsService } from '@/lib/services/analytics.service'
import { createLogger } from '@/lib/utils/logger'

const logger = createLogger('AnalyticsForecastAPI')

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const service = new AnalyticsService(session.user.id)
    const forecast = await service.getForecast()

    return NextResponse.json({
      success: true,
      forecast
    })
  } catch (error) {
    logger.error('Forecast generation failed', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.status || 500 }
    )
  }
}