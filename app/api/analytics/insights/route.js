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

    const userId = session.user.id
    const today = new Date()
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
    const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0)

    // Fetch current month expenses
    const { data: currentMonth } = await supabase
      .from('expenses')
      .select('amount, expense_date, categories(name)')
      .eq('user_id', userId)
      .gte('expense_date', startOfMonth.toISOString())

    // Fetch last month expenses
    const { data: lastMonth } = await supabase
      .from('expenses')
      .select('amount, expense_date, categories(name)')
      .eq('user_id', userId)
      .gte('expense_date', startOfLastMonth.toISOString())
      .lte('expense_date', endOfLastMonth.toISOString())

    // Fetch all expenses for trend analysis
    const { data: allExpenses } = await supabase
      .from('expenses')
      .select('amount, expense_date, categories(name)')
      .eq('user_id', userId)
      .order('expense_date', { ascending: false })

    // 1. Monthly comparison
    const currentTotal = currentMonth?.reduce((sum, e) => sum + e.amount, 0) || 0
    const lastTotal = lastMonth?.reduce((sum, e) => sum + e.amount, 0) || 0
    const monthlyChange = lastTotal ? ((currentTotal - lastTotal) / lastTotal * 100).toFixed(1) : null

    // 2. Category breakdown for current month
    const categoryTotals = {}
    currentMonth?.forEach(e => {
      const catName = e.categories?.name || 'Other'
      categoryTotals[catName] = (categoryTotals[catName] || 0) + e.amount
    })
    const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0]

    // 3. Detect unusual spending (compared to daily average)
    const dailyAvg = currentMonth?.length ? currentTotal / currentMonth.length : 0
    const unusualExpenses = currentMonth
      ?.filter(e => e.amount > dailyAvg * 2) // 2x average
      .map(e => ({
        date: e.expense_date,
        amount: e.amount,
        category: e.categories?.name || 'Other',
        reason: `2x higher than your daily average of ₹${dailyAvg.toFixed(0)}`
      }))

    // 4. Spending trend (compare last 7 days with previous 7 days)
    const sevenDaysAgo = new Date(today)
    sevenDaysAgo.setDate(today.getDate() - 7)
    const fourteenDaysAgo = new Date(today)
    fourteenDaysAgo.setDate(today.getDate() - 14)

    const last7Days = currentMonth?.filter(e => new Date(e.expense_date) >= sevenDaysAgo) || []
    const prev7Days = currentMonth?.filter(e => 
      new Date(e.expense_date) >= fourteenDaysAgo && new Date(e.expense_date) < sevenDaysAgo
    ) || []

    const last7Total = last7Days.reduce((sum, e) => sum + e.amount, 0)
    const prev7Total = prev7Days.reduce((sum, e) => sum + e.amount, 0)
    const weeklyChange = prev7Total ? ((last7Total - prev7Total) / prev7Total * 100).toFixed(1) : null

    // Compile insights
    const insights = []

    if (monthlyChange !== null) {
      insights.push({
        type: 'trend',
        title: monthlyChange > 0 ? '📈 Spending Increased' : '📉 Spending Decreased',
        message: `Your spending this month is ${Math.abs(monthlyChange)}% ${monthlyChange > 0 ? 'higher' : 'lower'} than last month.`,
        value: monthlyChange
      })
    }

    if (topCategory) {
      insights.push({
        type: 'category',
        title: '💰 Top Category',
        message: `You spent the most on ${topCategory[0]}: ₹${topCategory[1].toFixed(0)} this month.`,
        category: topCategory[0],
        amount: topCategory[1]
      })
    }

    if (unusualExpenses?.length) {
      insights.push({
        type: 'alert',
        title: '⚠️ Unusual Spending Detected',
        message: `Found ${unusualExpenses.length} expense(s) significantly above your average.`,
        details: unusualExpenses.slice(0, 3) // show top 3
      })
    }

    if (weeklyChange !== null) {
      insights.push({
        type: 'trend',
        title: weeklyChange > 0 ? '📊 Upward Trend' : '📊 Downward Trend',
        message: `Your spending in the last 7 days is ${Math.abs(weeklyChange)}% ${weeklyChange > 0 ? 'higher' : 'lower'} than the previous week.`,
        value: weeklyChange
      })
    }

    return NextResponse.json({ insights, summary: { currentTotal, lastTotal, dailyAvg } })
  } catch (error) {
    console.error('Insights error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}