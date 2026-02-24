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

    // Check if we should use mock data (for testing)
    const { searchParams } = new URL(request.url)
    const useMock = searchParams.get('mock') === 'true'

    if (useMock) {
      // Return mock data for testing UI
      const mockTransactions = [
        {
          id: 'mock-1',
          merchant: 'Zomato',
          amount: 450,
          description: 'Lunch order with friends',
          date: new Date().toISOString().split('T')[0],
          category: 'Food',
          confidence: 0.95,
          is_split_candidate: true
        },
        {
          id: 'mock-2',
          merchant: 'Swiggy',
          amount: 1200,
          description: 'Dinner order',
          date: new Date().toISOString().split('T')[0],
          category: 'Food',
          confidence: 0.92,
          is_split_candidate: true
        },
        {
          id: 'mock-3',
          merchant: 'Amazon Pay',
          amount: 2500,
          description: 'Online shopping',
          date: new Date().toISOString().split('T')[0],
          category: 'Shopping',
          confidence: 0.88,
          is_split_candidate: false
        },
        {
          id: 'mock-4',
          merchant: 'Uber',
          amount: 350,
          description: 'Cab ride',
          date: new Date().toISOString().split('T')[0],
          category: 'Transport',
          confidence: 0.91,
          is_split_candidate: false
        }
      ]

      return NextResponse.json({ 
        success: true, 
        transactions: mockTransactions,
        mock: true
      })
    }

    // Fetch real pending transactions from database
    const { data, error } = await supabase
      .from('pending_transactions')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('processed', false)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching pending transactions:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      transactions: data || [],
      mock: false
    })

  } catch (error) {
    console.error('Error in GET /api/email/pending:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await request.json()
    
    // If it's a mock transaction (starts with 'mock-'), just return success
    if (id.startsWith('mock-')) {
      return NextResponse.json({ success: true })
    }
    
    // Delete real pending transaction from database
    const { error } = await supabase
      .from('pending_transactions')
      .delete()
      .eq('id', id)
      .eq('user_id', session.user.id)

    if (error) {
      console.error('Error deleting pending transaction:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error in DELETE /api/email/pending:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}