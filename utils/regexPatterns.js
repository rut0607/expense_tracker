// utils/regexPatterns.js
export const BANK_PATTERNS = {
  // Axis Bank - Enhanced patterns
  axis: {
    patterns: [
      // Original patterns
      /INR\s*(\d+\.?\d*)\s*(?:debited|credited|spent)/i,
      /(?:debited|credited|spent)\s*(?:by|of)\s*INR\s*(\d+\.?\d*)/i,
      
      // NEW: Specifically for your Axis email format
      /Amount Debited:\s*INR\s*(\d+\.?\d*)/i,
      /INR\s*(\d+\.?\d*)\s*was\s*debited/i,
      /(?:Rs|INR|₹)\s*(\d+\.?\d*)\s*(?:debited|credited)\s*(?:from|to)\s*your\s*A\/c/i,
      
      // Amount in summary section
      /(?:amount|amt|value)\s*(?:of|:)?\s*(?:Rs|INR|₹)\s*(\d+\.?\d*)/i,
      
      // Generic amount patterns for Axis
      /(?:Rs|INR|₹)\s*(\d+\.?\d*)/i
    ],
    merchantExtract: [
      // Original
      /(?:at|to)\s+([A-Za-z\s]+?)(?:\s+on|\s+at|\s+ref|\s*$)/i,
      
      // NEW: Extract from UPI transaction info
      /UPI\/[A-Z0-9]+\/([A-Za-z\s]+)/i,
      /Transaction Info:.*?UPI.*?\/([A-Za-z\s]+)/i,
      /Transaction Info:.*?([A-Za-z\s]+)(?:\s*$)/i,
      
      // Extract from the UPI string
      /\/([A-Z\s]+)$/i
    ]
  },
  
  // HDFC Bank
  hdfc: {
    patterns: [
      /(?:Rs|INR|₹)\s*(\d+\.?\d*)\s*(?:debited|credited)/i,
      /(?:A\/C|account)\s*(?:debited|credited)\s*(?:by|with)\s*(?:Rs|INR|₹)\s*(\d+\.?\d*)/i,
      /Amount Debited:\s*INR\s*(\d+\.?\d*)/i
    ],
    merchantExtract: /(?:at|to)\s+([A-Za-z\s]+?)(?:\s+on|\s+at|\s+ref|\s*$)/i
  },
  
  // ICICI Bank
  icici: {
    patterns: [
      /(?:Rs|INR|₹)\s*(\d+\.?\d*)\s*(?:debited|credited)/i,
      /(?:transaction|payment)\s*(?:of|for)\s*(?:Rs|INR|₹)\s*(\d+\.?\d*)/i,
      /Amount Debited:\s*INR\s*(\d+\.?\d*)/i
    ],
    merchantExtract: /(?:to|at)\s+([A-Za-z\s]+?)(?:\s+on|\s+at|\s+ref|\s*$)/i
  },
  
  // SBI
  sbi: {
    patterns: [
      /(?:Rs|INR|₹)\s*(\d+\.?\d*)\s*(?:debited|credited)/i,
      /(?:A\/C|account)\s*(?:debited|credited)\s*(?:by|with)\s*(?:Rs|INR|₹)\s*(\d+\.?\d*)/i,
      /Amount Debited:\s*INR\s*(\d+\.?\d*)/i
    ],
    merchantExtract: /(?:to|at)\s+([A-Za-z\s]+?)(?:\s+on|\s+at|\s+ref|\s*$)/i
  },
  
  // Kotak Bank
  kotak: {
    patterns: [
      /(?:Rs|INR|₹)\s*(\d+\.?\d*)\s*(?:debited|credited)/i,
      /(?:transaction|payment)\s*(?:of|for)\s*(?:Rs|INR|₹)\s*(\d+\.?\d*)/i,
      /Amount Debited:\s*INR\s*(\d+\.?\d*)/i
    ],
    merchantExtract: /(?:to|at)\s+([A-Za-z\s]+?)(?:\s+on|\s+at|\s+ref|\s*$)/i
  },
  
  // Yes Bank
  yes: {
    patterns: [
      /(?:Rs|INR|₹)\s*(\d+\.?\d*)\s*(?:debited|credited)/i,
      /(?:transaction|payment)\s*(?:of|for)\s*(?:Rs|INR|₹)\s*(\d+\.?\d*)/i,
      /Amount Debited:\s*INR\s*(\d+\.?\d*)/i
    ],
    merchantExtract: /(?:to|at)\s+([A-Za-z\s]+?)(?:\s+on|\s+at|\s+ref|\s*$)/i
  },
  
  // UPI / Payment Apps
  upi: {
    patterns: [
      /(?:Rs|INR|₹)\s*(\d+\.?\d*)\s*(?:paid|sent|received)/i,
      /(?:payment|transfer)\s*(?:of|for)\s*(?:Rs|INR|₹)\s*(\d+\.?\d*)/i,
      /Amount Debited:\s*INR\s*(\d+\.?\d*)/i
    ],
    merchantExtract: /(?:to|from)\s+([A-Za-z\s]+?)(?:\s+on|\s+at|\s+ref|\s*$)/i
  },
  
  // Zomato
  zomato: {
    patterns: [
      /(?:Rs|INR|₹)\s*(\d+\.?\d*)\s*(?:paid|order|total)/i,
      /order\s*(?:total|amount)\s*(?:Rs|INR|₹)\s*(\d+\.?\d*)/i
    ],
    merchantExtract: /Zomato/i
  },
  
  // Swiggy
  swiggy: {
    patterns: [
      /(?:Rs|INR|₹)\s*(\d+\.?\d*)\s*(?:paid|order|total)/i,
      /order\s*(?:total|amount)\s*(?:Rs|INR|₹)\s*(\d+\.?\d*)/i
    ],
    merchantExtract: /Swiggy/i
  },
  
  // Amazon
  amazon: {
    patterns: [
      /(?:Rs|INR|₹)\s*(\d+\.?\d*)\s*(?:paid|order|total)/i,
      /order\s*(?:total|amount)\s*(?:Rs|INR|₹)\s*(\d+\.?\d*)/i,
      /Amount Debited:\s*INR\s*(\d+\.?\d*)/i
    ],
    merchantExtract: /Amazon/i
  },
  
  // Flipkart
  flipkart: {
    patterns: [
      /(?:Rs|INR|₹)\s*(\d+\.?\d*)\s*(?:paid|order|total)/i,
      /order\s*(?:total|amount)\s*(?:Rs|INR|₹)\s*(\d+\.?\d*)/i
    ],
    merchantExtract: /Flipkart/i
  },
  
  // PhonePe
  phonepe: {
    patterns: [
      /(?:Rs|INR|₹)\s*(\d+\.?\d*)\s*(?:paid|received)/i,
      /(?:payment|transfer)\s*(?:of|for)\s*(?:Rs|INR|₹)\s*(\d+\.?\d*)/i
    ],
    merchantExtract: /(?:to|from)\s+([A-Za-z\s]+?)(?:\s+on|\s+at|\s*$)/i
  },
  
  // Google Pay
  gpay: {
    patterns: [
      /(?:Rs|INR|₹)\s*(\d+\.?\d*)\s*(?:paid|received)/i,
      /(?:payment|transfer)\s*(?:of|for)\s*(?:Rs|INR|₹)\s*(\d+\.?\d*)/i,
      /Amount Debited:\s*INR\s*(\d+\.?\d*)/i
    ],
    merchantExtract: /(?:to|from)\s+([A-Za-z\s]+?)(?:\s+on|\s+at|\s*$)/i
  },
  
  // Paytm
  paytm: {
    patterns: [
      /(?:Rs|INR|₹)\s*(\d+\.?\d*)\s*(?:paid|received)/i,
      /(?:payment|transfer)\s*(?:of|for)\s*(?:Rs|INR|₹)\s*(\d+\.?\d*)/i
    ],
    merchantExtract: /(?:to|from)\s+([A-Za-z\s]+?)(?:\s+on|\s+at|\s*$)/i
  }
};

