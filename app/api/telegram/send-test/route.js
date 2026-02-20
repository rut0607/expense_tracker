import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import { sendTelegramMessage } from '@/utils/telegram'
import { supabase } from '@/utils/supabase'

export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data } = await supabase
      .from('user_preferences')
      .select('telegram_chat_id')
      .eq('user_id', session.user.id)
      .single()

    if (!data?.telegram_chat_id) {
      return NextResponse.json({ error: 'Telegram not linked' }, { status: 400 })
    }

    const result = await sendTelegramMessage(
      data.telegram_chat_id,
      '✅ This is a test message from your Expense Tracker bot!'
    )

    if (result.success) {
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}