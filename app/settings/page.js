'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { EnvelopeIcon, CheckCircleIcon, BanknotesIcon } from '@heroicons/react/24/outline'

// Bank options for Indian users
const BANK_OPTIONS = [
  // Banks
  { code: 'hdfc', name: 'HDFC Bank', category: 'bank' },
  { code: 'icici', name: 'ICICI Bank', category: 'bank' },
  { code: 'sbi', name: 'State Bank of India', category: 'bank' },
  { code: 'axis', name: 'Axis Bank', category: 'bank' },
  { code: 'kotak', name: 'Kotak Mahindra', category: 'bank' },
  { code: 'yes', name: 'Yes Bank', category: 'bank' },
  { code: 'indusind', name: 'IndusInd Bank', category: 'bank' },
  { code: 'pnb', name: 'Punjab National Bank', category: 'bank' },
  { code: 'bob', name: 'Bank of Baroda', category: 'bank' },
  { code: 'canara', name: 'Canara Bank', category: 'bank' },
  
  // Payment Apps
  { code: 'phonepe', name: 'PhonePe', category: 'payment' },
  { code: 'gpay', name: 'Google Pay', category: 'payment' },
  { code: 'paytm', name: 'Paytm', category: 'payment' },
  
  // Food Delivery
  { code: 'zomato', name: 'Zomato', category: 'food' },
  { code: 'swiggy', name: 'Swiggy', category: 'food' },
  
  // Shopping
  { code: 'amazon', name: 'Amazon', category: 'shopping' },
  { code: 'flipkart', name: 'Flipkart', category: 'shopping' },
  { code: 'myntra', name: 'Myntra', category: 'shopping' },
  
  // Entertainment
  { code: 'netflix', name: 'Netflix', category: 'entertainment' },
  { code: 'spotify', name: 'Spotify', category: 'entertainment' },
  
  // Telecom
  { code: 'jio', name: 'Jio', category: 'telecom' },
  { code: 'airtel', name: 'Airtel', category: 'telecom' },
  
  // Travel
  { code: 'uber', name: 'Uber', category: 'travel' },
  { code: 'ola', name: 'Ola', category: 'travel' },
]

// Group banks by category
const groupedBanks = {
  banks: BANK_OPTIONS.filter(b => b.category === 'bank'),
  payment: BANK_OPTIONS.filter(b => b.category === 'payment'),
  food: BANK_OPTIONS.filter(b => b.category === 'food'),
  shopping: BANK_OPTIONS.filter(b => b.category === 'shopping'),
  entertainment: BANK_OPTIONS.filter(b => b.category === 'entertainment'),
  telecom: BANK_OPTIONS.filter(b => b.category === 'telecom'),
  travel: BANK_OPTIONS.filter(b => b.category === 'travel'),
}

