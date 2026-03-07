import { BANK_PATTERNS, GENERIC_PATTERNS, DATE_PATTERNS } from './regexPatterns';

// NEW: Detect transaction type (credit or debit)
function detectTransactionType(text, bank) {
  const textLower = text.toLowerCase();
  
  // Credit indicators (money coming in)
  if (textLower.includes('credited') || 
      textLower.includes('received') || 
      textLower.includes('deposit') ||
      textLower.includes('added to') ||
      textLower.includes('refund') ||
      textLower.includes('cashback') ||
      textLower.includes('interest')) {
    return 'credit';
  }
  
  // Debit indicators (money going out)
  if (textLower.includes('debited') || 
      textLower.includes('paid') || 
      textLower.includes('spent') ||
      textLower.includes('withdrawn') ||
      textLower.includes('purchase') ||
      textLower.includes('transaction') ||
      textLower.includes('payment')) {
    return 'debit';
  }
  
  // Check patterns in the full text
  if (/credited|received|deposit|refund|cashback/i.test(text)) return 'credit';
  if (/debited|paid|spent|purchase|withdrawn/i.test(text)) return 'debit';
  
  // Default to debit for most bank transactions
  return 'debit';
}

export function parseEmailWithRegex(emailData) {
  console.log('🔍 Regex parser called with:', {
    subject: emailData.subject?.substring(0, 50),
    from: emailData.from,
    bodyLength: emailData.body?.length
  });
  
  const { subject, body, from } = emailData;
  const fullText = `${subject} ${body}`;
  console.log('📝 Full text (first 200 chars):', fullText.substring(0, 200));
  
  // Detect bank from email address
  const detectedBank = detectBank(from);
  console.log('🏦 Detected bank:', detectedBank);
  
  // Extract amount
  const amount = extractAmount(fullText, detectedBank);
  console.log('💰 Extracted amount:', amount);
  
  if (!amount) {
    console.log('❌ No amount found, not a transaction');
    return { isTransaction: false };
  }
  
  // Extract merchant
  const merchant = extractMerchant(fullText, detectedBank);
  console.log('🏪 Extracted merchant:', merchant);
  
  // Extract date
  const date = extractDate(fullText);
  console.log('📅 Extracted date:', date);
  
  // NEW: Detect transaction type (credit/debit)
  const transactionType = detectTransactionType(fullText, detectedBank);
  console.log('💳 Transaction type:', transactionType);
  
  // Determine if split candidate (food delivery, group payments)
  const isSplitCandidate = detectSplitCandidate(fullText, merchant);
  console.log('🤝 Is split candidate:', isSplitCandidate);
  
  // Determine category
  const category = determineCategory(fullText, merchant, transactionType);
  console.log('📂 Category:', category);
  
  const confidence = calculateConfidence(amount, merchant, date, transactionType);
  console.log('📊 Confidence:', confidence);
  
  return {
    isTransaction: true,
    amount,
    merchant: merchant || 'Unknown',
    date: date || new Date().toISOString().split('T')[0],
    category,
    confidence,
    isSplitCandidate,
    transactionType, // ← NEW FIELD
    suggestedDescription: subject,
    bank: detectedBank
  };
}

function detectBank(from) {
  const fromLower = from.toLowerCase();
  
  if (fromLower.includes('axis') || fromLower.includes('axisbank')) return 'axis';
  if (fromLower.includes('hdfc') || fromLower.includes('hdfcbank')) return 'hdfc';
  if (fromLower.includes('icici') || fromLower.includes('icicibank')) return 'icici';
  if (fromLower.includes('sbi') || fromLower.includes('state bank')) return 'sbi';
  if (fromLower.includes('kotak') || fromLower.includes('kotakmahindra')) return 'kotak';
  if (fromLower.includes('yes') || fromLower.includes('yesbank')) return 'yes';
  if (fromLower.includes('zomato')) return 'zomato';
  if (fromLower.includes('swiggy')) return 'swiggy';
  if (fromLower.includes('amazon')) return 'amazon';
  if (fromLower.includes('flipkart')) return 'flipkart';
  if (fromLower.includes('phonepe')) return 'phonepe';
  if (fromLower.includes('google') || fromLower.includes('gpay')) return 'gpay';
  if (fromLower.includes('paytm')) return 'paytm';
  if (fromLower.includes('netflix')) return 'netflix';
  if (fromLower.includes('uber')) return 'uber';
  if (fromLower.includes('ola')) return 'ola';
  if (fromLower.includes('jio')) return 'jio';
  if (fromLower.includes('airtel')) return 'airtel';
  
  return 'unknown';
}

function extractAmount(text, bank) {
  // Try bank-specific patterns first
  if (bank !== 'unknown' && BANK_PATTERNS[bank]) {
    for (const pattern of BANK_PATTERNS[bank].patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const amount = parseFloat(match[1]);
        console.log(`✅ Amount matched using ${bank} pattern:`, pattern);
        return amount;
      }
    }
  }
  
  // Try generic patterns
  for (const pattern of GENERIC_PATTERNS) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const amount = parseFloat(match[1]);
      console.log(`✅ Amount matched using generic pattern:`, pattern);
      return amount;
    }
  }
  
  return null;
}

