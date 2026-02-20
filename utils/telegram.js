import TelegramBot from 'node-telegram-bot-api'

const token = process.env.TELEGRAM_BOT_TOKEN

// Initialize bot without polling (we'll use webhooks)
const bot = new TelegramBot(token)

export async function sendTelegramMessage(chatId, message) {
  try {
    await bot.sendMessage(chatId, message)
    return { success: true }
  } catch (error) {
    console.error('Telegram send error:', error)
    return { success: false, error: error.message }
  }
}

export async function sendTelegramDocument(chatId, pdfUrl, filename) {
  try {
    // Download the PDF from the URL
    const response = await fetch(pdfUrl)
    const buffer = await response.arrayBuffer()
    const nodeBuffer = Buffer.from(buffer)
    
    await bot.sendDocument(chatId, nodeBuffer, {}, { filename })
    return { success: true }
  } catch (error) {
    console.error('Telegram document error:', error)
    return { success: false, error: error.message }
  }
}