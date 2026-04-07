import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { CategoryService } from '@/lib/services/category.service'
import { createLogger } from '@/lib/utils/logger'

const logger = createLogger('CategoriesAPI')

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
    const includeInactive = searchParams.get('includeInactive') === 'true'
    const month = searchParams.get('month') // For spending summary
    const summary = searchParams.get('summary') === 'true'

    const service = new CategoryService(session.user.id)

    if (summary && month) {
      // Get spending summary for a specific month
      const spending = await service.getSpendingSummary(month)
      return NextResponse.json({ 
        success: true, 
        spending 
      })
    } else {
      // Get all categories
      const categories = await service.getAll(includeInactive)
      return NextResponse.json({ 
        success: true, 
        categories 
      })
    }
  } catch (error) {
    logger.error('Categories fetch failed', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.status || 500 }
    )
  }
}

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
    const service = new CategoryService(session.user.id)
    const category = await service.create(body)

    return NextResponse.json({ 
      success: true, 
      category 
    }, { status: 201 })
  } catch (error) {
    logger.error('Category creation failed', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.status || 500 }
    )
  }
}