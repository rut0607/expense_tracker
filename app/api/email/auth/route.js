import { google } from 'googleapis'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { createLogger } from '@/lib/utils/logger'

const logger = createLogger('EmailAuthAPI')

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.NEXTAUTH_URL}/api/email/callback`
)

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Generate Gmail OAuth URL with forced consent
    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/gmail.modify'
      ],
      prompt: 'consent', // Forces the consent screen every time
      state: session.user.id
    })

    logger.info('Gmail auth URL generated', { userId: session.user.id })

    return NextResponse.json({ 
      success: true,
      url 
    })

  } catch (error) {
    logger.error('Gmail auth error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to generate auth URL' 
      },
      { status: 500 }
    )
  }
}