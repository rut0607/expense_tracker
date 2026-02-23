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
        reminder_time: '21:00',
        email_notifications: false
      }
    })
  } catch (error) {
    console.error('Error in GET:', error)
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
    const { monthly_budget_total, budget_month, monthly_allowance } = body

    // Prepare update object with only the fields that exist in your table
    const updates = {}
    if (monthly_budget_total !== undefined) updates.monthly_budget_total = monthly_budget_total
    if (budget_month !== undefined) updates.budget_month = budget_month
    if (monthly_allowance !== undefined) updates.monthly_allowance = monthly_allowance
    updates.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('user_preferences')
      .upsert({
        user_id: session.user.id,
        ...updates
      })
      .select()

    if (error) {
      console.error('Error updating preferences:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: data[0] })
  } catch (error) {
    console.error('Error in PATCH:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}