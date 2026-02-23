// utils/insights.js
const GEMINI_API_KEY = process.env.GEMINI_API_KEY

/**
 * Get monthly spending by category
 */
async function getMonthlySpendingByCategory(userId, supabaseClient) {
  try {
    const today = new Date()
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString()
    
    const { data, error } = await supabaseClient
      .from('expenses')
      .select('amount, categories!inner(name, id)')
      .eq('user_id', userId)
      .gte('expense_date', firstDayOfMonth)

    if (error) throw error
    
    const spendingMap = {}
    const categoryDetails = {}
    
    data?.forEach(expense => {
      const catId = expense.categories?.id
      const catName = expense.categories?.name || 'Other'
      
      if (catId && !categoryDetails[catId]) {
        categoryDetails[catId] = { name: catName }
      }
      
      spendingMap[catId] = (spendingMap[catId] || 0) + (expense.amount || 0)
    })
    
    return { 
      success: true, 
      spending: spendingMap,
      categories: categoryDetails,
      total: Object.values(spendingMap).reduce((a, b) => a + b, 0)
    }
  } catch (error) {
    console.error('Error fetching monthly spending:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Generate budget insights for a user with investment recommendations
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
      .select('amount, categories(name, id)')
      .eq('user_id', userId)
      .gte('expense_date', firstDayOfMonth)

    if (expError) {
      console.error('❌ [3a] Expenses fetch failed:', expError)
      throw new Error(`Expenses fetch failed: ${expError.message}`)
    }
    console.log('✅ [3b] Expenses found:', expenses?.length)

    // Fetch budgets for current month with category details
    console.log('💰 [4] Fetching budgets...')
    const { data: budgets, error: budError } = await supabaseClient
      .from('budgets')
      .select('*, categories(name, icon, color)')
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
    const categoryMap = {} // Store category details
    
    expenses?.forEach(e => {
      const catId = e.categories?.id
      const catName = e.categories?.name || 'Other'
      if (catId) {
        categoryMap[catId] = { name: catName }
      }
      const cat = catName
      spendingMap[cat] = (spendingMap[cat] || 0) + (e.amount || 0)
    })
    console.log('📈 [6a] Spending map:', spendingMap)

    // Prepare budget summary with actual spending
    const budgetSummary = budgets?.map(b => {
      const categoryName = b.categories?.name || 'Unknown'
      const spent = spendingMap[categoryName] || 0
      return {
        category: categoryName,
        icon: b.categories?.icon || '📝',
        color: b.categories?.color || '#3B82F6',
        limit: b.monthly_limit,
        spent: spent,
        percentUsed: (spent / b.monthly_limit) * 100
      }
    }) || []
    
    console.log('📋 [7] Budget summary:', budgetSummary)

    // Calculate totals
    const totalSpent = expenses?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0
    const allowance = prefs?.monthly_allowance || 0
    const saved = allowance - totalSpent
    console.log('💰 [8] Totals - Spent:', totalSpent, 'Allowance:', allowance, 'Saved:', saved)

    // Generate budget alerts for categories near or over limit
    const budgetAlerts = []
    budgetSummary.forEach(b => {
      if (b.limit > 0) {
        if (b.percentUsed >= 100) {
          budgetAlerts.push(`🚨 *OVERSHOOT*: You've exceeded your ${b.icon} ${b.category} budget of ₹${b.limit}! Spent ₹${b.spent} (${Math.round(b.percentUsed)}%).`)
        } else if (b.percentUsed >= 80) {
          budgetAlerts.push(`⚠️ *Near Limit*: You've used ${Math.round(b.percentUsed)}% of your ${b.icon} ${b.category} budget (₹${b.spent} of ₹${b.limit}).`)
        }
      }
    })

    // If no expenses at all, return early
    if (!expenses?.length) {
      console.log('⚠️ No expenses found for this month')
      return { 
        insights: ['No expenses recorded this month. Start adding expenses to get insights!'], 
        saved: 0 
      }
    }

    // Build prompt for Gemini with investment focus
    const prompt = `
      You are a certified financial advisor specializing in the Indian market. Based on the user's financial data below, provide personalized investment advice:

      Current month spending breakdown:
      ${budgetSummary.map(b => `- ${b.icon} ${b.category}: spent ₹${b.spent.toFixed(0)} out of ₹${b.limit.toFixed(0)} budget (${Math.round(b.percentUsed)}%)`).join('\n')}

      Summary:
      - Total spent: ₹${totalSpent.toFixed(0)}
      - Monthly allowance: ₹${allowance.toFixed(0)}
      - Amount saved: ₹${saved.toFixed(0)}

      IMPORTANT: The user is saving ₹${saved.toFixed(0)} this month.

      Based on the savings amount, provide 2-3 specific investment recommendations suitable for the Indian market:

      ${saved < 1000 ? `
      - Focus on building an emergency fund first
      - Consider starting with a Recurring Deposit (RD) of ₹500/month
      - Look into liquid mutual funds for short-term parking
      ` : saved < 5000 ? `
      - Start a SIP in a large-cap index fund with ₹${Math.floor(saved/2)} monthly
      - Consider PPF for long-term tax-free returns (minimum ₹500)
      - Explore ELSS funds for tax saving under 80C
      ` : saved < 15000 ? `
      - Diversified portfolio: 40% in index funds, 30% in ELSS, 30% in debt funds
      - Consider Sovereign Gold Bonds (SGBs) for gold exposure
      - Look into hybrid mutual funds for balanced growth
      ` : `
      - Balanced portfolio: large-cap funds, mid-cap funds, and direct equities
      - Consider NPS for retirement with additional tax benefits
      - Explore real estate investment trusts (REITs) for diversification
      `}

      Also include:
      1. Risk assessment based on spending patterns
      2. Actionable steps to improve savings
      3. Emergency fund recommendations (3-6 months of expenses = ₹${(totalSpent * 3).toFixed(0)})

      Return ONLY a valid JSON array of 4-5 strings, each containing one insight or recommendation.
      Do not include markdown, explanations, or any text outside the JSON array.
      Be specific with fund names, percentages, and actionable advice.

      Example format:
      ["Start a monthly SIP of ₹2000 in SBI Bluechip Fund for long-term growth.", "Invest ₹3000 in PPF to build tax-free retirement corpus.", "Keep ₹15000 in liquid fund as emergency fund.", "Reduce dining out by 20% to save additional ₹1000/month."]
    `
    console.log('🤖 [9] Gemini prompt prepared, length:', prompt.length)

    // Using gemini-flash-latest (working model from your logs)
    const modelName = 'gemini-flash-latest'
    console.log(`🌐 [10] Calling Gemini API with ${modelName}...`)
    console.log(`   URL: https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY ? '[KEY_EXISTS]' : '[MISSING]'}`)
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`, {
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
      
      // Smart fallback with tiered recommendations
      const getFallbackInvestment = (saved) => {
        if (saved < 1000) return "Focus on building an emergency fund first. Consider a Recurring Deposit of ₹500/month."
        if (saved < 5000) return "Start a monthly SIP of ₹2000 in a large-cap index fund like UTI Nifty Index Fund."
        if (saved < 15000) return "Consider a diversified portfolio: ₹5000 in PPF, ₹5000 in ELSS, and ₹5000 in balanced advantage fund."
        return "Build a balanced portfolio: 40% in large-cap funds, 30% in mid-cap funds, 20% in debt funds, and 10% in SGBs."
      }

      const fallbackInsights = [
        ...budgetAlerts,
        `You've spent ₹${totalSpent.toFixed(0)} this month.`,
        ...budgetSummary.map(b => `• ${b.icon} ${b.category}: ₹${b.spent.toFixed(0)} / ₹${b.limit.toFixed(0)} (${Math.round(b.percentUsed)}%)`),
        `Investment suggestion: ${getFallbackInvestment(saved)}`,
        saved > 0 ? `You saved ₹${saved.toFixed(0)} – great job!` : `Try to save at least ₹${(totalSpent * 0.2).toFixed(0)} next month.`
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
      
      // Add budget alerts at the beginning if any
      if (budgetAlerts.length > 0) {
        insights = [...budgetAlerts, ...insights]
      }
      
    } catch (e) {
      console.log('⚠️ [14a] JSON parse failed, using fallback parsing')
      
      // Split and clean
      insights = text.split('\n')
        .filter(l => l.trim().length > 0)
        .map(l => l.replace(/^[-*]\s*/, '').replace(/^["']|["']$/g, ''))
      
      if (insights.length === 0) {
        // Ultimate fallback with tiered recommendations
        const getInvestmentAdvice = (saved) => {
          if (saved < 1000) return "Focus on building an emergency fund. Start with small savings in a liquid fund."
          if (saved < 5000) return "Start a monthly SIP of ₹1000 in an index fund. Open a PPF account for long-term tax-free returns."
          if (saved < 15000) return "Diversify: ₹5000 in ELSS (tax saving), ₹5000 in mid-cap fund, ₹5000 in debt fund."
          return "Consider a balanced portfolio: large-cap funds, direct stocks, and sovereign gold bonds for diversification."
        }

        insights = [
          ...budgetAlerts,
          `You've spent ₹${totalSpent.toFixed(0)} this month.`,
          ...budgetSummary.map(b => `• ${b.icon} ${b.category}: ₹${b.spent.toFixed(0)} / ₹${b.limit.toFixed(0)}`),
          `Investment suggestion: ${getInvestmentAdvice(saved)}`,
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