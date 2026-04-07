import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { CategoryService } from '@/lib/services/category.service'
import { createLogger } from '@/lib/utils/logger'

const logger = createLogger('CategoryFieldsAPI')

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
    const service = new CategoryService(session.user.id)
    const field = await service.addField(params.id, body)

    return NextResponse.json({ 
      success: true, 
      field 
    }, { status: 201 })
  } catch (error) {
    logger.error('Add field failed', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.status || 500 }
    )
  }
}