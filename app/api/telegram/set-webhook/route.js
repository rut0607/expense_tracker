import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN
    const webhookUrl = `${process.env.NEXTAUTH_URL}/api/telegram/webhook`
    
    console.log('🔧 Setting webhook to:', webhookUrl)
    
    const response = await fetch(
      `https://api.telegram.org/bot${token}/setWebhook?url=${webhookUrl}`
    )
    
    const data = await response.json()
    
    if (data.ok) {
      // Get webhook info to confirm
      const infoResponse = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`)
      const infoData = await infoResponse.json()
      
      return NextResponse.json({ 
        success: true, 
        description: data.description,
        webhookInfo: infoData.result
      })
    } else {
      return NextResponse.json({ 
        success: false, 
        error: data.description 
      }, { status: 400 })
    }
  } catch (error) {
    console.error('❌ Webhook setup error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 })
  }
}

// GET endpoint to check current webhook status
export async function GET() {
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN
    
    const response = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`)
    const data = await response.json()
    
    return NextResponse.json({ 
      success: true, 
      webhookInfo: data.result 
    })
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 })
  }
}