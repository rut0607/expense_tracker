import TelegramBot from 'node-telegram-bot-api'

const token = process.env.TELEGRAM_BOT_TOKEN

if (!token) {
  console.error('⚠️ TELEGRAM_BOT_TOKEN is not set in environment variables')
}

// Initialize bot without polling (we'll use webhooks)
const bot = token ? new TelegramBot(token) : null

export async function sendTelegramMessage(chatId, message) {
  try {
    if (!bot) throw new Error('Telegram bot not initialized')
    if (!chatId) throw new Error('Chat ID is required')
    if (!message) throw new Error('Message is required')

    await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' })
    return { success: true }
  } catch (error) {
    console.error('❌ Telegram send error:', error)
    return { success: false, error: error.message }
  }
}

export async function sendTelegramDocument(chatId, pdfUrl, filename) {
  try {
    if (!bot) throw new Error('Telegram bot not initialized')
    if (!chatId) throw new Error('Chat ID is required')
    if (!pdfUrl) throw new Error('PDF URL is required')

    console.log('📎 Downloading PDF from:', pdfUrl)
    console.log('📎 Filename:', filename)
    
    // Download the PDF from the URL with timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

    const response = await fetch(pdfUrl, { 
      signal: controller.signal,
      headers: {
        'Accept': 'application/pdf',
      }
    })
    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`Failed to download PDF: ${response.status} ${response.statusText}`)
    }

    const buffer = await response.arrayBuffer()
    const nodeBuffer = Buffer.from(buffer)
    
    console.log('📎 PDF downloaded successfully!')
    console.log('📎 PDF size:', nodeBuffer.length, 'bytes')
    console.log('📎 Content type:', response.headers.get('content-type'))
    
    // Send with explicit content type
    await bot.sendDocument(chatId, nodeBuffer, {}, { 
      filename: filename,
      contentType: 'application/pdf'
    })
    
    console.log('✅ PDF sent successfully to Telegram')
    return { success: true }
  } catch (error) {
    console.error('❌ Telegram document error:', error)
    return { success: false, error: error.message }
  }
}

export async function sendTelegramPhoto(chatId, photoUrl, caption) {
  try {
    if (!bot) throw new Error('Telegram bot not initialized')
    if (!chatId) throw new Error('Chat ID is required')

    await bot.sendPhoto(chatId, photoUrl, { caption })
    return { success: true }
  } catch (error) {
    console.error('❌ Telegram photo error:', error)
    return { success: false, error: error.message }
  }
}

export function isBotInitialized() {
  return bot !== null
}