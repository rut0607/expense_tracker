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
    console.error('Telegram send error:', error)
    return { success: false, error: error.message }
  }
}

export async function sendTelegramDocument(chatId, pdfUrl, filename) {
  try {
    if (!bot) throw new Error('Telegram bot not initialized')
    if (!chatId) throw new Error('Chat ID is required')
    if (!pdfUrl) throw new Error('PDF URL is required')

    // Download the PDF from the URL with timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

    const response = await fetch(pdfUrl, { signal: controller.signal })
    clearTimeout(timeoutId)

    if (!response.ok) throw new Error(`Failed to download PDF: ${response.status}`)

    const buffer = await response.arrayBuffer()
    const nodeBuffer = Buffer.from(buffer)
    
    await bot.sendDocument(chatId, nodeBuffer, {}, { filename })
    return { success: true }
  } catch (error) {
    console.error('Telegram document error:', error)
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
    console.error('Telegram photo error:', error)
    return { success: false, error: error.message }
  }
}

export function isBotInitialized() {
  return bot !== null
}