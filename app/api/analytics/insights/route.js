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

    // Fetch current month expenses with categories
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

    // Fetch budgets for current month
    const { data: budgets } = await supabase
      .from('budgets')
      .select('monthly_limit, categories(name)')
      .eq('user_id', userId)
      .eq('month', startOfMonth.toISOString())

    // Fetch user preferences for allowance
    const { data: prefs } = await supabase
      .from('user_preferences')
      .select('monthly_allowance')
      .eq('user_id', userId)
      .single()

    // Calculate totals
    const currentTotal = currentMonth?.reduce((sum, e) => sum + e.amount, 0) || 0
    const lastTotal = lastMonth?.reduce((sum, e) => sum + e.amount, 0) || 0
    const monthlyChange = lastTotal ? ((currentTotal - lastTotal) / lastTotal * 100).toFixed(1) : null

    // Calculate savings if allowance exists
    const allowance = prefs?.monthly_allowance || 0
    const saved = allowance > 0 ? allowance - currentTotal : 0

    // Category breakdown with budget comparison
    const categoryData = {}
    currentMonth?.forEach(e => {
      const catName = e.categories?.name || 'Other'
      if (!categoryData[catName]) {
        categoryData[catName] = {
          spent: 0,
          budget: null
        }
      }
      categoryData[catName].spent += e.amount
    })

    // Add budget info
    budgets?.forEach(b => {
      const catName = b.categories?.name
      if (catName && categoryData[catName]) {
        categoryData[catName].budget = b.monthly_limit
      }
    })

    // Find categories near/over budget
    const budgetAlerts = []
    Object.entries(categoryData).forEach(([name, data]) => {
      if (data.budget && data.spent > data.budget) {
        budgetAlerts.push(`⚠️ You've exceeded your ${name} budget by ₹${(data.spent - data.budget).toFixed(0)}`)
      } else if (data.budget && data.spent > data.budget * 0.8) {
        budgetAlerts.push(`📊 You're close to your ${name} budget (${Math.round((data.spent/data.budget)*100)}% used)`)
      }
    })

    // Find top category
    const topCategory = Object.entries(categoryData)
      .sort((a, b) => b[1].spent - a[1].spent)[0]

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
        message: `You spent the most on ${topCategory[0]}: ₹${topCategory[1].spent.toFixed(0)} this month.`,
        category: topCategory[0],
        amount: topCategory[1].spent
      })
    }

    if (budgetAlerts.length > 0) {
      insights.push({
        type: 'alert',
        title: '⚠️ Budget Alerts',
        message: budgetAlerts.join('\n')
      })
    }

    if (saved > 0) {
      insights.push({
        type: 'savings',
        title: '💰 Savings Opportunity',
        message: `You saved ₹${saved.toFixed(0)} this month. Consider investing in a low-cost index fund or building an emergency fund.`
      })
    } else if (saved < 0 && allowance > 0) {
      insights.push({
        type: 'alert',
        title: '⚠️ Overspending Alert',
        message: `You've spent ₹${Math.abs(saved).toFixed(0)} more than your allowance this month.`
      })
    }

    // Calculate daily average
    const dailyAvg = currentMonth?.length ? currentTotal / currentMonth.length : 0

    return NextResponse.json({ 
      insights, 
      summary: { 
        currentTotal, 
        lastTotal, 
        dailyAvg,
        saved,
        allowance
      } 
    })
  } catch (error) {
    console.error('Insights error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}