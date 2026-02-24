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

    // Get all split expenses where user is involved
    const { data: splitExpenses, error } = await supabase
      .from('split_expenses')
      .select(`
        *,
        split_shares (
          *,
          group_members (*)
        ),
        groups:split_groups (*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching split summary:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    let owed = 0
    let toCollect = 0
    const pendingSettlements = []
    const recentSplits = []

    splitExpenses?.forEach(expense => {
      // Add to recent splits
      recentSplits.push({
        id: expense.id,
        description: expense.description,
        merchant: expense.paid_to,
        totalAmount: expense.total_amount,
        myShare: expense.my_share,
        date: expense.created_at
      })

      // Calculate pending settlements from shares
      expense.split_shares?.forEach(share => {
        if (!share.settled) {
          if (share.member_id !== userId) {
            // Someone owes money to user
            toCollect += share.amount
            pendingSettlements.push({
              id: share.id,
              friendName: share.group_members?.name || 'Friend',
              amount: share.amount,
              type: 'collect',
              description: expense.description
            })
          }
        }
      })
    })

    return NextResponse.json({
      success: true,
      summary: {
        owed,
        toCollect,
        pendingSettlements,
        recentSplits
      }
    })

  } catch (error) {
    console.error('Split summary error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}