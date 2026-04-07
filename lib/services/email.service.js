import { google } from 'googleapis'
import { supabaseAdmin } from '@/utils/supabase-admin'
import { parseEmailWithRegex } from '@/utils/regexEmailParser'

// Bank domains for search queries
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
  
  // Payment Apps
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

export class EmailService {
  constructor(userId) {
    this.userId = userId
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXTAUTH_URL}/api/email/callback`
    )
  }

  async getUserGmailToken() {
    const { data: prefs, error } = await supabaseAdmin
      .from('user_preferences')
      .select('gmail_refresh_token, selected_banks, email_scan_enabled')
      .eq('user_id', this.userId)
      .single()

    if (error) {
      throw new Error('Error fetching user preferences')
    }

    if (!prefs?.gmail_refresh_token) {
      throw new Error('Gmail not connected')
    }

    if (!prefs.email_scan_enabled) {
      throw new Error('Email scanning not enabled')
    }

    return prefs
  }

  async refreshAccessToken(refreshToken) {
    try {
      this.oauth2Client.setCredentials({ refresh_token: refreshToken })
      const { credentials } = await this.oauth2Client.refreshAccessToken()
      
      // Update token in database if a new refresh token was issued
      if (credentials.refresh_token && credentials.refresh_token !== refreshToken) {
        await supabaseAdmin
          .from('user_preferences')
          .update({ 
            gmail_refresh_token: credentials.refresh_token,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', this.userId)
      }
      
      return credentials
    } catch (error) {
      if (error.message?.includes('invalid_grant')) {
        // Token is invalid, clear it
        await supabaseAdmin
          .from('user_preferences')
          .update({ 
            gmail_refresh_token: null, 
            email_scan_enabled: false,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', this.userId)
        
        throw new Error('Gmail token expired. Please reconnect.')
      }
      throw error
    }
  }

  buildSearchQuery(selectedBanks) {
    // Default selected banks if none set
    const banks = selectedBanks || [
      'axis', 'hdfc', 'icici', 'sbi', 'kotak', 
      'gpay', 'phonepe', 'paytm', 'zomato', 'swiggy', 
      'amazon', 'flipkart', 'netflix', 'jio'
    ]
    
    // Build search query for emails from selected banks
    const bankDomains = banks
      .map(code => BANK_DOMAINS[code])
      .flat()
      .filter(Boolean)
      .map(domain => `from:${domain}`)
      .join(' OR ')

    return bankDomains ? `(${bankDomains}) newer_than:1d` : 'newer_than:1d'
  }

  async scanEmails() {
    try {
      const prefs = await this.getUserGmailToken()
      const credentials = await this.refreshAccessToken(prefs.gmail_refresh_token)
      
      this.oauth2Client.setCredentials(credentials)
      const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client })

      // Build search query from selected banks
      const query = this.buildSearchQuery(prefs.selected_banks)
      
      console.log('🔍 Search query:', query)

      const messages = await gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults: 50,
        includeSpamTrash: true
      })

      console.log(`📨 Found ${messages.data.messages?.length || 0} messages`)

      const transactions = await this.processMessages(gmail, messages.data.messages || [])

      // Update last sync time
      await supabaseAdmin
        .from('user_preferences')
        .update({ 
          gmail_last_sync: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', this.userId)

      return {
        scanned: messages.data.messages?.length || 0,
        found: transactions.length,
        transactions
      }
    } catch (error) {
      console.error('Email scan error:', error)
      throw error
    }
  }

  async processMessages(gmail, messages) {
    const transactions = []
    
    for (const msg of messages) {
      try {
        console.log(`📧 Processing message: ${msg.id}`)
        
        // Check if already processed
        const { data: existing } = await supabaseAdmin
          .from('pending_transactions')
          .select('id')
          .eq('email_id', msg.id)
          .maybeSingle()

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

        // Parse email
        const parsed = this.parseEmail(email.data)

        if (parsed.isTransaction) {
          console.log('✅ Transaction detected:', {
            amount: parsed.amount,
            merchant: parsed.merchant,
            confidence: parsed.confidence,
            type: parsed.transactionType || 'debit'
          })
          
          // Store in pending transactions
          const { data: pending, error: insertError } = await supabaseAdmin
            .from('pending_transactions')
            .insert({
              user_id: this.userId,
              email_id: msg.id,
              amount: parsed.amount,
              merchant: parsed.merchant || 'Unknown',
              description: parsed.suggestedDescription || parsed.subject,
              date: parsed.date || new Date().toISOString().split('T')[0],
              category: parsed.category || 'Other',
              transaction_type: parsed.transactionType || 'debit',
              confidence: parsed.confidence || 0.7,
              is_split_candidate: parsed.isSplitCandidate || false,
              processed: false,
              created_at: new Date().toISOString()
            })
            .select()
            .single()

          if (!insertError) {
            transactions.push(pending)
            console.log('✅ Transaction saved to database')
          } else {
            console.error('❌ Database insert error:', insertError)
          }
        } else {
          console.log('⏭️ Not a transaction email, skipping')
        }
      } catch (error) {
        console.error('❌ Error processing message:', error.message)
        // Continue with next message
      }
    }
    
    return transactions
  }

  parseEmail(emailData) {
    // Extract headers
    const headers = emailData.payload.headers
    const subject = headers.find(h => h.name === 'Subject')?.value || ''
    const from = headers.find(h => h.name === 'From')?.value || ''
    
    // Extract body
    let body = ''
    try {
      if (emailData.payload.parts) {
        // Look for text/plain part
        const textPart = emailData.payload.parts.find(p => p.mimeType === 'text/plain')
        if (textPart?.body?.data) {
          body = Buffer.from(textPart.body.data, 'base64').toString()
        } else {
          // Try to find any text part
          const anyTextPart = emailData.payload.parts.find(p => p.mimeType?.includes('text'))
          if (anyTextPart?.body?.data) {
            body = Buffer.from(anyTextPart.body.data, 'base64').toString()
          }
        }
      } else if (emailData.payload.body?.data) {
        body = Buffer.from(emailData.payload.body.data, 'base64').toString()
      }
    } catch (error) {
      console.error('❌ Error decoding email body:', error.message)
    }

    // Parse with regex
    return parseEmailWithRegex({ subject, from, body })
  }

  async confirmTransaction(id, categoryId, description) {
    try {
      // Get pending transaction
      const { data: pending, error: fetchError } = await supabaseAdmin
        .from('pending_transactions')
        .select('*')
        .eq('id', id)
        .eq('user_id', this.userId)
        .single()

      if (fetchError || !pending) {
        throw new Error('Transaction not found')
      }

      // Create expense
      const { data: expense, error: expenseError } = await supabaseAdmin
        .from('expenses')
        .insert({
          user_id: this.userId,
          category_id: categoryId,
          amount: pending.amount,
          description: description || pending.description,
          expense_date: pending.date,
          fields: { 
            merchant: pending.merchant,
            transaction_type: pending.transaction_type
          }
        })
        .select()
        .single()

      if (expenseError) {
        throw new Error(expenseError.message)
      }

      // Mark as processed
      await supabaseAdmin
        .from('pending_transactions')
        .update({ processed: true })
        .eq('id', id)

      return expense
    } catch (error) {
      console.error('Confirm transaction error:', error)
      throw error
    }
  }

  async ignoreTransaction(id) {
    try {
      const { error } = await supabaseAdmin
        .from('pending_transactions')
        .delete()
        .eq('id', id)
        .eq('user_id', this.userId)

      if (error) {
        throw new Error(error.message)
      }

      return { success: true }
    } catch (error) {
      console.error('Ignore transaction error:', error)
      throw error
    }
  }

  async getPendingTransactions() {
    try {
      const { data, error } = await supabaseAdmin
        .from('pending_transactions')
        .select('*')
        .eq('user_id', this.userId)
        .eq('processed', false)
        .order('created_at', { ascending: false })

      if (error) {
        throw new Error(error.message)
      }

      return data || []
    } catch (error) {
      console.error('Get pending transactions error:', error)
      throw error
    }
  }
}