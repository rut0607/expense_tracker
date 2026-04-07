import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET(request) {
  try {
    // Get the current user from session
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const today = new Date()
    
    // Calculate date ranges
    const startOfDay = new Date(today)
    startOfDay.setHours(0, 0, 0, 0)
    
    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() - today.getDay())
    startOfWeek.setHours(0, 0, 0, 0)
    
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    startOfMonth.setHours(0, 0, 0, 0)

    // 1. Get today's total
    const { data: todayExpenses } = await supabase
      .from('expenses')
      .select('amount')
      .eq('user_id', userId)
      .gte('expense_date', startOfDay.toISOString())

    const todayTotal = todayExpenses?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0

    // 2. Get this week's total
    const { data: weekExpenses } = await supabase
      .from('expenses')
      .select('amount')
      .eq('user_id', userId)
      .gte('expense_date', startOfWeek.toISOString())

    const weekTotal = weekExpenses?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0

    // 3. Get this month's total
    const { data: monthExpenses } = await supabase
      .from('expenses')
      .select('amount')
      .eq('user_id', userId)
      .gte('expense_date', startOfMonth.toISOString())

    const monthTotal = monthExpenses?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0

    // 4. Get category breakdown for this month
    const { data: categoryData } = await supabase
      .from('expenses')
      .select(`
        amount,
        categories (
          name,
          icon,
          color
        )
      `)
      .eq('user_id', userId)
      .gte('expense_date', startOfMonth.toISOString())

    // Calculate category totals
    const categoryMap = {}
    categoryData?.forEach(expense => {
      const catName = expense.categories?.name || 'Uncategorized'
      const catIcon = expense.categories?.icon || '📝'
      const catColor = expense.categories?.color || '#3B82F6'
      
      if (!categoryMap[catName]) {
        categoryMap[catName] = {
          name: catName,
          icon: catIcon,
          color: catColor,
          total: 0
        }
      }
      categoryMap[catName].total += expense.amount || 0
    })

    const categories = Object.values(categoryMap)

    // 5. Get average daily spend (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    thirtyDaysAgo.setHours(0, 0, 0, 0)

    const { data: thirtyDayExpenses } = await supabase
      .from('expenses')
      .select('amount')
      .eq('user_id', userId)
      .gte('expense_date', thirtyDaysAgo.toISOString())

    const thirtyDayTotal = thirtyDayExpenses?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0
    const averageDaily = thirtyDayTotal / 30

    // 6. Find top category
    const sortedCategories = [...categories].sort((a, b) => b.total - a.total)
    const topCategory = sortedCategories[0] || null

    return NextResponse.json({
      success: true,
      data: {
        periods: {
          today: todayTotal,
          week: weekTotal,
          month: monthTotal
        },
        averages: {
          daily: averageDaily
        },
        categories,
        insights: {
          topCategory,
          hasExpenses: monthTotal > 0
        }
      }
    })

  } catch (error) {
    console.error('Analytics API error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}