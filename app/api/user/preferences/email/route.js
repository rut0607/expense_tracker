import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/utils/supabase-admin'
import { createLogger } from '@/lib/utils/logger'

const logger = createLogger('EmailSettingsAPI')

export async function PATCH(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { email_scan_enabled, selected_banks } = await request.json()

    const updates = {}
    if (email_scan_enabled !== undefined) {
      updates.email_scan_enabled = email_scan_enabled
    }
    if (selected_banks !== undefined) {
      updates.selected_banks = selected_banks
    }
    updates.updated_at = new Date().toISOString()

    const { data, error } = await supabaseAdmin
      .from('user_preferences')
      .update(updates)
      .eq('user_id', session.user.id)
      .select()
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return NextResponse.json({
      success: true,
      data
    })

  } catch (error) {
    logger.error('Failed to update email settings', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

export async function DELETE() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Disconnect Gmail by removing token
    const { error } = await supabaseAdmin
      .from('user_preferences')
      .update({
        gmail_refresh_token: null,
        email_scan_enabled: false,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', session.user.id)

    if (error) {
      throw new Error(error.message)
    }

    return NextResponse.json({
      success: true,
      message: 'Gmail disconnected successfully'
    })

  } catch (error) {
    logger.error('Failed to disconnect Gmail', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}