export default function SettingsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [gmailConnected, setGmailConnected] = useState(false)
  const [gmailLoading, setGmailLoading] = useState(false)
  const [selectedBanks, setSelectedBanks] = useState([])
  const [settings, setSettings] = useState({
    name: '',
    email: '',
    monthly_allowance: '',
    monthly_budget_total: '',
    reminder_time: '21:00',
    reminder_enabled: false,
    telegram_enabled: false,
    telegram_chat_id: '',
    gmail_refresh_token: '',
    email_scan_enabled: false
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (session?.user?.id) {
      loadUserSettings()
    }
  }, [session, status, router])

  const loadUserSettings = async () => {
    try {
      const response = await fetch('/api/user/preferences')
      const result = await response.json()
      
      if (result.success) {
        setSettings({
          name: session.user.name || '',
          email: session.user.email || '',
          monthly_allowance: result.data.monthly_allowance || '',
          monthly_budget_total: result.data.monthly_budget_total || '',
          reminder_time: result.data.reminder_time || '21:00',
          reminder_enabled: result.data.reminder_enabled || false,
          telegram_enabled: result.data.telegram_enabled || false,
          telegram_chat_id: result.data.telegram_chat_id || '',
          gmail_refresh_token: result.data.gmail_refresh_token || '',
          email_scan_enabled: result.data.email_scan_enabled || false
        })
        setGmailConnected(!!result.data.gmail_refresh_token)
        setSelectedBanks(result.data.selected_banks || ['hdfc', 'icici', 'sbi', 'axis', 'kotak', 'zomato', 'swiggy', 'amazon'])
      }
    } catch (error) {
      console.error('Error loading settings:', error)
      setMessage({ type: 'error', text: 'Failed to load settings' })
    }
  }

  const handleSave = async () => {
    setLoading(true)
    setMessage({ type: '', text: '' })

    try {
      const response = await fetch('/api/user/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          monthly_allowance: settings.monthly_allowance ? parseFloat(settings.monthly_allowance) : 0,
          monthly_budget_total: settings.monthly_budget_total ? parseFloat(settings.monthly_budget_total) : 0,
          reminder_time: settings.reminder_time,
          reminder_enabled: settings.reminder_enabled,
          telegram_enabled: settings.telegram_enabled,
          email_scan_enabled: settings.email_scan_enabled,
          selected_banks: selectedBanks
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setMessage({ type: 'success', text: 'Settings saved successfully!' })
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      setMessage({ type: 'error', text: 'Error saving settings' })
    } finally {
      setLoading(false)
      setTimeout(() => setMessage({ type: '', text: '' }), 3000)
    }
  }

  const handleGmailConnect = async () => {
    setGmailLoading(true)
    try {
      const res = await fetch('/api/email/auth')
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error('Failed to get auth URL')
      }
    } catch (error) {
      console.error('Gmail connect error:', error)
      setMessage({ type: 'error', text: 'Failed to connect Gmail' })
      setGmailLoading(false)
    }
  }

  const handleGmailDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect Gmail?')) return
    
    try {
      const res = await fetch('/api/user/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gmail_refresh_token: null,
          email_scan_enabled: false
        })
      })
      
      if (res.ok) {
        setGmailConnected(false)
        setSettings({...settings, gmail_refresh_token: '', email_scan_enabled: false})
        setMessage({ type: 'success', text: 'Gmail disconnected' })
      }
    } catch (error) {
      console.error('Error disconnecting Gmail:', error)
      setMessage({ type: 'error', text: 'Failed to disconnect' })
    }
  }

  const toggleBank = (bankCode) => {
    setSelectedBanks(prev => {
      if (prev.includes(bankCode)) {
        return prev.filter(c => c !== bankCode)
      } else {
        return [...prev, bankCode]
      }
    })
  }

  const selectAllBanks = () => {
    const allBankCodes = BANK_OPTIONS.map(b => b.code)
    setSelectedBanks(allBankCodes)
  }

  const clearAllBanks = () => {
    setSelectedBanks([])
  }

  const scanEmails = async () => {
    try {
      const res = await fetch('/api/email/scan', { method: 'POST' })
      const data = await res.json()
      
      if (data.success) {
        setMessage({ 
          type: 'success', 
          text: `✅ Found ${data.found} new transactions!` 
        })
      } else {
        setMessage({ type: 'error', text: data.error || 'Scan failed' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error scanning emails' })
    }
  }

  if (status === 'loading') {
    return (
      <>
        <Navbar />
        <div className="max-w-md mx-auto p-4 text-center">Loading...</div>
      </>
    )
  }

  return (
    <>
      <Navbar />
      <div className="max-w-2xl mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6">Settings</h1>

        {message.text && (
          <div className={`p-3 mb-4 rounded ${
            message.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
          }`}>
            {message.text}
          </div>
        )}

        <div className="bg-white shadow rounded-lg p-6 space-y-6">
          {/* Profile Section */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Profile</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  type="text"
                  value={settings.name}
                  className="w-full p-2 border rounded bg-gray-50"
                  disabled
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  value={settings.email}
                  className="w-full p-2 border rounded bg-gray-50"
                  disabled
                />
              </div>
            </div>
          </div>

          {/* Email Scanning Section - ADDED BACK */}
          <div className="border-t pt-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <EnvelopeIcon className="w-5 h-5 mr-2 text-blue-500" />
              Email Scanning
            </h2>
            <div className="bg-blue-50 p-4 rounded-lg mb-4">
              <p className="text-sm text-blue-800">
                Connect your Gmail to automatically detect expenses from bank emails, 
                payment confirmations, and UPI transactions. Select which banks and services
                to scan to save API quota and get faster results.
              </p>
            </div>

            <div className="space-y-4">
              {gmailConnected ? (
                <>
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center">
                      <CheckCircleIcon className="w-5 h-5 text-green-500 mr-2" />
                      <span className="text-sm text-green-700">Gmail connected</span>
                    </div>
                    <button
                      onClick={handleGmailDisconnect}
                      className="text-sm text-red-600 hover:text-red-800"
                    >
                      Disconnect
                    </button>
                  </div>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.email_scan_enabled}
                      onChange={(e) => setSettings({...settings, email_scan_enabled: e.target.checked})}
                      className="mr-2 rounded"
                    />
                    <span className="text-sm font-medium">Enable automatic email scanning</span>
                  </label>

                  {/* Bank Selection */}
                  <div className="mt-4 border rounded-lg p-4">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-medium flex items-center">
                        <BanknotesIcon className="w-4 h-4 mr-2 text-gray-600" />
                        Select Banks & Services to Track
                      </h3>
                      <div className="space-x-2">
                        <button
                          onClick={selectAllBanks}
                          className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
                        >
                          Select All
                        </button>
                        <button
                          onClick={clearAllBanks}
                          className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded hover:bg-gray-200"
                        >
                          Clear All
                        </button>
                      </div>
                    </div>
                    
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {/* Banks */}
                      {groupedBanks.banks.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 mb-2">🏦 Banks</h4>
                          <div className="grid grid-cols-2 gap-2">
                            {groupedBanks.banks.map(bank => (
                              <label key={bank.code} className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded">
                                <input
                                  type="checkbox"
                                  checked={selectedBanks.includes(bank.code)}
                                  onChange={() => toggleBank(bank.code)}
                                  className="rounded"
                                />
                                <span className="text-sm">{bank.name}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Payment Apps */}
                      {groupedBanks.payment.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 mb-2">📱 Payment Apps</h4>
                          <div className="grid grid-cols-2 gap-2">
                            {groupedBanks.payment.map(bank => (
                              <label key={bank.code} className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded">
                                <input
                                  type="checkbox"
                                  checked={selectedBanks.includes(bank.code)}
                                  onChange={() => toggleBank(bank.code)}
                                  className="rounded"
                                />
                                <span className="text-sm">{bank.name}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Food Delivery */}
                      {groupedBanks.food.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 mb-2">🍔 Food Delivery</h4>
                          <div className="grid grid-cols-2 gap-2">
                            {groupedBanks.food.map(bank => (
                              <label key={bank.code} className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded">
                                <input
                                  type="checkbox"
                                  checked={selectedBanks.includes(bank.code)}
                                  onChange={() => toggleBank(bank.code)}
                                  className="rounded"
                                />
                                <span className="text-sm">{bank.name}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Shopping */}
                      {groupedBanks.shopping.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 mb-2">🛍️ Shopping</h4>
                          <div className="grid grid-cols-2 gap-2">
                            {groupedBanks.shopping.map(bank => (
                              <label key={bank.code} className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded">
                                <input
                                  type="checkbox"
                                  checked={selectedBanks.includes(bank.code)}
                                  onChange={() => toggleBank(bank.code)}
                                  className="rounded"
                                />
                                <span className="text-sm">{bank.name}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Entertainment */}
                      {groupedBanks.entertainment.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 mb-2">🎬 Entertainment</h4>
                          <div className="grid grid-cols-2 gap-2">
                            {groupedBanks.entertainment.map(bank => (
                              <label key={bank.code} className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded">
                                <input
                                  type="checkbox"
                                  checked={selectedBanks.includes(bank.code)}
                                  onChange={() => toggleBank(bank.code)}
                                  className="rounded"
                                />
                                <span className="text-sm">{bank.name}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Telecom */}
                      {groupedBanks.telecom.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 mb-2">📞 Telecom</h4>
                          <div className="grid grid-cols-2 gap-2">
                            {groupedBanks.telecom.map(bank => (
                              <label key={bank.code} className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded">
                                <input
                                  type="checkbox"
                                  checked={selectedBanks.includes(bank.code)}
                                  onChange={() => toggleBank(bank.code)}
                                  className="rounded"
                                />
                                <span className="text-sm">{bank.name}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Travel */}
                      {groupedBanks.travel.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 mb-2">✈️ Travel</h4>
                          <div className="grid grid-cols-2 gap-2">
                            {groupedBanks.travel.map(bank => (
                              <label key={bank.code} className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded">
                                <input
                                  type="checkbox"
                                  checked={selectedBanks.includes(bank.code)}
                                  onChange={() => toggleBank(bank.code)}
                                  className="rounded"
                                />
                                <span className="text-sm">{bank.name}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <p className="text-xs text-gray-500 mt-3">
                      Selected {selectedBanks.length} of {BANK_OPTIONS.length} services
                    </p>
                  </div>

                  <button
                    onClick={scanEmails}
                    className="w-full bg-green-500 text-white py-2 rounded hover:bg-green-600 transition"
                  >
                    Scan Now
                  </button>
                </>
              ) : (
                <button
                  onClick={handleGmailConnect}
                  disabled={gmailLoading}
                  className="w-full bg-red-500 text-white py-2 rounded hover:bg-red-600 transition disabled:bg-red-300"
                >
                  {gmailLoading ? 'Connecting...' : 'Connect Gmail Account'}
                </button>
              )}
            </div>
          </div>

          {/* Budget Settings */}
          <div className="border-t pt-6">
            <h2 className="text-lg font-semibold mb-4">💰 Budget Settings</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Monthly Income</label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={settings.monthly_allowance}
                  onChange={(e) => setSettings({...settings, monthly_allowance: e.target.value})}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., 50000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Monthly Budget</label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={settings.monthly_budget_total}
                  onChange={(e) => setSettings({...settings, monthly_budget_total: e.target.value})}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., 30000"
                />
              </div>
            </div>
          </div>

          {/* Telegram Reminders */}
          <div className="border-t pt-6">
            <h2 className="text-lg font-semibold mb-4">📱 Telegram Reminders</h2>
            <div className="bg-blue-50 p-4 rounded-lg mb-4">
              <p className="text-sm text-blue-800">
                <strong>Connect Telegram:</strong> Message{' '}
                <a
                  href="https://t.me/expense_tracker_reminder_bot"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-700 font-medium underline"
                >
                  @expense_tracker_reminder_bot
                </a>{' '}
                with your email to link your account.
              </p>
            </div>
            
            <div className="space-y-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.telegram_enabled}
                  onChange={(e) => setSettings({...settings, telegram_enabled: e.target.checked})}
                  className="mr-2 rounded"
                />
                <span className="text-sm font-medium">Enable daily Telegram reminders</span>
              </label>
              
              {settings.telegram_chat_id && (
                <p className="text-sm text-green-600">✅ Connected to Telegram</p>
              )}
            </div>
          </div>

          {/* Daily Reminder Time */}
          <div className="border-t pt-6">
            <h2 className="text-lg font-semibold mb-4">⏰ Daily Reminder</h2>
            <div className="space-y-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.reminder_enabled}
                  onChange={(e) => setSettings({...settings, reminder_enabled: e.target.checked})}
                  className="mr-2 rounded"
                />
                <span className="text-sm font-medium">Enable daily reminders</span>
              </label>
              
              {settings.reminder_enabled && (
                <div>
                  <label className="block text-sm font-medium mb-1">Reminder Time</label>
                  <input
                    type="time"
                    value={settings.reminder_time}
                    onChange={(e) => setSettings({...settings, reminder_time: e.target.value})}
                    className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={loading}
            className="w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 transition disabled:bg-blue-300 font-medium"
          >
            {loading ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </>
  )
}