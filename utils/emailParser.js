import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

const BANK_PATTERNS = {
  hdfc: ['HDFC Bank', 'HDFC', 'Your A/C'],
  icici: ['ICICI Bank', 'ICICI', 'ICICI Bank Alert'],
  sbi: ['State Bank', 'SBI', 'SBI Alert'],
  axis: ['Axis Bank', 'Axis'],
  kotak: ['Kotak', 'Kotak Mahindra'],
  zomato: ['Zomato', 'Zomato order'],
  swiggy: ['Swiggy', 'Swiggy order'],
  amazon: ['Amazon Pay', 'Amazon.in'],
  flipkart: ['Flipkart', 'Flipkart order']
}

export async function parseEmail(emailData) {
  const { subject, from, body, date } = emailData
  
  const prompt = `
    You are an AI that extracts transaction details from bank and payment emails in India.
    
    Email Details:
    From: ${from}
    Subject: ${subject}
    Body: ${body}
    Date: ${date}
    
    Analyze and return ONLY a valid JSON object with:
    {
      "isTransaction": boolean (true if this is a transaction/spending email),
      "amount": number (the transaction amount in rupees),
      "merchant": string (where the money was spent, e.g., Zomato, Swiggy, Amazon),
      "date": "YYYY-MM-DD" (transaction date),
      "category": string (one of: Food, Shopping, Transport, Bills, Entertainment, Other),
      "confidence": number (0-1, how confident you are),
      "isSplitCandidate": boolean (true if this could be a group expense like food order, group payment),
      "suggestedDescription": string (brief description),
      "bank": string (which bank/service sent this)
    }
    
    If not a transaction, return { "isTransaction": false }
    
    Be precise. Extract exact amounts and dates. Do not include any other text or markdown.
  `

  // FIXED: Using the correct model name that works
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" })
  
  try {
    const result = await model.generateContent(prompt)
    const response = result.response.text()
    
    // Clean the response (remove any markdown formatting)
    const cleanedResponse = response.replace(/```json|```/g, '').trim()
    
    const parsed = JSON.parse(cleanedResponse)
    console.log('✅ Gemini parsed successfully:', parsed)
    
    return {
      ...parsed,
      originalEmail: { subject, from, date },
      detectedPattern: Object.keys(BANK_PATTERNS).find(key => 
        subject?.toLowerCase().includes(key) || body?.toLowerCase().includes(key)
      )
    }
  } catch (error) {
    console.error('❌ Failed to parse email with Gemini:', error)
    // Return a default response instead of failing
    return { 
      isTransaction: false, 
      error: 'Parse failed',
      originalEmail: { subject, from, date }
    }
  }
}

export function extractMerchantFromEmail(emailData) {
  const { subject, from, body } = emailData
  
  // Common merchants in India
  const merchants = {
    zomato: ['zomato', 'order with zomato'],
    swiggy: ['swiggy', 'order with swiggy'],
    amazon: ['amazon', 'amazon pay', 'amazon.in'],
    flipkart: ['flipkart', 'flipkart order'],
    bigbasket: ['bigbasket', 'bb daily'],
    blinkit: ['blinkit', 'blinkit order'],
    zepto: ['zepto', 'zepto order'],
    netflix: ['netflix'],
    spotify: ['spotify'],
    jio: ['jio', 'jio fiber', 'jio postpaid'],
    airtel: ['airtel', 'airtel payments'],
    uber: ['uber', 'uber india'],
    ola: ['ola', 'ola money']
  }

  for (const [merchant, keywords] of Object.entries(merchants)) {
    for (const keyword of keywords) {
      if (subject?.toLowerCase().includes(keyword) || body?.toLowerCase().includes(keyword)) {
        return merchant
      }
    }
  }
  
  return 'unknown'
}