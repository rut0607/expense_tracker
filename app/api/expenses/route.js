import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ExpenseService } from '@/lib/services/expense.service'

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = searchParams.get('limit') || 50
    const offset = searchParams.get('offset') || 0
    const categoryId = searchParams.get('categoryId')
    
    let query = supabase
      .from('expenses')
      .select(`
        *,
        categories (
          name,
          icon,
          color
        )
      `)
      .eq('user_id', session.user.id)
      .order('expense_date', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1)
    
    if (categoryId) {
      query = query.eq('category_id', categoryId)
    }
    
    const { data: expenses, error } = await query
    
    if (error) throw error
    
    return NextResponse.json({ 
      success: true, 
      expenses,
      count: expenses.length
    })
    
  } catch (error) {
    console.error('Expenses API error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    // Use the service we created
    const service = new ExpenseService(session.user.id)
    const expense = await service.create(body)
    
    return NextResponse.json({ 
      success: true, 
      expense 
    }, { status: 201 })
    
  } catch (error) {
    console.error('Create expense error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: error.status || 500 })
  }
}