function extractMerchant(text, bank) {
  // Try bank-specific merchant extraction first
  if (bank !== 'unknown' && BANK_PATTERNS[bank]?.merchantExtract) {
    // Handle array of patterns
    const patterns = Array.isArray(BANK_PATTERNS[bank].merchantExtract) 
      ? BANK_PATTERNS[bank].merchantExtract 
      : [BANK_PATTERNS[bank].merchantExtract];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        console.log(`✅ Merchant matched using ${bank} pattern:`, pattern);
        return match[1].trim();
      }
    }
  }
  
  // Common merchant keywords
  const merchants = {
    'zomato': /zomato/i,
    'swiggy': /swiggy/i,
    'amazon': /amazon/i,
    'flipkart': /flipkart/i,
    'uber': /uber/i,
    'ola': /ola/i,
    'netflix': /netflix/i,
    'spotify': /spotify/i,
    'bigbasket': /bigbasket/i,
    'blinkit': /blinkit/i,
    'zepto': /zepto/i,
    'kisna': /kisna/i,
    'kanti': /kanti/i
  };
  
  for (const [name, pattern] of Object.entries(merchants)) {
    if (pattern.test(text)) {
      console.log(`✅ Merchant matched using keyword: ${name}`);
      return name.charAt(0).toUpperCase() + name.slice(1);
    }
  }
  
  return null;
}

function extractDate(text) {
  for (const pattern of DATE_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      console.log(`✅ Date matched using pattern:`, pattern);
      
      // Handle different date formats
      if (match.length === 4) {
        // DD/MM/YYYY or DD-MM-YYYY format
        const [_, day, month, year] = match;
        const fullYear = year.length === 2 ? `20${year}` : year;
        return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      } else if (match.length === 3) {
        // Handle month name formats or DD/MM/YY
        if (isNaN(match[1])) {
          // Month name format
          return new Date(match[0]).toISOString().split('T')[0];
        } else {
          // DD/MM/YY format
          const [_, day, month, year] = match;
          const fullYear = year.length === 2 ? `20${year}` : year;
          return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
      }
    }
  }
  return null;
}

function detectSplitCandidate(text, merchant) {
  const splitKeywords = [
    'zomato', 'swiggy', 'order', 'food', 'lunch', 'dinner',
    'group', 'party', 'split', 'shared', 'together', 'restaurant',
    'cafe', 'dining', 'meal'
  ];
  
  const textLower = text.toLowerCase();
  const isSplit = splitKeywords.some(keyword => textLower.includes(keyword)) ||
         ['Zomato', 'Swiggy'].includes(merchant);
  
  console.log('🤔 Split candidate check:', { isSplit, merchant });
  return isSplit;
}

// UPDATED: determineCategory now considers transaction type
function determineCategory(text, merchant, transactionType) {
  const textLower = text.toLowerCase();
  
  // If it's a credit (money received), categorize as Income
  if (transactionType === 'credit') {
    if (textLower.includes('salary') || textLower.includes('wage')) return 'Income';
    if (textLower.includes('refund') || textLower.includes('cashback')) return 'Refund';
    if (textLower.includes('interest')) return 'Interest';
    return 'Income';
  }
  
  // Debit transactions (expenses)
  if (merchant === 'Zomato' || merchant === 'Swiggy' || textLower.includes('food') || textLower.includes('restaurant') || textLower.includes('cafe')) {
    return 'Food';
  }
  if (merchant === 'Amazon' || merchant === 'Flipkart' || textLower.includes('shopping') || textLower.includes('order') || textLower.includes('purchase')) {
    return 'Shopping';
  }
  if (merchant === 'Uber' || merchant === 'Ola' || textLower.includes('cab') || textLower.includes('taxi') || textLower.includes('travel') || textLower.includes('ride')) {
    return 'Transport';
  }
  if (textLower.includes('bill') || textLower.includes('electricity') || textLower.includes('water') || textLower.includes('gas') || textLower.includes('recharge')) {
    return 'Bills';
  }
  if (textLower.includes('movie') || textLower.includes('netflix') || textLower.includes('spotify') || textLower.includes('prime')) {
    return 'Entertainment';
  }
  
  return 'Other';
}

// UPDATED: calculateConfidence now considers transaction type
function calculateConfidence(amount, merchant, date, transactionType) {
  let confidence = 0.5;
  
  if (amount) confidence += 0.2;
  if (merchant && merchant !== 'Unknown') confidence += 0.2;
  if (date) confidence += 0.1;
  if (transactionType) confidence += 0.1; // NEW: transaction type boosts confidence
  
  // Boost confidence if we have all three
  if (amount && merchant && merchant !== 'Unknown' && date) {
    confidence += 0.1;
  }
  
  return Math.min(confidence, 0.95);
}