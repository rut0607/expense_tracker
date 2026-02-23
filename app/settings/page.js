'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'

export default function SettingsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [testMessageLoading, setTestMessageLoading] = useState(false)
  const [testPDFLoading, setTestPDFLoading] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [settings, setSettings] = useState({
    name: '',
    email: '',
    monthly_allowance: '',
    monthly_budget_total: '',
    reminder_time: '21:00',
    reminder_enabled: false,
    email_notifications: false,
    telegram_enabled: false,
    telegram_chat_id: ''
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
          email_notifications: result.data.email_notifications || false,
          telegram_enabled: result.data.telegram_enabled || false,
          telegram_chat_id: result.data.telegram_chat_id || ''
        })
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
          email_notifications: settings.email_notifications,
          telegram_enabled: settings.telegram_enabled
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

  const handleTestTelegramMessage = async () => {
    setTestMessageLoading(true)
    setMessage({ type: '', text: '' })

    try {
      const response = await fetch('/api/telegram/send-test', { method: 'POST' })
      const data = await response.json()

      if (data.success) {
        setMessage({ type: 'success', text: '✅ Test message sent on Telegram!' })
      } else {
        setMessage({ type: 'error', text: data.error || '❌ Failed to send test message' })
      }
    } catch (error) {
      console.error('Test Telegram error:', error)
      setMessage({ type: 'error', text: 'Error sending test message' })
    } finally {
      setTestMessageLoading(false)
      setTimeout(() => setMessage({ type: '', text: '' }), 5000)
    }
  }

  const handleTestTelegramPDF = async () => {
    setTestPDFLoading(true)
    setMessage({ type: '', text: '' })

    try {
      const response = await fetch('/api/telegram/send-pdf', { method: 'POST' })
      const data = await response.json()

      if (data.success) {
        setMessage({ type: 'success', text: '✅ PDF report sent on Telegram!' })
      } else {
        setMessage({ type: 'error', text: data.error || '❌ Failed to send PDF' })
      }
    } catch (error) {
      console.error('Test PDF error:', error)
      setMessage({ type: 'error', text: 'Error sending PDF' })
    } finally {
      setTestPDFLoading(false)
      setTimeout(() => setMessage({ type: '', text: '' }), 5000)
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
      <div className="max-w-md mx-auto p-4">
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

          {/* Budget Settings */}
          <div className="border-t pt-6">
            <h2 className="text-lg font-semibold mb-4">💰 Budget Settings</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Monthly Allowance (Income)</label>
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
                <label className="block text-sm font-medium mb-1">Overall Monthly Budget</label>
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

          {/* Telegram Reminders Section */}
          <div className="border-t pt-6">
            <h2 className="text-lg font-semibold mb-4">🤖 Telegram Reminders</h2>
            <div className="bg-blue-50 p-4 rounded-lg mb-4">
              <p className="text-sm text-blue-800">
                <strong>How to connect:</strong> Click{' '}
                <a
                  href="https://t.me/expense_tracker_reminder_bot"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-700 hover:text-blue-900 underline font-medium"
                >
                  here to open the bot on Telegram
                </a>{' '}
                and send your registered email address.
              </p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.telegram_enabled}
                    onChange={(e) => setSettings({...settings, telegram_enabled: e.target.checked})}
                    className="mr-2 rounded"
                  />
                  <span className="text-sm font-medium">Enable Telegram reminders</span>
                </label>
              </div>
              {settings.telegram_chat_id && (
                <p className="text-sm text-green-600">✅ Linked to Telegram</p>
              )}
              <div className="space-y-2">
                <button
                  onClick={handleTestTelegramMessage}
                  disabled={!settings.telegram_enabled || !settings.telegram_chat_id || testMessageLoading}
                  className="w-full bg-green-500 text-white py-2 rounded hover:bg-green-600 transition disabled:bg-gray-300"
                >
                  {testMessageLoading ? 'Sending...' : 'Send Test Message'}
                </button>
                <button
                  onClick={handleTestTelegramPDF}
                  disabled={!settings.telegram_enabled || !settings.telegram_chat_id || testPDFLoading}
                  className="w-full bg-purple-500 text-white py-2 rounded hover:bg-purple-600 transition disabled:bg-gray-300"
                >
                  {testPDFLoading ? 'Sending...' : 'Send Test PDF Report'}
                </button>
              </div>
            </div>
          </div>

          {/* Reminder Time */}
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
              
              <div>
                <label className="block text-sm font-medium mb-1">Reminder Time</label>
                <input
                  type="time"
                  value={settings.reminder_time}
                  onChange={(e) => setSettings({...settings, reminder_time: e.target.value})}
                  className="w-full p-2 border rounded"
                  disabled={!settings.reminder_enabled}
                />
              </div>
            </div>
          </div>

          {/* Email Preferences */}
          <div className="border-t pt-6">
            <h2 className="text-lg font-semibold mb-4">📧 Email</h2>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.email_notifications}
                onChange={(e) => setSettings({...settings, email_notifications: e.target.checked})}
                className="mr-2 rounded"
              />
              <span className="text-sm font-medium">Receive weekly summary</span>
            </label>
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