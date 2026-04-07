import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { SplitService } from '@/lib/services/split.service'
import { createLogger } from '@/lib/utils/logger'

const logger = createLogger('SplitMemberDetailAPI')

// PUT /api/splits/members/[memberId] - Update member
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
    const service = new SplitService(session.user.id)
    const member = await service.updateMember(params.memberId, body)

    return NextResponse.json({
      success: true,
      member
    })
  } catch (error) {
    logger.error('Failed to update member', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.status || 500 }
    )
  }
}

// DELETE /api/splits/members/[memberId] - Remove member from group
export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const service = new SplitService(session.user.id)
    const result = await service.removeMember(params.memberId)

    return NextResponse.json({
      success: true,
      message: 'Member removed successfully'
    })
  } catch (error) {
    logger.error('Failed to remove member', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.status || 500 }
    )
  }
}