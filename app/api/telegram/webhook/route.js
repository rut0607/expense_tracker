import { NextResponse } from 'next/server'
import TelegramBot from 'node-telegram-bot-api'
import { supabase } from '@/utils/supabase'

const token = process.env.TELEGRAM_BOT_TOKEN
const bot = new TelegramBot(token)

export async function POST(request) {
  try {
    const update = await request.json()
    const { message } = update

    if (!message) return NextResponse.json({ ok: true })

    const chatId = message.chat.id
    const text = message.text

    if (text === '/start') {
      await bot.sendMessage(
        chatId,
        'Welcome to Expense Tracker Bot! Please send your registered email address to link your account.'
      )
    } else if (text && text.includes('@')) {
      // Assume it's an email – find user and store chatId
      const { data: user, error } = await supabase
        .from('users')
        .select('id')
        .eq('email', text.trim())
        .single()

      if (user) {
        // Store chatId in user_preferences (upsert)
        await supabase.from('user_preferences').upsert(
          {
            user_id: user.id,
            telegram_chat_id: String(chatId),
            telegram_enabled: true,
            updated_at: new Date().toISOString()
          },
          { onConflict: 'user_id' }
        )

        await bot.sendMessage(
          chatId,
          '✅ Your account is linked! You will receive daily expense reports here.'
        )
      } else {
        await bot.sendMessage(
          chatId,
          '❌ No user found with that email. Please try again.'
        )
      }
    } else {
      await bot.sendMessage(
        chatId,
        'Please send your registered email to link your account.'
      )
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Telegram webhook error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}