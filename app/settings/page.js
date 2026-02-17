'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { supabase } from '@/utils/supabase'

export default function SettingsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [settings, setSettings] = useState({
    name: '',
    whatsapp_number: '',
    reminder_time: '21:00',
    reminder_enabled: false,
    email_notifications: false
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
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', session.user.id)
        .single()

      if (data) {
        setSettings({
          name: session.user.name || '',
          whatsapp_number: data.whatsapp_number || '',
          reminder_time: data.reminder_time || '21:00',
          reminder_enabled: data.reminder_enabled || false,
          email_notifications: data.email_notifications || false
        })
      }
    } catch (error) {
      console.error('Error loading settings:', error)
    }
  }

  const handleSave = async () => {
    setLoading(true)
    setMessage('')

    try {
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: session.user.id,
          whatsapp_number: settings.whatsapp_number,
          reminder_time: settings.reminder_time,
          reminder_enabled: settings.reminder_enabled,
          email_notifications: settings.email_notifications,
          updated_at: new Date().toISOString()
        })

      if (error) throw error

      setMessage('Settings saved successfully!')
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      console.error('Error saving settings:', error)
      setMessage('Error saving settings')
    } finally {
      setLoading(false)
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

        {message && (
          <div className={`p-3 mb-4 rounded ${
            message.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
          }`}>
            {message}
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
                  onChange={(e) => setSettings({...settings, name: e.target.value})}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                  disabled
                />
                <p className="text-xs text-gray-500 mt-1">Name from Google account</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  value={session?.user?.email || ''}
                  className="w-full p-2 border rounded bg-gray-50"
                  disabled
                />
              </div>
            </div>
          </div>

          <div className="border-t pt-6">
            <h2 className="text-lg font-semibold mb-4">WhatsApp Reminders</h2>
            <div className="space-y-4">
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.reminder_enabled}
                    onChange={(e) => setSettings({...settings, reminder_enabled: e.target.checked})}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium">Enable daily reminders</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">WhatsApp Number</label>
                <input
                  type="tel"
                  placeholder="+919876543210"
                  value={settings.whatsapp_number}
                  onChange={(e) => setSettings({...settings, whatsapp_number: e.target.value})}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                  disabled={!settings.reminder_enabled}
                />
                <p className="text-xs text-gray-500 mt-1">Include country code (e.g., +91 for India)</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Reminder Time</label>
                <input
                  type="time"
                  value={settings.reminder_time}
                  onChange={(e) => setSettings({...settings, reminder_time: e.target.value})}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                  disabled={!settings.reminder_enabled}
                />
              </div>
            </div>
          </div>

          <div className="border-t pt-6">
            <h2 className="text-lg font-semibold mb-4">Email Preferences</h2>
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.email_notifications}
                  onChange={(e) => setSettings({...settings, email_notifications: e.target.checked})}
                  className="mr-2"
                />
                <span className="text-sm font-medium">Receive weekly summary via email</span>
              </label>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={loading}
            className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 transition disabled:bg-blue-300"
          >
            {loading ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </>
  )
}