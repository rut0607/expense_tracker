import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/utils/supabase-admin'
import { generatePDF } from '@/utils/pdfGenerator'
import { getTodayExpenses } from '@/utils/expenses'
import { sendTelegramDocument, sendTelegramMessage } from '@/utils/telegram'
import { generateInsights } from '@/utils/insights'

// This endpoint will be called by cron-job.org
export async function GET(request) {
  // Security: Check for secret key
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    console.log('⏰ Daily reminder cron job started')
    
    // Get all users with Telegram enabled
    const { data: users, error } = await supabaseAdmin
      .from('user_preferences')
      .select('user_id, telegram_chat_id, reminder_time')
      .eq('telegram_enabled', true)
      .not('telegram_chat_id', 'is', null)

    if (error) throw error
    
    console.log(`👥 Found ${users?.length || 0} users with Telegram enabled`)

    const now = new Date()
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
    
    const results = []

    // Process each user
    for (const user of users || []) {
      try {
        // Check if it's time to send (if reminder_time is set)
        if (user.reminder_time && user.reminder_time !== currentTime) {
          continue // Skip if not the right time
        }

        console.log(`📊 Processing user ${user.user_id}`)

        // Get today's expenses
        const { data: expenses } = await getTodayExpenses(user.user_id)
        
        if (!expenses?.length) {
          // Send gentle reminder to add expenses
          await sendTelegramMessage(
            user.telegram_chat_id,
            '📝 *No expenses recorded today*\n\nDont forget to add your daily expenses to get insights and maintain your tracking streak!'
          )
          results.push({ userId: user.user_id, status: 'reminder_sent' })
          continue
        }

        // Get categories for PDF generation
        const { data: categories } = await supabaseAdmin
          .from('categories')
          .select('*')
          .eq('user_id', user.user_id)

        // Generate PDF
        const today = new Date().toISOString().split('T')[0]
        const pdfBuffer = await generatePDF(expenses, categories, today)

        // Upload to Supabase storage
        const fileName = `expenses-${user.user_id}-${today}.pdf`
        await supabaseAdmin.storage
          .from('pdf-reports')
          .upload(fileName, pdfBuffer, { 
            contentType: 'application/pdf', 
            upsert: true 
          })

        const { data: { publicUrl } } = supabaseAdmin.storage
          .from('pdf-reports')
          .getPublicUrl(fileName)

        // Send PDF via Telegram
        await sendTelegramDocument(
          user.telegram_chat_id,
          publicUrl,
          `Expense-Report-${today}.pdf`
        )

        // Generate and send insights (using your existing function)
        const { insights, saved } = await generateInsights(user.user_id, supabaseAdmin)
        
        if (insights?.length) {
          const insightsMessage = '📊 *Daily Insights*\n\n' + insights.map(i => `• ${i}`).join('\n\n')
          await sendTelegramMessage(user.telegram_chat_id, insightsMessage)
        }

        results.push({ userId: user.user_id, status: 'success' })
        console.log(`✅ Success for user ${user.user_id}`)

      } catch (userError) {
        console.error(`❌ Error processing user ${user.user_id}:`, userError)
        results.push({ userId: user.user_id, status: 'error', error: userError.message })
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