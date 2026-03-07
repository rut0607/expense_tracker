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

    console.log('📧 Callback received:', { code: !!code, userId })

    if (!code || !userId) {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/settings?error=Invalid request`
      )
    }

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code)
    
    console.log('✅ Tokens received:', { 
      hasRefreshToken: !!tokens.refresh_token,
      hasAccessToken: !!tokens.access_token
    })
    
    if (!tokens.refresh_token) {
      console.error('❌ No refresh token received')
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/settings?error=No refresh token - please try again and ensure you grant full access`
      )
    }

    // First check if user_preferences exists
    const { data: existingPrefs, error: checkError } = await supabaseAdmin
      .from('user_preferences')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle()

    if (checkError) {
      console.error('❌ Error checking preferences:', checkError)
    }

    let result;
    
    if (existingPrefs) {
      // Update existing record
      result = await supabaseAdmin
        .from('user_preferences')
        .update({
          gmail_refresh_token: tokens.refresh_token,
          email_scan_enabled: true,
          gmail_last_sync: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
    } else {
      // Insert new record
      result = await supabaseAdmin
        .from('user_preferences')
        .insert({
          user_id: userId,
          gmail_refresh_token: tokens.refresh_token,
          email_scan_enabled: true,
          gmail_last_sync: new Date().toISOString(),
          selected_banks: ['axis', 'hdfc', 'icici', 'sbi', 'kotak', 'gpay', 'phonepe', 'paytm', 'zomato', 'swiggy', 'amazon', 'flipkart', 'netflix', 'jio'],
          reminder_time: '21:00',
          reminder_enabled: false,
          telegram_enabled: false,
          email_notifications: false
        })
    }

    if (result.error) {
      console.error('❌ Error saving Gmail token:', result.error)
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/settings?error=Failed to save token: ${result.error.message}`
      )
    }

    console.log('✅ Token saved successfully for user:', userId)
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/settings?success=Gmail connected successfully!`
    )
  } catch (error) {
    console.error('❌ Gmail callback error:', error)
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/settings?error=Authentication failed: ${error.message}`
    )
  }
}