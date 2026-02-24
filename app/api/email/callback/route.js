import { google } from 'googleapis'
import { supabaseAdmin } from '@/utils/supabase-admin'
import { NextResponse } from 'next/server'

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.NEXTAUTH_URL}/api/email/callback`
)

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const userId = searchParams.get('state')

    if (!code || !userId) {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/settings?error=Invalid request`
      )
    }

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code)
    
    if (!tokens.refresh_token) {
      console.error('No refresh token received. User may need to revoke access and try again.')
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/settings?error=No refresh token - please try again and ensure you grant full access`
      )
    }

    // Save refresh token to database
    const { error } = await supabaseAdmin
      .from('user_preferences')
      .upsert({
        user_id: userId,
        gmail_refresh_token: tokens.refresh_token,
        email_scan_enabled: true,
        gmail_last_sync: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

    if (error) {
      console.error('Error saving Gmail token:', error)
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/settings?error=Failed to save token`
      )
    }

    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/settings?success=Gmail connected successfully!`
    )
  } catch (error) {
    console.error('Gmail callback error:', error)
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/settings?error=Authentication failed`
    )
  }
}