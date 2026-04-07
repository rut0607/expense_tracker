import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabase } from '@/utils/supabase'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check token in database
    const { data, error } = await supabase
      .from('user_preferences')
      .select('user_id, gmail_refresh_token, email_scan_enabled, gmail_last_sync')
      .eq('user_id', session.user.id)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      hasToken: !!data?.gmail_refresh_token,
      tokenFirstChars: data?.gmail_refresh_token ? 
        data.gmail_refresh_token.substring(0, 10) + '...' : null,
      email_scan_enabled: data?.email_scan_enabled,
      lastSync: data?.gmail_last_sync
    })

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}