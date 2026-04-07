import { NextResponse } from 'next/server'
import TelegramBot from 'node-telegram-bot-api'
import { supabase } from '@/utils/supabase'
import { supabaseAdmin } from '@/utils/supabase-admin'
import { generateInsights } from '@/utils/insights'

const token = process.env.TELEGRAM_BOT_TOKEN
const bot = new TelegramBot(token)

// Helper function to find user by chat ID
async function findUserByChatId(chatId) {
  const { data: prefs, error } = await supabase
    .from('user_preferences')
    .select('user_id, telegram_chat_id')
    .eq('telegram_chat_id', String(chatId))
    .maybeSingle()

  if (error) {
    console.error('❌ Error finding user:', error)
    return null
  }
  
  return prefs
}

// Helper function to get user's default category
async function getDefaultCategory(userId) {
  const { data: categories, error } = await supabase
    .from('categories')
    .select('id, name, icon')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .limit(1)

  if (error || !categories?.length) {
    return null
  }
  
  return categories[0]
}

// Helper function to format currency
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

export async function POST(request) {
  try {
    const update = await request.json()
    const { message } = update

    if (!message) {
      return NextResponse.json({ ok: true })
    }

    const chatId = message.chat.id
    const text = message.text?.trim() || ''
    console.log('📱 Received message:', { chatId, text })

    // ============= COMMAND: /start =============
    if (text === '/start') {
      await bot.sendMessage(
        chatId,
        '👋 *Welcome to Expense Tracker Bot!*\n\n' +
        'To get started, please send your registered email address to link your account.\n\n' +
        '*Available Commands:*\n' +
        '• `/start` - Show this message\n' +
        '• `/add [amount] [description]` - Quick add expense\n' +
        '• `/today` - View today\'s expenses\n' +
        '• `/budget` - Get budget insights\n' +
        '• `/help` - Show all commands',
        { parse_mode: 'Markdown' }
      )
      return NextResponse.json({ ok: true })
    }
    
    // ============= COMMAND: /help =============
    else if (text === '/help') {
      await bot.sendMessage(
        chatId,
        '📚 *Available Commands*\n\n' +
        '*Account Management:*\n' +
        '• `/start` - Start and link your account\n' +
        '• Send your email - Link your account\n\n' +
        '*Expense Tracking:*\n' +
        '• `/add 500 lunch` - Add a quick expense\n' +
        '• `/today` - View today\'s expenses\n' +
        '• `/budget` - Get budget insights and alerts\n\n' +
        '*Reports:*\n' +
        '• Daily PDF report at 9 PM (if enabled)\n' +
        '• Monthly summary on the 1st',
        { parse_mode: 'Markdown' }
      )
      return NextResponse.json({ ok: true })
    }
    
    // ============= COMMAND: /add [amount] [description] =============
    else if (text.startsWith('/add')) {
      console.log('💰 Processing /add command:', text)
      
      // Find user by chat ID
      const prefs = await findUserByChatId(chatId)
      
      if (!prefs) {
        await bot.sendMessage(
          chatId,
          '❌ Please link your account first by sending your registered email address.'
        )
        return NextResponse.json({ ok: true })
      }

      // Parse command: /add 500 lunch at restaurant
      const parts = text.split(' ')
      
      if (parts.length < 2) {
        await bot.sendMessage(
          chatId,
          '⚠️ *Usage:* `/add [amount] [description]`\n' +
          'Example: `/add 500 lunch`\n' +
          'Example: `/add 2500 grocery shopping`',
          { parse_mode: 'Markdown' }
        )
        return NextResponse.json({ ok: true })
      }
      
      // Extract and validate amount
      const amountStr = parts[1].replace(/[₹,]/g, '') // Remove ₹ and commas
      const amount = parseFloat(amountStr)
      
      if (isNaN(amount) || amount <= 0) {
        await bot.sendMessage(
          chatId,
          '❌ Please enter a valid amount (positive number).\n' +
          'Example: `/add 500 lunch`'
        )
        return NextResponse.json({ ok: true })
      }
      
      // Extract description (rest of the message)
      const description = parts.slice(2).join(' ').trim() || 'Quick add'
      
      // Get user's default category (first active category)
      const defaultCategory = await getDefaultCategory(prefs.user_id)
      
      if (!defaultCategory) {
        await bot.sendMessage(
          chatId,
          '❌ No categories found. Please create a category first in the web app.'
        )
        return NextResponse.json({ ok: true })
      }
      
      // Create expense
      const { data: expense, error } = await supabase
        .from('expenses')
        .insert({
          user_id: prefs.user_id,
          category_id: defaultCategory.id,
          amount: amount,
          description: description,
          expense_date: new Date().toISOString().split('T')[0],
          fields: { 
            source: 'telegram',
            added_via: 'quick_add'
          }
        })
        .select()
        .single()
      
      if (error) {
        console.error('❌ Error creating expense:', error)
        await bot.sendMessage(
          chatId,
          '❌ Failed to add expense. Please try again or add via web app.'
        )
      } else {
        // Get today's total after adding
        const today = new Date().toISOString().split('T')[0]
        const { data: todayExpenses } = await supabase
          .from('expenses')
          .select('amount')
          .eq('user_id', prefs.user_id)
          .eq('expense_date', today)
        
        const todayTotal = todayExpenses?.reduce((sum, e) => sum + e.amount, 0) || 0
        
        await bot.sendMessage(
          chatId,
          `✅ *Expense Added!*\n\n` +
          `💰 Amount: *₹${amount}*\n` +
          `📝 Description: ${description}\n` +
          `📂 Category: ${defaultCategory.icon || '📌'} ${defaultCategory.name}\n` +
          `📊 Today's Total: *${formatCurrency(todayTotal)}*\n\n` +
          `Use /today to see all today's expenses.`,
          { parse_mode: 'Markdown' }
        )
      }
      
      return NextResponse.json({ ok: true })
    }
    
    // ============= COMMAND: /today =============
    else if (text === '/today') {
      console.log('📅 Processing /today command')
      
      // Find user by chat ID
      const prefs = await findUserByChatId(chatId)
      
      if (!prefs) {
        await bot.sendMessage(
          chatId,
          '❌ Please link your account first by sending your registered email address.'
        )
        return NextResponse.json({ ok: true })
      }
      
      const today = new Date().toISOString().split('T')[0]
      
      // Get today's expenses with category details
      const { data: expenses, error } = await supabase
        .from('expenses')
        .select(`
          amount,
          description,
          expense_date,
          categories (
            name,
            icon,
            color
          )
        `)
        .eq('user_id', prefs.user_id)
        .eq('expense_date', today)
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('❌ Error fetching expenses:', error)
        await bot.sendMessage(
          chatId,
          '❌ Failed to fetch expenses. Please try again later.'
        )
        return NextResponse.json({ ok: true })
      }
      
      if (!expenses || expenses.length === 0) {
        await bot.sendMessage(
          chatId,
          `📅 *No Expenses Today*\n\n` +
          `You haven't recorded any expenses for ${today}.\n` +
          `Add one quickly with: \`/add [amount] [description]\``,
          { parse_mode: 'Markdown' }
        )
        return NextResponse.json({ ok: true })
      }
      
      // Calculate total
      const total = expenses.reduce((sum, e) => sum + e.amount, 0)
      
      // Group by category
      const byCategory = {}
      expenses.forEach(e => {
        const catName = e.categories?.name || 'Uncategorized'
        const catIcon = e.categories?.icon || '📝'
        if (!byCategory[catName]) {
          byCategory[catName] = {
            icon: catIcon,
            total: 0,
            count: 0,
            items: []
          }
        }
        byCategory[catName].total += e.amount
        byCategory[catName].count++
        byCategory[catName].items.push(e)
      })
      
      // Build message
      let message = `📅 *Today's Expenses*\n`
      message += `📆 ${new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}\n\n`
      
      // List expenses
      expenses.slice(0, 5).forEach((e, index) => {
        const icon = e.categories?.icon || '📝'
        const catName = e.categories?.name || 'Other'
        message += `${icon} *₹${e.amount}* - ${e.description || catName}\n`
      })
      
      if (expenses.length > 5) {
        message += `... and ${expenses.length - 5} more\n`
      }
      
      message += `\n📊 *Summary*\n`
      message += `• Total: *${formatCurrency(total)}*\n`
      message += `• Transactions: *${expenses.length}*\n\n`
      
      // Category breakdown
      message += `*By Category:*\n`
      Object.entries(byCategory).forEach(([cat, data]) => {
        const percentage = ((data.total / total) * 100).toFixed(1)
        message += `${data.icon} ${cat}: ${formatCurrency(data.total)} (${percentage}%)\n`
      })
      
      // Add quick stats
      const avgPerTransaction = (total / expenses.length).toFixed(0)
      message += `\n📈 *Average per transaction:* ${formatCurrency(avgPerTransaction)}`
      
      await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' })
      
      return NextResponse.json({ ok: true })
    }
    
    // ============= COMMAND: /budget =============
    else if (text === '/budget') {
      console.log('💰 Processing /budget command')
      
      // Find user by chat ID
      const prefs = await findUserByChatId(chatId)

      if (!prefs) {
        await bot.sendMessage(
          chatId,
          '❌ Please link your account first by sending your registered email address.'
        )
        return NextResponse.json({ ok: true })
      }

      console.log('✅ Found user:', prefs.user_id)
      
      // Generate insights using admin client (bypass RLS)
      const { insights, saved } = await generateInsights(prefs.user_id, supabaseAdmin)

      if (!insights || insights.length === 0 || insights[0] === 'Unable to generate insights at this time.') {
        await bot.sendMessage(
          chatId,
          '📊 Not enough data to generate insights yet. Keep adding expenses!'
        )
        return NextResponse.json({ ok: true })
      }

      let responseMessage = '📊 *Budget Insights*\n\n'
      
      // Separate different types of insights
      const alerts = insights.filter(i => i.includes('⚠️') || i.includes('OVERSHOOT') || i.includes('Near Limit'))
      const tips = insights.filter(i => !alerts.includes(i))
      
      if (alerts.length > 0) {
        responseMessage += '*🔔 Alerts:*\n'
        responseMessage += alerts.map(i => `• ${i}`).join('\n')
        responseMessage += '\n\n'
      }
      
      if (tips.length > 0) {
        responseMessage += '*💡 Tips:*\n'
        responseMessage += tips.map(i => `• ${i}`).join('\n')
      }
      
      if (saved !== undefined && saved > 0) {
        responseMessage += `\n\n💰 *Saved this month:* ${formatCurrency(saved)}`
      }

      await bot.sendMessage(chatId, responseMessage, { parse_mode: 'Markdown' })
      return NextResponse.json({ ok: true })
    }
    
    // ============= EMAIL LINKING =============
    else if (text && text.includes('@') && text.includes('.')) {
      console.log('📧 Linking email:', text)
      
      // Find user by email
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, email, name')
        .eq('email', text.trim().toLowerCase())
        .maybeSingle()

      if (userError) {
        console.error('❌ User lookup error:', userError)
        await bot.sendMessage(chatId, '❌ An error occurred. Please try again.')
        return NextResponse.json({ ok: true })
      }

      if (!user) {
        console.log('❌ No user found with email:', text)
        await bot.sendMessage(
          chatId,
          '❌ No account found with that email. Please sign up first at our web app.'
        )
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
        await bot.sendMessage(
          chatId,
          '❌ Failed to link account. Please try again.'
        )
        return NextResponse.json({ ok: true })
      }

      // Send welcome message with user's name
      const welcomeMessage = user.name 
        ? `✅ Welcome ${user.name}! Your account is linked successfully.`
        : `✅ Your account is linked successfully!`

      await bot.sendMessage(
        chatId,
        `${welcomeMessage}\n\n` +
        `You will now receive daily expense reports here.\n\n` +
        `*Quick Commands:*\n` +
        `• \`/add 500 lunch\` - Quick add expense\n` +
        `• \`/today\` - View today's expenses\n` +
        `• \`/budget\` - Check budget insights\n` +
        `• \`/help\` - Show all commands`,
        { parse_mode: 'Markdown' }
      )
      
      return NextResponse.json({ ok: true })
    }
    
    // ============= UNKNOWN COMMAND =============
    else {
      await bot.sendMessage(
        chatId,
        '❓ Unknown command. Send `/help` to see available commands.'
      )
      return NextResponse.json({ ok: true })
    }

  } catch (error) {
    console.error('❌ Telegram webhook error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}