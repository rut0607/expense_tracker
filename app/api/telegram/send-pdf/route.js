// app/api/telegram/send-pdf/route.js
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import { sendTelegramDocument } from '@/utils/telegram'
import { generatePDF } from '@/utils/pdfGenerator'
import { getTodayExpenses } from '@/utils/expenses'
import { supabase } from '@/utils/supabase'          // for user data queries
import { supabaseAdmin } from '@/utils/supabase-admin' // for storage (bypasses RLS)

export async function POST() {
  try {
    console.log('1️⃣ Starting send-pdf endpoint')
    const session = await getServerSession(authOptions)
    console.log('2️⃣ Session:', session?.user?.id)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    console.log('3️⃣ User ID:', userId)

    // Get user's Telegram chat ID
    const { data: prefs, error: prefsError } = await supabase
      .from('user_preferences')
      .select('telegram_chat_id')
      .eq('user_id', userId)
      .single()
    console.log('4️⃣ Telegram prefs:', prefs, 'Error:', prefsError)

    if (!prefs?.telegram_chat_id) {
      return NextResponse.json({ error: 'Telegram not linked' }, { status: 400 })
    }

    // Get today's expenses
    const { data: expenses, error: expError } = await getTodayExpenses(userId)
    console.log('5️⃣ Expenses count:', expenses?.length, 'Error:', expError)
    if (!expenses?.length) {
      return NextResponse.json({ error: 'No expenses today' }, { status: 400 })
    }

    // Get user's categories
    const { data: categories, error: catError } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', userId)
    console.log('6️⃣ Categories count:', categories?.length, 'Error:', catError)

    const today = new Date().toISOString().split('T')[0]
    console.log('7️⃣ Generating PDF for date:', today)

    // Generate PDF buffer
    const pdfBuffer = await generatePDF(expenses, categories, today)
    console.log('8️⃣ PDF buffer type:', typeof pdfBuffer)
    console.log('8a️⃣ Is Buffer?', Buffer.isBuffer(pdfBuffer))
    console.log('8b️⃣ Buffer length:', pdfBuffer?.length)

    if (!Buffer.isBuffer(pdfBuffer)) {
      throw new Error('generatePDF did not return a Buffer – check pdfGenerator.js')
    }

    // Upload to Supabase Storage using ADMIN client (bypasses RLS)
    console.log('9️⃣ Uploading to Supabase storage (using admin)...')
    const fileName = `expenses-${userId}-${today}.pdf`
    const { error: uploadError } = await supabaseAdmin.storage
      .from('pdf-reports')
      .upload(fileName, pdfBuffer, { 
        contentType: 'application/pdf', 
        upsert: true 
      })
    console.log('🔟 Upload error:', uploadError)

    if (uploadError) {
      throw new Error(`Supabase upload failed: ${uploadError.message}`)
    }

    // Get public URL (can use admin or regular client, result is the same)
    const { data: urlData } = supabaseAdmin.storage
      .from('pdf-reports')
      .getPublicUrl(fileName)
    console.log('1️⃣1️⃣ Public URL:', urlData.publicUrl)

    // Send via Telegram
    console.log('1️⃣2️⃣ Sending PDF via Telegram...')
    const result = await sendTelegramDocument(
      prefs.telegram_chat_id,
      urlData.publicUrl,
      `Expense-Report-${today}.pdf`
    )
    console.log('1️⃣3️⃣ Telegram send result:', result)

    if (result.success) {
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }
  } catch (error) {
    console.error('❌ Fatal error in send-pdf endpoint:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}