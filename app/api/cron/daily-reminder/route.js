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
    
    // Get users who haven't been processed recently and have reminders enabled
    const { data: users, error } = await supabaseAdmin
      .from('user_preferences')
      .select('user_id, telegram_chat_id, reminder_time')
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
      
      // Update last reminder sent for successful users in this batch
      const successfulIds = batchResults
        .map((r, idx) => r.status === 'fulfilled' && r.value === 'success' ? batch[idx].user_id : null)
        .filter(Boolean)
      
      if (successfulIds.length > 0) {
        await supabaseAdmin
          .from('user_preferences')
          .update({ last_reminder_sent: new Date().toISOString() })
          .in('user_id', successfulIds)
      }
      
      if (i + BATCH_SIZE < users.length) {
        console.log(`⏳ Waiting ${BATCH_DELAY}ms before next batch...`)
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY))
      }
    }

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
    const today = new Date().toISOString().split('T')[0]
    const { data: expenses, error: expensesError } = await supabaseAdmin
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
      .eq('user_id', user.user_id)
      .eq('expense_date', today)

    if (expensesError) throw expensesError
    
    // Get categories for PDF
    const { data: categories } = await supabaseAdmin
      .from('categories')
      .select('*')
      .eq('user_id', user.user_id)

    // Calculate daily total
    const dailyTotal = expenses?.reduce((sum, e) => sum + e.amount, 0) || 0

    // If no expenses, send simple reminder
    if (!expenses?.length) {
      await sendTelegramMessage(
        user.telegram_chat_id,
        `📝 *No expenses recorded today*\n\n` +
        `Don't forget to add your daily expenses!\n` +
        `Quick add: \`/add [amount] [description]\``
      )
      return 'reminder_sent'
    }

    // Generate PDF report
    const pdfBuffer = await generatePDF(expenses, categories, today)

    // Upload to storage with proper path
    const fileName = `expenses/${user.user_id}/${today}.pdf`
    const { error: uploadError } = await supabaseAdmin.storage
      .from('pdf-reports')
      .upload(fileName, pdfBuffer, { 
        upsert: true,
        contentType: 'application/pdf'
      })

    if (uploadError) throw uploadError

    // Get public URL
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('pdf-reports')
      .getPublicUrl(fileName)

    // Generate insights
    const { insights, saved } = await generateInsights(user.user_id, supabaseAdmin)
    
    // Send PDF report
    await sendTelegramDocument(
      user.telegram_chat_id,
      publicUrl,
      `Expense-Report-${today}.pdf`
    )

    // Prepare summary message
    let summaryMessage = `📊 *Daily Expense Summary*\n`
    summaryMessage += `📆 ${new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}\n\n`
    
    // Add top expenses
    summaryMessage += `*Top Expenses:*\n`
    expenses.slice(0, 3).forEach(e => {
      const icon = e.categories?.icon || '📝'
      summaryMessage += `${icon} ₹${e.amount} - ${e.description || e.categories?.name || 'Expense'}\n`
    })
    
    if (expenses.length > 3) {
      summaryMessage += `... and ${expenses.length - 3} more\n`
    }
    
    summaryMessage += `\n*Total: ₹${dailyTotal}*`

    // Send summary
    await sendTelegramMessage(user.telegram_chat_id, summaryMessage)

    // Send insights if available
    if (insights?.length && insights[0] !== 'Unable to generate insights at this time.') {
      let insightsMessage = '🔔 *Quick Insights*\n\n'
      
      // Get budget alerts
      const alerts = insights.filter(i => i.includes('⚠️') || i.includes('OVERSHOOT') || i.includes('Near Limit'))
      if (alerts.length > 0) {
        insightsMessage += alerts.map(i => `• ${i}`).join('\n')
      }
      
      if (saved > 0) {
        insightsMessage += `\n\n💰 *Saved:* ₹${saved.toFixed(0)}`
      }
      
      await sendTelegramMessage(user.telegram_chat_id, insightsMessage)
    }

    return 'success'
  } catch (error) {
    console.error(`❌ Error processing user ${user.user_id}:`, error)
    throw error
  }
}