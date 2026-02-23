import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'
import { supabase } from '@/utils/supabase'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const today = new Date()
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString()

    const { data, error } = await supabase
      .from('budgets')
      .select(`
        *,
        categories (
          id,
          name,
          icon,
          color
        )
      `)
      .eq('user_id', userId)
      .eq('month', firstDayOfMonth)

    if (error) {
      console.error('Error fetching budgets:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Error in GET /api/budgets:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { category_id, monthly_limit } = await request.json()

    // Validate input
    if (!category_id) {
      return NextResponse.json({ error: 'Category ID is required' }, { status: 400 })
    }

    if (!monthly_limit || isNaN(monthly_limit) || monthly_limit < 0) {
      return NextResponse.json({ error: 'Valid monthly limit is required' }, { status: 400 })
    }

    // Verify category belongs to user
    const { data: category, error: catError } = await supabase
      .from('categories')
      .select('id')
      .eq('id', category_id)
      .eq('user_id', session.user.id)
      .single()

    if (catError || !category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    const userId = session.user.id
    const today = new Date()
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString()

    const { data, error } = await supabase
      .from('budgets')
      .upsert({
        user_id: userId,
        category_id,
        monthly_limit: parseFloat(monthly_limit),
        month: firstDayOfMonth,
        updated_at: new Date().toISOString()
      })
      .select()

    if (error) {
      console.error('Error saving budget:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data[0])
  } catch (error) {
    console.error('Error in POST /api/budgets:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const budgetId = searchParams.get('id')

    if (!budgetId) {
      return NextResponse.json({ error: 'Budget ID required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('budgets')
      .delete()
      .eq('id', budgetId)
      .eq('user_id', session.user.id)

    if (error) {
      console.error('Error deleting budget:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/budgets:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}