// utils/insights.js
const GEMINI_API_KEY = process.env.GEMINI_API_KEY

/**
 * Generate budget insights for a user
 * @param {string} userId - The user's UUID
 * @param {object} supabaseClient - Supabase client (regular or admin) with proper permissions
 * @returns {Promise<{insights: string[], saved: number}>}
 */
export async function generateInsights(userId, supabaseClient) {
  console.log('🚀 [1] Starting insights generation for user:', userId)
  console.log('🔑 GEMINI_API_KEY exists:', !!GEMINI_API_KEY)
  
  try {
    const today = new Date()
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString()
    console.log('📅 [2] First day of month:', firstDayOfMonth)

    // Fetch expenses for current month with categories
    console.log('📊 [3] Fetching expenses...')
    const { data: expenses, error: expError } = await supabaseClient
      .from('expenses')
      .select('amount, categories(name)')
      .eq('user_id', userId)
      .gte('expense_date', firstDayOfMonth)

    if (expError) {
      console.error('❌ [3a] Expenses fetch failed:', expError)
      throw new Error(`Expenses fetch failed: ${expError.message}`)
    }
    console.log('✅ [3b] Expenses found:', expenses?.length)

    // Fetch budgets for current month
    console.log('💰 [4] Fetching budgets...')
    const { data: budgets, error: budError } = await supabaseClient
      .from('budgets')
      .select('monthly_limit, categories(name)')
      .eq('user_id', userId)
      .eq('month', firstDayOfMonth)

    if (budError) {
      console.error('❌ [4a] Budgets fetch failed:', budError)
      throw new Error(`Budgets fetch failed: ${budError.message}`)
    }
    console.log('✅ [4b] Budgets found:', budgets?.length)

    // Fetch monthly allowance from user_preferences
    console.log('💵 [5] Fetching allowance...')
    const { data: prefs, error: prefError } = await supabaseClient
      .from('user_preferences')
      .select('monthly_allowance')
      .eq('user_id', userId)
      .maybeSingle()

    if (prefError) {
      console.error('❌ [5a] Allowance fetch failed:', prefError)
      throw new Error(`Preferences fetch failed: ${prefError.message}`)
    }
    console.log('✅ [5b] Allowance found:', prefs?.monthly_allowance)

    // Calculate spending per category
    console.log('🧮 [6] Calculating spending per category...')
    const spendingMap = {}
    expenses?.forEach(e => {
      const cat = e.categories?.name || 'Other'
      spendingMap[cat] = (spendingMap[cat] || 0) + e.amount
    })
    console.log('📈 [6a] Spending map:', spendingMap)

    // Prepare data for LLM
    const budgetSummary = budgets?.map(b => ({
      category: b.categories.name,
      limit: b.monthly_limit,
      spent: spendingMap[b.categories.name] || 0
    })) || []
    console.log('📋 [7] Budget summary:', budgetSummary)

    const totalSpent = expenses?.reduce((sum, e) => sum + e.amount, 0) || 0
    const allowance = prefs?.monthly_allowance || 0
    const saved = allowance - totalSpent
    console.log('💰 [8] Totals - Spent:', totalSpent, 'Allowance:', allowance, 'Saved:', saved)

    // If no expenses at all, return early
    if (!expenses?.length) {
      console.log('⚠️ No expenses found for this month')
      return { 
        insights: ['No expenses recorded this month. Start adding expenses to get insights!'], 
        saved: 0 
      }
    }

    // Build prompt for Gemini
    const prompt = `
      You are a helpful financial assistant. A user has the following monthly budgets and spending:

      ${budgetSummary.map(b => `- ${b.category}: spent ₹${b.spent.toFixed(0)} out of ₹${b.limit.toFixed(0)} budget`).join('\n')}

      Total spent: ₹${totalSpent.toFixed(0)}
      Monthly allowance: ₹${allowance.toFixed(0)}
      Amount saved: ₹${saved.toFixed(0)}

      Based on this data, provide 2-3 short, friendly, and actionable insights. Include:
      - Which categories are close to or over budget (if any).
      - How much they've saved this month.
      - If savings > ₹1000, suggest a simple investment idea (e.g., index fund, fixed deposit, emergency fund). Keep it educational and encouraging.

      Format your response as a JSON array of strings, where each string is one insight. Do not include any other text or formatting outside the JSON array.
      Example: ["You've spent 80% of your dining budget. Great job saving ₹5000 this month!", "Consider putting your savings into an emergency fund."]
    `
    console.log('🤖 [9] Gemini prompt prepared, length:', prompt.length)

    // Call Gemini API with correct model name
    console.log('🌐 [10] Calling Gemini API...')
    console.log('   URL:', `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY ? '[KEY_EXISTS]' : '[MISSING]'}`)
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    })

    console.log('📡 [11] Gemini response status:', response.status)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ [11a] Gemini API error:', response.status, errorText)
      
      // Fallback insights if Gemini fails
      const fallbackInsights = [
        `You've spent ₹${totalSpent.toFixed(0)} this month.`,
        ...budgetSummary.map(b => `• ${b.category}: ₹${b.spent.toFixed(0)} / ₹${b.limit.toFixed(0)}`),
        saved > 0 ? `You saved ₹${saved.toFixed(0)} – great job!` : `Try to save more next month.`
      ]
      return { insights: fallbackInsights, saved }
    }

    const result = await response.json()
    console.log('✅ [12] Gemini response received')
    
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '[]'
    console.log('📝 [13] Raw Gemini text:', text.substring(0, 200))

    // Parse the JSON array from Gemini's response
    let insights = []
    try {
      insights = JSON.parse(text)
      console.log('✅ [14] Parsed insights:', insights)
    } catch (e) {
      console.log('⚠️ [14a] JSON parse failed, using fallback parsing')
      // Fallback: split by lines and clean
      insights = text.split('\n')
        .filter(l => l.trim().length > 0)
        .map(l => l.replace(/^[-*]\s*/, '').replace(/^["']|["']$/g, ''))
      
      if (insights.length === 0) {
        // Ultimate fallback
        insights = [
          `You've spent ₹${totalSpent.toFixed(0)} this month.`,
          ...budgetSummary.map(b => `• ${b.category}: ₹${b.spent.toFixed(0)} / ₹${b.limit.toFixed(0)}`),
          saved > 0 ? `You saved ₹${saved.toFixed(0)} – great job!` : `Try to save more next month.`
        ]
      }
      console.log('✅ [14b] Fallback insights:', insights)
    }

    return { insights, saved }
  } catch (error) {
    console.error('❌ [FATAL] Insights generation error:', error)
    return { 
      insights: ['Unable to generate insights at this time. Please try again later.'], 
      saved: 0 
    }
  }
}