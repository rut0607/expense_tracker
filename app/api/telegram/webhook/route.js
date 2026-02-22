import { NextResponse } from 'next/server'
import TelegramBot from 'node-telegram-bot-api'
import { supabase } from '@/utils/supabase'
import { supabaseAdmin } from '@/utils/supabase-admin'
import { generateInsights } from '@/utils/insights'

const token = process.env.TELEGRAM_BOT_TOKEN
const bot = new TelegramBot(token)

export async function POST(request) {
  try {
    const update = await request.json()
    const { message } = update

    if (!message) {
      return NextResponse.json({ ok: true })
    }

    const chatId = message.chat.id
    const text = message.text
    console.log('📱 Received message:', { chatId, text })

    if (text === '/start') {
      await bot.sendMessage(
        chatId,
        'Welcome to Expense Tracker Bot! Please send your registered email address to link your account.'
      )
      return NextResponse.json({ ok: true })
      
    } else if (text === '/budget') {
      console.log('🔍 Looking for user with chat ID:', chatId)
      
      // Find user by telegram chat id - use maybeSingle() instead of single()
      const { data: prefs, error: prefsError } = await supabase
        .from('user_preferences')
        .select('user_id, telegram_chat_id')
        .eq('telegram_chat_id', String(chatId))
        .maybeSingle() // 👈 Changed from .single() to .maybeSingle()

      console.log('Query result:', { prefs, prefsError })

      if (prefsError) {
        console.error('❌ Database error:', prefsError)
        await bot.sendMessage(chatId, 'An error occurred. Please try again later.')
        return NextResponse.json({ ok: true })
      }

      if (!prefs) {
        console.log('❌ No user found for chat ID:', chatId)
        await bot.sendMessage(chatId, 'Please link your account first via /start and email.')
        return NextResponse.json({ ok: true })
      }

      console.log('✅ Found user:', prefs.user_id)
      
      // Generate insights using admin client (bypass RLS)
      const { insights, saved } = await generateInsights(prefs.user_id, supabaseAdmin)

      if (!insights || insights.length === 0 || insights[0] === 'Unable to generate insights at this time.') {
        await bot.sendMessage(chatId, 'Not enough data to generate insights yet. Keep adding expenses!')
        return NextResponse.json({ ok: true })
      }

      let responseMessage = '📊 *Budget Insights*\n\n'
      responseMessage += insights.map(i => `• ${i}`).join('\n\n')
      if (saved !== undefined) {
        responseMessage += `\n\n💰 *Saved this month:* ₹${saved.toFixed(0)}`
      }

      await bot.sendMessage(chatId, responseMessage, { parse_mode: 'Markdown' })
      return NextResponse.json({ ok: true })
      
    } else if (text && text.includes('@')) {
      console.log('📧 Linking email:', text.trim())
      
      // Find user by email
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('email', text.trim())
        .maybeSingle()

      if (userError) {
        console.error('❌ User lookup error:', userError)
        await bot.sendMessage(chatId, 'An error occurred. Please try again.')
        return NextResponse.json({ ok: true })
      }

      if (!user) {
        console.log('❌ No user found with email:', text.trim())
        await bot.sendMessage(chatId, '❌ No user found with that email. Please try again.')
        return NextResponse.json({ ok: true })
      }

      console.log('✅ Found user:', user.id)
      
      // First, clear any existing links for this chat ID (to avoid duplicates)
      const { error: deleteError } = await supabase
        .from('user_preferences')
        .update({ telegram_chat_id: null })
        .eq('telegram_chat_id', String(chatId))

      if (deleteError) {
        console.error('❌ Error clearing old links:', deleteError)
      }

      // Now link the new user
      const { error: upsertError } = await supabase
        .from('user_preferences')
        .upsert(
          {
            user_id: user.id,
            telegram_chat_id: String(chatId),
            telegram_enabled: true,
            updated_at: new Date().toISOString()
          },
          { onConflict: 'user_id' }
        )

      if (upsertError) {
        console.error('❌ Error linking account:', upsertError)
        await bot.sendMessage(chatId, '❌ Failed to link account. Please try again.')
        return NextResponse.json({ ok: true })
      }

      await bot.sendMessage(
        chatId,
        '✅ Your account is linked! You will receive daily expense reports here.'
      )
      return NextResponse.json({ ok: true })
      
    } else {
      await bot.sendMessage(
        chatId,
        'Please send your registered email to link your account.'
      )
      return NextResponse.json({ ok: true })
    }

  } catch (error) {
    console.error('❌ Telegram webhook error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}