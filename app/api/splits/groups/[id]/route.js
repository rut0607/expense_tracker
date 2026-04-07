import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { SplitService } from '@/lib/services/split.service'
import { createLogger } from '@/lib/utils/logger'

const logger = createLogger('SplitGroupDetailAPI')

// Helper to extract ID from URL
function getIdFromUrl(url) {
  const parts = url.split('/')
  return parts[parts.length - 1]
}

export async function GET(request) {
  try {
    // Get ID from URL
    const id = getIdFromUrl(request.url)
    console.log('🔍 Extracted ID from URL:', id)

    if (!id || id.length !== 36) { // UUID is 36 chars
      return NextResponse.json(
        { success: false, error: 'Valid group ID is required' },
        { status: 400 }
      )
    }

    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const service = new SplitService(session.user.id)
    const group = await service.getGroup(id)

    return NextResponse.json({
      success: true,
      group
    })
  } catch (error) {
    logger.error('Failed to fetch group', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.status || 500 }
    )
  }
}

export async function PUT(request) {
  try {
    const id = getIdFromUrl(request.url)
    console.log('🔍 PUT - ID:', id)

    if (!id || id.length !== 36) {
      return NextResponse.json(
        { success: false, error: 'Valid group ID is required' },
        { status: 400 }
      )
    }

    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const service = new SplitService(session.user.id)
    const group = await service.updateGroup(id, body)

    return NextResponse.json({
      success: true,
      group
    })
  } catch (error) {
    logger.error('Failed to update group', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.status || 500 }
    )
  }
}

export async function DELETE(request) {
  try {
    const id = getIdFromUrl(request.url)
    console.log('🔍 DELETE - ID:', id)

    if (!id || id.length !== 36) {
      return NextResponse.json(
        { success: false, error: 'Valid group ID is required' },
        { status: 400 }
      )
    }

    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const service = new SplitService(session.user.id)
    const result = await service.deleteGroup(id)

    return NextResponse.json({
      success: true,
      message: 'Group deleted successfully'
    })
  } catch (error) {
    logger.error('Failed to delete group', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.status || 500 }
    )
  }
}