import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { AnalyticsService } from '@/lib/services/analytics.service'
import { createLogger } from '@/lib/utils/logger'

const logger = createLogger('AnalyticsCategoriesAPI')

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

    const service = new AnalyticsService(session.user.id)
    const analysis = await service.getCategoryAnalysis(month)

    return NextResponse.json({
      success: true,
      analysis
    })
  } catch (error) {
    logger.error('Category analysis failed', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.status || 500 }
    )
  }
}