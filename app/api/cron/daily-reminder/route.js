import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/utils/supabase-admin'
import { generatePDF } from '@/utils/pdfGenerator'
import { getTodayExpenses } from '@/utils/expenses'
import { sendTelegramDocument, sendTelegramMessage } from '@/utils/telegram'
import { generateInsights } from '@/utils/insights'

// Process users in batches to avoid overwhelming the system
const BATCH_SIZE = 5
const BATCH_DELAY = 2000 // 2 seconds between batches

export async function GET(request) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    console.log('⏰ Daily reminder cron job started')
    
    const now = new Date()
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
    
    // Get users who haven't been processed recently
    const { data: users, error } = await supabaseAdmin
      .from('user_preferences')
      .select('user_id, telegram_chat_id, reminder_time, last_reminder_sent')
      .eq('telegram_enabled', true)
      .not('telegram_chat_id', 'is', null)
      .eq('reminder_time', currentTime)
      .or(`last_reminder_sent.is.null,last_reminder_sent.lt.${new Date(Date.now() - 12*60*60*1000).toISOString()}`)

    if (error) throw error
    
    console.log(`👥 Found ${users?.length || 0} users to process`)
    
    const results = []
    
    // Process in batches
    for (let i = 0; i < (users?.length || 0); i += BATCH_SIZE) {
      const batch = users.slice(i, i + BATCH_SIZE)
      
      const batchResults = await Promise.allSettled(
        batch.map(user => processUserReminder(user))
      )
      
      results.push(...batchResults.map((r, idx) => ({
        userId: batch[idx].user_id,
        status: r.status === 'fulfilled' ? r.value : 'error',
        error: r.status === 'rejected' ? r.reason?.message : null
      })))
      
      if (i + BATCH_SIZE < users.length) {
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY))
      }
    }
    
    // Update last reminder sent for successful users
    await supabaseAdmin
      .from('user_preferences')
      .update({ last_reminder_sent: new Date().toISOString() })
      .in('user_id', results.filter(r => r.status === 'success').map(r => r.userId))

    return NextResponse.json({ 
      success: true, 
      processed: results.length,
      results 
    })

  } catch (error) {
    console.error('❌ Cron job error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

async function processUserReminder(user) {
  try {
    console.log(`📊 Processing user ${user.user_id}`)

    // Get today's expenses
    const { data: expenses } = await getTodayExpenses(user.user_id)
    
    if (!expenses?.length) {
      await sendTelegramMessage(
        user.telegram_chat_id,
        '📝 *No expenses recorded today*\n\nDon\'t forget to add your daily expenses!'
      )
      return 'reminder_sent'
    }

    // Get categories
    const { data: categories } = await supabaseAdmin
      .from('categories')
      .select('*')
      .eq('user_id', user.user_id)

    // Generate PDF
    const today = new Date().toISOString().split('T')[0]
    const pdfBuffer = await generatePDF(expenses, categories, today)

    // Upload to storage
    const fileName = `expenses-${user.user_id}-${today}.pdf`
    await supabaseAdmin.storage
      .from('pdf-reports')
      .upload(fileName, pdfBuffer, { upsert: true })

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('pdf-reports')
      .getPublicUrl(fileName)

    // Generate insights FIRST (so we can decide what to send)
    const { insights } = await generateInsights(user.user_id, supabaseAdmin)
    
    // Send PDF
    await sendTelegramDocument(
      user.telegram_chat_id,
      publicUrl,
      `Expense-Report-${today}.pdf`
    )

    // Send insights if available
    if (insights?.length && insights[0] !== 'Unable to generate insights at this time.') {
      // Format insights nicely
      let insightsMessage = '📊 *Daily Insights*\n\n'
      
      // Separate budget alerts from investment insights
      const budgetAlerts = insights.filter(i => i.includes('OVERSHOOT') || i.includes('Near Limit'))
      const investmentInsights = insights.filter(i => !i.includes('OVERSHOOT') && !i.includes('Near Limit'))
      
      if (budgetAlerts.length > 0) {
        insightsMessage += '*Budget Alerts:*\n'
        insightsMessage += budgetAlerts.map(i => `• ${i}`).join('\n')
        insightsMessage += '\n\n'
      }
      
      if (investmentInsights.length > 0) {
        insightsMessage += '*Investment Tips:*\n'
        insightsMessage += investmentInsights.map(i => `• ${i}`).join('\n')
      }
      
      await sendTelegramMessage(user.telegram_chat_id, insightsMessage)
    }

    return 'success'
  } catch (error) {
    console.error(`❌ Error processing user ${user.user_id}:`, error)
    throw error
  }
}