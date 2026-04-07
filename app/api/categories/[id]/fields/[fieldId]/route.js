import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { CategoryService } from '@/lib/services/category.service'
import { createLogger } from '@/lib/utils/logger'

const logger = createLogger('CategoryFieldDetailAPI')

export async function PUT(request, { params }) {
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
    const field = await service.updateField(params.fieldId, body)

    return NextResponse.json({ 
      success: true, 
      field 
    })
  } catch (error) {
    logger.error('Update field failed', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.status || 500 }
    )
  }
}

export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const service = new CategoryService(session.user.id)
    const result = await service.deleteField(params.fieldId)

    return NextResponse.json({ 
      success: true, 
      ...result
    })
  } catch (error) {
    logger.error('Delete field failed', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.status || 500 }
    )
  }
}