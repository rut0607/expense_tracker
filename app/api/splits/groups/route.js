import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { SplitService } from '@/lib/services/split.service'
import { createLogger } from '@/lib/utils/logger'

const logger = createLogger('SplitGroupsAPI')

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
    const groups = await service.getGroups()

    return NextResponse.json({
      success: true,
      groups
    })
  } catch (error) {
    logger.error('Failed to fetch groups', error)
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
    
    if (!body.name) {
      return NextResponse.json(
        { success: false, error: 'Group name is required' },
        { status: 400 }
      )
    }

    const service = new SplitService(session.user.id)
    const group = await service.createGroup(body)

    return NextResponse.json({
      success: true,
      group
    }, { status: 201 })
  } catch (error) {
    logger.error('Failed to create group', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.status || 500 }
    )
  }
}