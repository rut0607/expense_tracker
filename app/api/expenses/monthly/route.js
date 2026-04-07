import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
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
      return NextResponse.json({ 
        success: false, 
        error: 'Year and month required' 
      }, { status: 400 })
    }

    // Validate year and month
    const yearNum = parseInt(year)
    const monthNum = parseInt(month)
    if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid year or month format' 
      }, { status: 400 })
    }

    // Calculate first and last day of the month
    const firstDay = new Date(yearNum, monthNum - 1, 1).toISOString().split('T')[0]
    const lastDay = new Date(yearNum, monthNum, 0).toISOString().split('T')[0]

    // Fetch expenses for the specified month
    const { data: expenses, error } = await supabase
      .from('expenses')
      .select(`
        amount,
        category_id,
        categories (
          id,
          name,
          icon,
          color
        )
      `)
      .eq('user_id', session.user.id)
      .gte('expense_date', firstDay)
      .lte('expense_date', lastDay)

    if (error) {
      console.error('Error fetching expenses:', error)
      return NextResponse.json({ 
        success: false, 
        error: error.message 
      }, { status: 500 })
    }

    // Group spending by category
    const spendingMap = {}
    const categoryDetails = {}
    
    expenses?.forEach(expense => {
      const catId = expense.category_id
      spendingMap[catId] = (spendingMap[catId] || 0) + (expense.amount || 0)
      
      if (catId && !categoryDetails[catId] && expense.categories) {
        categoryDetails[catId] = expense.categories
      }
    })

    return NextResponse.json({ 
      success: true, 
      spending: spendingMap,
      categories: categoryDetails,
      count: expenses?.length || 0
    })

  } catch (error) {
    console.error('Monthly expenses API error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 })
  }
}