// Generic patterns for unknown banks
export const GENERIC_PATTERNS = [
  /(?:Rs|INR|₹)\s*(\d+\.?\d*)/i,
  /(?:amount|total|paid|spent|debited|credited)\s*(?:Rs|INR|₹)?\s*(\d+\.?\d*)/i,
  /(?:of|for)\s*(?:Rs|INR|₹)\s*(\d+\.?\d*)/i,
  /Amount Debited:\s*INR\s*(\d+\.?\d*)/i,
  /INR\s*(\d+\.?\d*)\s*was\s*(?:debited|credited)/i
];

// Date patterns (Indian format)
export const DATE_PATTERNS = [
  /(\d{1,2})[-\/](\d{1,2})[-\/](\d{2,4})/, // DD/MM/YYYY or DD-MM-YYYY
  /(\d{2})[-\/](\d{2})[-\/](\d{2})/, // DD/MM/YY format
  /(\d{1,2})\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{2,4})/i, // 24 Mar 2026
  /(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2}),?\s+(\d{2,4})/i, // Mar 24, 2026
  /Date[:\s]+(\d{1,2})[-\/](\d{1,2})[-\/](\d{2,4})/i, // Date: 28-02-2026
  /(\d{1,2})-(\d{1,2})-(\d{2,4})/ // Simple DD-MM-YYYY
];