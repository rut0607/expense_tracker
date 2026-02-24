import { google } from 'googleapis'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import { supabaseAdmin } from '@/utils/supabase-admin'
import { parseEmail } from '@/utils/emailParser'

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.NEXTAUTH_URL}/api/email/callback`
)

// Bank-specific email domains for precise filtering
const BANK_DOMAINS = {
  hdfc: ['hdfcbank.com', 'alerts.hdfcbank.com'],
  icici: ['icicibank.com', 'alerts.icicibank.com'],
  sbi: ['sbi.co.in', 'sbicard.com'],
  axis: ['axisbank.com', 'alerts.axisbank.com'],
  kotak: ['kotak.com', 'kotakmahindra.com'],
  yes: ['yesbank.in'],
  indusind: ['indusind.com'],
  pnb: ['pnb.co.in'],
  bob: ['bankofbaroda.com'],
  canara: ['canarabank.com'],
  phonepe: ['phonepe.com'],
  gpay: ['google.com'],
  paytm: ['paytm.com'],
  zomato: ['zomato.com'],
  swiggy: ['swiggy.com'],
  amazon: ['amazon.in', 'amazon.com'],
  flipkart: ['flipkart.com'],
  myntra: ['myntra.com'],
  ajio: ['ajio.com'],
  netflix: ['netflix.com'],
  spotify: ['spotify.com'],
  jio: ['jio.com'],
  airtel: ['airtel.in'],
  uber: ['uber.com'],
  ola: ['olacabs.com'],
  irctc: ['irctc.co.in'],
  makemytrip: ['makemytrip.com']
}

export async function POST(request) {
  try {
    console.log('📧 Email scan started')
    
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      console.log('❌ Unauthorized - no session')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.log('✅ User authenticated:', session.user.id)

    // Get user's Gmail refresh token and bank preferences
    console.log('🔍 Fetching user preferences...')
    const { data: userPrefs, error: prefError } = await supabaseAdmin
      .from('user_preferences')
      .select('gmail_refresh_token, gmail_last_sync, email_scan_enabled, selected_banks')
      .eq('user_id', session.user.id)
      .single()

    if (prefError) {
      console.error('❌ Error fetching preferences:', prefError)
    }

    if (!userPrefs?.gmail_refresh_token) {
      console.log('❌ No Gmail refresh token found')
      return NextResponse.json({ 
        success: false, 
        error: 'Gmail not connected' 
      }, { status: 400 })
    }

    if (!userPrefs.email_scan_enabled) {
      console.log('❌ Email scanning not enabled')
      return NextResponse.json({ 
        success: false, 
        error: 'Email scanning not enabled' 
      }, { status: 400 })
    }

    // Get selected banks (default to common ones if not set)
    const selectedBanks = userPrefs.selected_banks || ['hdfc', 'icici', 'sbi', 'axis', 'kotak', 'zomato', 'swiggy', 'amazon']
    console.log('✅ Selected banks:', selectedBanks)

    // Build bank-specific Gmail search query
    const bankQueries = selectedBanks
      .map(code => {
        const domains = BANK_DOMAINS[code]
        if (!domains) return null
        // Create from:domain OR from:domain2 query for each bank
        return domains.map(d => `from:${d}`).join(' OR ')
      })
      .filter(Boolean)
      .join(' OR ')

    // Add transaction-related subject keywords
    const transactionQuery = 'subject:(spent OR paid OR transaction OR upi OR debit OR credit OR "a/c" OR "account" OR "payment" OR "debited" OR "credited")'
    
    const query = `(${bankQueries}) AND (${transactionQuery}) newer_than:7d`
    
    console.log('🔍 Search query:', query)

    oauth2Client.setCredentials({
      refresh_token: userPrefs.gmail_refresh_token
    })

    // Refresh access token
    console.log('🔄 Refreshing access token...')
    const { credentials } = await oauth2Client.refreshAccessToken()
    console.log('✅ Access token refreshed')

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

    let messages
    try {
      const response = await gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults: 20
      })
      messages = response.data
      console.log(`📨 Found ${messages.messages?.length || 0} messages from selected banks`)
    } catch (gmailError) {
      console.error('❌ Gmail API error:', gmailError.message)
      return NextResponse.json({ 
        success: false,
        error: 'Gmail API error: ' + gmailError.message 
      }, { status: 500 })
    }

    const pendingTransactions = []

    for (const msg of messages.messages || []) {
      console.log(`📧 Processing message: ${msg.id}`)
      
      // Check if already processed
      const { data: existing } = await supabaseAdmin
        .from('pending_transactions')
        .select('id')
        .eq('email_id', msg.id)
        .single()

      if (existing) {
        console.log('⏭️ Already processed, skipping')
        continue
      }

      // Get full email content
      let email
      try {
        email = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id,
          format: 'full'
        })
      } catch (emailError) {
        console.error('❌ Error fetching email:', emailError.message)
        continue
      }

      // Extract email parts
      const headers = email.data.payload.headers
      const subject = headers.find(h => h.name === 'Subject')?.value || ''
      const from = headers.find(h => h.name === 'From')?.value || ''
      const date = headers.find(h => h.name === 'Date')?.value || ''
      
      // Get body
      let body = ''
      try {
        if (email.data.payload.parts) {
          const part = email.data.payload.parts.find(p => p.mimeType === 'text/plain')
          if (part?.body?.data) {
            body = Buffer.from(part.body.data, 'base64').toString()
          }
        } else if (email.data.payload.body?.data) {
          body = Buffer.from(email.data.payload.body.data, 'base64').toString()
        }
      } catch (bodyError) {
        console.error('❌ Error decoding email body:', bodyError.message)
      }

      console.log(`📨 Email subject: ${subject}`)

      // Parse with Gemini
      let parsed
      try {
        parsed = await parseEmail({ subject, from, body, date })
        console.log('🤖 Gemini parsed:', parsed)
      } catch (parseError) {
        console.error('❌ Gemini parse error:', parseError)
        continue
      }

      if (parsed.isTransaction) {
        console.log('✅ Transaction detected:', parsed.amount, parsed.merchant)
        
        // Store in pending transactions
        try {
          const { data: pending, error: insertError } = await supabaseAdmin
            .from('pending_transactions')
            .insert({
              user_id: session.user.id,
              email_id: msg.id,
              amount: parsed.amount || 0,
              merchant: parsed.merchant || 'Unknown',
              description: parsed.suggestedDescription || subject,
              date: parsed.date || new Date().toISOString().split('T')[0],
              category: parsed.category || 'Other',
              confidence: parsed.confidence || 0.5,
              is_split_candidate: parsed.isSplitCandidate || false,
              processed: false
            })
            .select()
            .single()

          if (insertError) {
            console.error('❌ Database insert error:', insertError)
          } else {
            pendingTransactions.push(pending)
            console.log('✅ Transaction saved to database with ID:', pending.id)
          }
        } catch (dbError) {
          console.error('❌ Database error:', dbError)
        }
      } else {
        console.log('⏭️ Not a transaction, skipping')
      }
    }

    // Update last sync time
    await supabaseAdmin
      .from('user_preferences')
      .update({ gmail_last_sync: new Date().toISOString() })
      .eq('user_id', session.user.id)

    console.log(`✅ Scan complete. Found ${pendingTransactions.length} new transactions`)
    
    return NextResponse.json({ 
      success: true, 
      scanned: messages.messages?.length || 0,
      found: pendingTransactions.length,
      transactions: pendingTransactions
    })

  } catch (error) {
    console.error('❌ Email scan error:', error)
    console.error('❌ Error stack:', error.stack)
    return NextResponse.json({ 
      success: false,
      error: error.message 
    }, { status: 500 })
  }
}