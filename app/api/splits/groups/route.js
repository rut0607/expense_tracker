import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import { supabase } from '@/utils/supabase'

// Get all groups for user
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('split_groups')
    .select(`
      *,
      group_members (*)
    `)
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, data })
}

// Create new group
export async function POST(request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { name, description, members } = await request.json()

  // Start a transaction
  const { data: group, error: groupError } = await supabase
    .from('split_groups')
    .insert({
      user_id: session.user.id,
      name,
      description
    })
    .select()
    .single()

  if (groupError) {
    return NextResponse.json({ error: groupError.message }, { status: 500 })
  }

  // Add members
  if (members?.length > 0) {
    const memberRecords = members.map(m => ({
      group_id: group.id,
      user_id: session.user.id,
      name: m.name,
      email: m.email,
      phone: m.phone
    }))

    const { error: memberError } = await supabase
      .from('group_members')
      .insert(memberRecords)

    if (memberError) {
      return NextResponse.json({ error: memberError.message }, { status: 500 })
    }
  }

  return NextResponse.json({ success: true, data: group })
}