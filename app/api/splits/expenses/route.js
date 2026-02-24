import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import { supabase } from '@/utils/supabase'

export async function POST(request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { 
    group_id, 
    total_amount, 
    description, 
    paid_to,
    transaction_id,
    split_type = 'equal', // 'equal', 'custom', 'percentage'
    shares = [] 
  } = await request.json()

  // Calculate my share (assuming equal split for now)
  const { data: members } = await supabase
    .from('group_members')
    .select('id')
    .eq('group_id', group_id)

  const memberCount = members?.length || 1
  const myShare = total_amount / memberCount
  const toCollect = total_amount - myShare

  // Create split expense
  const { data: splitExpense, error: expenseError } = await supabase
    .from('split_expenses')
    .insert({
      user_id: session.user.id,
      group_id,
      total_amount,
      my_share: myShare,
      to_collect: toCollect,
      description,
      paid_to,
      transaction_id
    })
    .select()
    .single()

  if (expenseError) {
    return NextResponse.json({ error: expenseError.message }, { status: 500 })
  }

  // Create individual shares
  if (members) {
    const shareRecords = members.map(member => ({
      split_expense_id: splitExpense.id,
      member_id: member.id,
      amount: total_amount / memberCount
    }))

    const { error: sharesError } = await supabase
      .from('split_shares')
      .insert(shareRecords)

    if (sharesError) {
      return NextResponse.json({ error: sharesError.message }, { status: 500 })
    }
  }

  return NextResponse.json({ success: true, data: splitExpense })
}