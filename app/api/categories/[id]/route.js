import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { CategoryService } from '@/lib/services/category.service'
import { createLogger } from '@/lib/utils/logger'

const logger = createLogger('CategoryDetailAPI')

export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const service = new CategoryService(session.user.id)
    const category = await service.getById(params.id)

    return NextResponse.json({ 
      success: true, 
      category 
    })
  } catch (error) {
    logger.error('Category fetch failed', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.status || 500 }
    )
  }
}

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
    const category = await service.update(params.id, body)

    return NextResponse.json({ 
      success: true, 
      category 
    })
  } catch (error) {
    logger.error('Category update failed', error)
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
    const result = await service.delete(params.id)

    return NextResponse.json({ 
      success: true, 
      ...result
    })
  } catch (error) {
    logger.error('Category deletion failed', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.status || 500 }
    )
  }
}