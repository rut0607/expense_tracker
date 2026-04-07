import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { SplitService } from '@/lib/services/split.service'
import { createLogger } from '@/lib/utils/logger'

const logger = createLogger('SplitMembersAPI')

// Helper to extract group ID from URL
function getGroupIdFromUrl(url) {
  const parts = url.split('/')
  // Find 'groups' in the URL and get the next segment
  const groupsIndex = parts.findIndex(part => part === 'groups')
  if (groupsIndex !== -1 && parts.length > groupsIndex + 1) {
    return parts[groupsIndex + 1]
  }
  return null
}

export async function POST(request) {
  try {
    const groupId = getGroupIdFromUrl(request.url)
    console.log('📝 Adding member to group:', groupId)

    if (!groupId) {
      return NextResponse.json(
        { success: false, error: 'Group ID is required' },
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
    
    if (!body.name) {
      return NextResponse.json(
        { success: false, error: 'Member name is required' },
        { status: 400 }
      )
    }

    const service = new SplitService(session.user.id)
    const member = await service.addMember(groupId, body)

    return NextResponse.json({
      success: true,
      member
    }, { status: 201 })
  } catch (error) {
    logger.error('Failed to add member', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.status || 500 }
    )
  }
}

export async function GET(request) {
  try {
    const groupId = getGroupIdFromUrl(request.url)
    console.log('📝 Fetching members for group:', groupId)

    if (!groupId) {
      return NextResponse.json(
        { success: false, error: 'Group ID is required' },
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
    const group = await service.getGroup(groupId)

    return NextResponse.json({
      success: true,
      members: group.members || []
    })
  } catch (error) {
    logger.error('Failed to fetch members', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.status || 500 }
    )
  }
}

export async function PUT(request) {
  try {
    const groupId = getGroupIdFromUrl(request.url)
    console.log('📝 Adding multiple members to group:', groupId)

    if (!groupId) {
      return NextResponse.json(
        { success: false, error: 'Group ID is required' },
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
    
    if (!body.members || !Array.isArray(body.members) || body.members.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Members array is required' },
        { status: 400 }
      )
    }

    const service = new SplitService(session.user.id)
    const members = await service.addMembers(groupId, body.members)

    return NextResponse.json({
      success: true,
      members
    })
  } catch (error) {
    logger.error('Failed to add members', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.status || 500 }
    )
  }
}