import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import { supabase } from '@/utils/supabase'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', session.user.id)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching preferences:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      data: data || { 
        monthly_budget_total: 0,
        budget_month: null,
        monthly_allowance: 0,
        telegram_enabled: false,
        telegram_chat_id: null,
        reminder_time: '21:00',
        reminder_enabled: false,
        email_notifications: false,
        whatsapp_number: null,
        gmail_refresh_token: null,
        email_scan_enabled: false,
        selected_banks: ['hdfc', 'icici', 'sbi', 'axis', 'kotak', 'zomato', 'swiggy', 'amazon']
      }
    })
  } catch (error) {
    console.error('Error in GET /api/user/preferences:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    // Validate numeric fields
    if (body.monthly_allowance !== undefined && (isNaN(body.monthly_allowance) || body.monthly_allowance < 0)) {
      return NextResponse.json({ error: 'Invalid monthly allowance' }, { status: 400 })
    }

    if (body.monthly_budget_total !== undefined && (isNaN(body.monthly_budget_total) || body.monthly_budget_total < 0)) {
      return NextResponse.json({ error: 'Invalid monthly budget' }, { status: 400 })
    }

    // Prepare update object with all possible fields
    const updates = {
      user_id: session.user.id,
      updated_at: new Date().toISOString()
    }

    // Only include fields that are provided
    const allowedFields = [
      'monthly_budget_total', 'budget_month', 'monthly_allowance',
      'telegram_enabled', 'telegram_chat_id', 'reminder_time',
      'reminder_enabled', 'email_notifications', 'whatsapp_number',
      'gmail_refresh_token', 'email_scan_enabled', 'selected_banks'
    ]

    allowedFields.forEach(field => {
      if (body[field] !== undefined) {
        updates[field] = body[field]
      }
    })

    const { data, error } = await supabase
      .from('user_preferences')
      .upsert(updates)
      .select()

    if (error) {
      console.error('Error updating preferences:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: data[0] })
  } catch (error) {
    console.error('Error in PATCH /api/user/preferences:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}