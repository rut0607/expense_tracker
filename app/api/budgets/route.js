import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'
import { supabase } from '@/utils/supabase'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = session.user.id
  const today = new Date()
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString()

  const { data, error } = await supabase
    .from('budgets')
    .select(`
      *,
      categories (
        id,
        name,
        icon,
        color
      )
    `)
    .eq('user_id', userId)
    .eq('month', firstDayOfMonth)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { category_id, monthly_limit } = await request.json()
  const userId = session.user.id
  const today = new Date()
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString()

  const { data, error } = await supabase
    .from('budgets')
    .upsert({
      user_id: userId,
      category_id,
      monthly_limit,
      month: firstDayOfMonth,
      updated_at: new Date().toISOString()
    })
    .select()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data[0])
}