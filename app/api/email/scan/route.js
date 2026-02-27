import { google } from 'googleapis'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import { supabaseAdmin } from '@/utils/supabase-admin'
import { parseEmailWithRegex } from '@/utils/regexEmailParser'

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.NEXTAUTH_URL}/api/email/callback`
)

// Comprehensive bank domains for Indian users
const BANK_DOMAINS = {
  // Banks
  axis: ['axisbank.com', 'alerts.axisbank.com', 'axisbankalerts.com', 'axis.bank.in'],
  hdfc: ['hdfcbank.com', 'alerts.hdfcbank.com', 'hdfcbankalerts.com'],
  icici: ['icicibank.com', 'alerts.icicibank.com', 'icicibankalerts.com'],
  sbi: ['sbi.co.in', 'sbicard.com', 'sbi.com', 'statebankofindia.com'],
  kotak: ['kotak.com', 'kotakmahindra.com', 'kotakbank.com'],
  yes: ['yesbank.in', 'yesbank.com'],
  indusind: ['indusind.com', 'indusindbank.com'],
  pnb: ['pnb.co.in', 'pnbindia.in'],
  bob: ['bankofbaroda.com', 'bobindia.com'],
  canara: ['canarabank.com', 'canbank.com'],
  
  // Payment Apps (Enhanced Google Pay support)
  gpay: [
    'google.com',
    'pay.google.com',
    'payments.google.com',
    'noreply@google.com',
    'googlepay.com',
    'gpay.com',
    'tez.google.com',
    'androidpay.com'
  ],
  phonepe: ['phonepe.com', 'phonepe.in', 'phonepe-alerts.com'],
  paytm: ['paytm.com', 'paytm.in', 'paytm-alerts.com'],
  amazonpay: ['amazonpay.com', 'amazonpay.in'],
  
  // Food Delivery
  zomato: ['zomato.com', 'delivery.zomato.com', 'alerts.zomato.com'],
  swiggy: ['swiggy.com', 'delivery.swiggy.com', 'alerts.swiggy.com'],
  
  // Shopping
  amazon: ['amazon.in', 'amazon.com', 'payments.amazon.in'],
  flipkart: ['flipkart.com', 'pay.flipkart.com', 'alerts.flipkart.com'],
  myntra: ['myntra.com', 'pay.myntra.com'],
  ajio: ['ajio.com', 'pay.ajio.com'],
  
  // Entertainment
  netflix: ['netflix.com', 'account.netflix.com'],
  spotify: ['spotify.com', 'alerts.spotify.com'],
  hotstar: ['hotstar.com', 'disneyhotstar.com'],
  primevideo: ['primevideo.com', 'amazonprime.com'],
  
  // Telecom
  jio: ['jio.com', 'jio.in', 'pay.jio.com'],
  airtel: ['airtel.in', 'pay.airtel.com', 'airtelpayments.com'],
  vi: ['vi.com', 'vodafoneidea.com'],
  
  // Travel
  uber: ['uber.com', 'alerts.uber.com'],
  ola: ['olacabs.com', 'ola.com', 'pay.ola.com'],
  irctc: ['irctc.co.in', 'irctc.com'],
  makemytrip: ['makemytrip.com', 'pay.makemytrip.com']
}

export async function POST(request) {
  try {
    console.log('📧 Email scan started')
    
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user preferences
    const { data: userPrefs, error: prefError } = await supabaseAdmin
      .from('user_preferences')
      .select('gmail_refresh_token, gmail_last_sync, email_scan_enabled, selected_banks')
      .eq('user_id', session.user.id)
      .single()

    if (prefError || !userPrefs?.gmail_refresh_token) {
      return NextResponse.json({ 
        success: false, 
        error: 'Gmail not connected' 
      }, { status: 400 })
    }

    if (!userPrefs.email_scan_enabled) {
      return NextResponse.json({ 
        success: false, 
        error: 'Email scanning not enabled' 
      }, { status: 400 })
    }

    // Default selected banks if none set
    const selectedBanks = userPrefs.selected_banks || [
      'axis', 'hdfc', 'icici', 'sbi', 'kotak', 
      'gpay', 'phonepe', 'paytm', 'zomato', 'swiggy', 
      'amazon', 'flipkart', 'netflix', 'jio'
    ]
    
    console.log('🏦 Selected banks:', selectedBanks)

    // SIMPLIFIED: Just look for emails from selected banks, no subject filters
    const bankDomains = selectedBanks
      .map(code => BANK_DOMAINS[code])
      .flat()
      .filter(Boolean)
      .map(domain => `from:${domain}`)
      .join(' OR ')

    // Simple query - just bank domains + date range
    const query = bankDomains ? `(${bankDomains}) newer_than:1d` : 'newer_than:1d'
    
    console.log('🔍 Search query:', query)

    oauth2Client.setCredentials({ refresh_token: userPrefs.gmail_refresh_token })
    await oauth2Client.refreshAccessToken()
    
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client })
    
    const messages = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults: 50,
      includeSpamTrash: true
    })

    console.log(`📨 Found ${messages.data.messages?.length || 0} messages`)
    
    const pendingTransactions = []

    for (const msg of messages.data.messages || []) {
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

      // Get full email
      const email = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id,
        format: 'full'
      })

      // Extract email parts
      const headers = email.data.payload.headers
      const subject = headers.find(h => h.name === 'Subject')?.value || ''
      const from = headers.find(h => h.name === 'From')?.value || ''
      const date = headers.find(h => h.name === 'Date')?.value || ''
      
      // Get body (handle multipart emails)
      let body = ''
      try {
        if (email.data.payload.parts) {
          // Look for text/plain part
          const textPart = email.data.payload.parts.find(p => p.mimeType === 'text/plain')
          if (textPart?.body?.data) {
            body = Buffer.from(textPart.body.data, 'base64').toString()
          } else {
            // Try to find any text part
            const anyTextPart = email.data.payload.parts.find(p => p.mimeType?.includes('text'))
            if (anyTextPart?.body?.data) {
              body = Buffer.from(anyTextPart.body.data, 'base64').toString()
            }
          }
        } else if (email.data.payload.body?.data) {
          body = Buffer.from(email.data.payload.body.data, 'base64').toString()
        }
      } catch (bodyError) {
        console.error('❌ Error decoding email body:', bodyError.message)
        // Continue with empty body, regex might still work with subject
      }

      console.log(`📨 Email subject: ${subject}`)
      console.log(`📨 From: ${from}`)

      // Parse with regex
      const parsed = parseEmailWithRegex({ subject, from, body })

      if (parsed.isTransaction) {
        console.log('✅ Transaction detected:', {
          amount: parsed.amount,
          merchant: parsed.merchant,
          confidence: parsed.confidence
        })
        
        // Store in pending transactions
        const { data: pending, error: insertError } = await supabaseAdmin
          .from('pending_transactions')
          .insert({
            user_id: session.user.id,
            email_id: msg.id,
            amount: parsed.amount,
            merchant: parsed.merchant || 'Unknown',
            description: parsed.suggestedDescription || subject,
            date: parsed.date || new Date().toISOString().split('T')[0],
            category: parsed.category || 'Other',
            confidence: parsed.confidence || 0.7,
            is_split_candidate: parsed.isSplitCandidate || false,
            processed: false
          })
          .select()
          .single()

        if (!insertError) {
          pendingTransactions.push(pending)
          console.log('✅ Transaction saved to database')
        } else {
          console.error('❌ Database insert error:', insertError)
        }
      } else {
        console.log('⏭️ Not a transaction email, skipping')
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
      scanned: messages.data.messages?.length || 0,
      found: pendingTransactions.length,
      transactions: pendingTransactions
    })

  } catch (error) {
    console.error('❌ Email scan error:', error)
    return NextResponse.json({ 
      success: false,
      error: error.message 
    }, { status: 500 })
  }
}