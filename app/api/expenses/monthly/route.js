import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import { supabase } from '@/utils/supabase'

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const year = searchParams.get('year')
    const month = searchParams.get('month')

    if (!year || !month) {
      return NextResponse.json({ error: 'Year and month required' }, { status: 400 })
    }

    // Calculate first and last day of the month
    const firstDay = new Date(parseInt(year), parseInt(month) - 1, 1).toISOString()
    const lastDay = new Date(parseInt(year), parseInt(month), 0).toISOString()

    const { data: expenses, error } = await supabase
      .from('expenses')
      .select('amount, category_id')
      .eq('user_id', session.user.id)
      .gte('expense_date', firstDay)
      .lte('expense_date', lastDay)

    if (error) {
      console.error('Error fetching expenses:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Group spending by category
    const spendingMap = {}
    expenses?.forEach(expense => {
      const catId = expense.category_id
      spendingMap[catId] = (spendingMap[catId] || 0) + (expense.amount || 0)
    })

    return NextResponse.json({ 
      success: true, 
      spending: spendingMap,
      count: expenses?.length || 0
    })
  } catch (error) {
    console.error('Monthly expenses API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}