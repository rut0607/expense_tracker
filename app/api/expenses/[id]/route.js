import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabase } from '@/utils/supabase'

export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: expense, error } = await supabase
      .from('expenses')
      .select(`
        *,
        categories (
          name,
          icon,
          color
        )
      `)
      .eq('id', params.id)
      .eq('user_id', session.user.id)
      .single()

    if (error || !expense) {
      return NextResponse.json({ 
        success: false, 
        error: 'Expense not found' 
      }, { status: 404 })
    }

    return NextResponse.json({ success: true, expense })
    
  } catch (error) {
    console.error('Get expense error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 })
  }
}

export async function PUT(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    const { data: expense, error } = await supabase
      .from('expenses')
      .update({
        amount: body.amount,
        category_id: body.category_id,
        description: body.description,
        expense_date: body.expense_date,
        fields: body.fields,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .eq('user_id', session.user.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ 
        success: false, 
        error: error.message 
      }, { status: 400 })
    }

    return NextResponse.json({ success: true, expense })
    
  } catch (error) {
    console.error('Update expense error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', params.id)
      .eq('user_id', session.user.id)

    if (error) {
      return NextResponse.json({ 
        success: false, 
        error: error.message 
      }, { status: 400 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Expense deleted successfully' 
    })
    
  } catch (error) {
    console.error('Delete expense error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 })
  }
}