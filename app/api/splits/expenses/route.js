import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabase } from '@/utils/supabase'

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { 
      transactionId,
      totalAmount, 
      myShare, 
      groupId,
      friends = [],
      description, 
      merchant 
    } = await request.json()

    console.log('💰 Creating split expense:', { totalAmount, myShare, groupId, friends })

    let memberCount = 1
    let memberIds = []

    // CASE 1: Split with existing group
    if (groupId) {
      const { data: members, error: membersError } = await supabase
        .from('group_members')
        .select('id, name, email')
        .eq('group_id', groupId)

      if (membersError) throw membersError
      memberCount = members.length
      memberIds = members.map(m => m.id)
    } 
    // CASE 2: Split with custom friends
    else if (friends.length > 0) {
      memberCount = friends.length
      // Create temporary member records for custom friends
      memberIds = friends.map(f => f.id || `temp-${Date.now()}-${Math.random()}`)
    } else {
      return NextResponse.json({ error: 'No group or friends selected' }, { status: 400 })
    }

    const toCollect = totalAmount - myShare
    const friendShare = memberCount > 0 ? toCollect / memberCount : 0

    // Create split expense record
    const { data: splitExpense, error: expenseError } = await supabase
      .from('split_expenses')
      .insert({
        user_id: session.user.id,
        group_id: groupId || null,
        expense_id: transactionId || null,
        total_amount: totalAmount,
        my_share: myShare,
        to_collect: toCollect,
        description: description || merchant || 'Split expense',
        paid_to: merchant,
        transaction_id: transactionId,
        settled: false
      })
      .select()
      .single()

    if (expenseError) throw expenseError

    // Create shares for each friend
    if (memberCount > 0) {
      const shareRecords = []
      
      if (groupId) {
        // For group members, use actual member IDs
        const { data: members } = await supabase
          .from('group_members')
          .select('id')
          .eq('group_id', groupId)
        
        shareRecords.push(...members.map(member => ({
          split_expense_id: splitExpense.id,
          member_id: member.id,
          amount: friendShare,
          settled: false
        })))
      } else {
        // For custom friends, create temp records
        shareRecords.push(...friends.map(friend => ({
          split_expense_id: splitExpense.id,
          member_id: null,
          member_name: friend.name,
          member_email: friend.email || null,
          amount: friendShare,
          settled: false
        })))
      }

      const { error: sharesError } = await supabase
        .from('split_shares')
        .insert(shareRecords)

      if (sharesError) throw sharesError
    }

    return NextResponse.json({ success: true, data: splitExpense })

  } catch (error) {
    console.error('❌ Split creation error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}