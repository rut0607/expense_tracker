'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Navbar from '@/components/Navbar'
import { getUserPreferences, saveUserPreferences, uploadAvatar } from '@/utils/settings'
import { supabase } from '@/utils/supabase'

export default function SettingsPage() {
  const { data: session, status, update } = useSession()
  const router = useRouter()
  const fileInputRef = useRef()
  
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [avatarUploading, setAvatarUploading] = useState(false)
  
  const [settings, setSettings] = useState({
    name: '',
    email: '',
    avatar_url: '',
    whatsapp_number: '',
    reminder_time: '21:00',
    reminder_enabled: false,
    email_notifications: false,
    currency: 'INR',
    monthly_budget: ''
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (session?.user?.id) {
      loadUserData()
    }
  }, [session, status, router])

  const loadUserData = async () => {
    setLoading(true)
    try {
      // Load user profile
      const { data: userData } = await supabase
        .from('users')
        .select('name, avatar_url')
        .eq('id', session.user.id)
        .single()

      // Load preferences
      const { data: prefData } = await getUserPreferences(session.user.id)

      setSettings({
        name: userData?.name || session.user.name || '',
        email: session.user.email || '',
        avatar_url: userData?.avatar_url || '',
        whatsapp_number: prefData?.whatsapp_number || '',
        reminder_time: prefData?.reminder_time || '21:00',
        reminder_enabled: prefData?.reminder_enabled || false,
        email_notifications: prefData?.email_notifications || false,
        currency: prefData?.currency || 'INR',
        monthly_budget: prefData?.monthly_budget || ''
      })
    } catch (error) {
      console.error('Error loading settings:', error)
      setMessage({ type: 'error', text: 'Failed to load settings' })
    } finally {
      setLoading(false)
    }
  }

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Please upload an image file' })
      return
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Image size should be less than 2MB' })
      return
    }

    setAvatarUploading(true)
    try {
      const result = await uploadAvatar(session.user.id, file)
      
      if (result.success) {
        setSettings(prev => ({ ...prev, avatar_url: result.avatarUrl }))
        setMessage({ type: 'success', text: 'Avatar updated successfully' })
        
        // Update session
        await update({ image: result.avatarUrl })
      } else {
        setMessage({ type: 'error', text: result.error })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to upload avatar' })
    } finally {
      setAvatarUploading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage({ type: '', text: '' })

    try {
      // Update name in users table
      if (settings.name !== session.user.name) {
        await supabase
          .from('users')
          .update({ name: settings.name })
          .eq('id', session.user.id)
      }

      // Save preferences
      const result = await saveUserPreferences(session.user.id, {
        whatsapp_number: settings.whatsapp_number,
        reminder_time: settings.reminder_time,
        reminder_enabled: settings.reminder_enabled,
        email_notifications: settings.email_notifications,
        currency: settings.currency,
        monthly_budget: settings.monthly_budget ? parseFloat(settings.monthly_budget) : null
      })

      if (result.success) {
        setMessage({ type: 'success', text: 'Settings saved successfully!' })
        
        // Update session name
        await update({ name: settings.name })
      } else {
        setMessage({ type: 'error', text: result.error })
      }
    } catch (error) {
      console.error('Error saving:', error)
      setMessage({ type: 'error', text: 'Failed to save settings' })
    } finally {
      setSaving(false)
      setTimeout(() => setMessage({ type: '', text: '' }), 3000)
    }
  }

  if (status === 'loading' || loading) {
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

        <div className="bg-white shadow rounded-lg divide-y divide-gray-200">
          
          {/* Profile Section */}
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-4">Profile</h2>
            
            <div className="flex items-center space-x-6 mb-6">
              <div className="relative">
                {settings.avatar_url ? (
                  <img 
                    src={settings.avatar_url} 
                    alt="Avatar" 
                    className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-2xl font-bold">
                    {settings.name?.charAt(0) || settings.email?.charAt(0)}
                  </div>
                )}
                {avatarUploading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full">
                    <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                  </div>
                )}
              </div>
              
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleAvatarUpload}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={avatarUploading}
                  className="bg-gray-100 text-gray-700 px-4 py-2 rounded hover:bg-gray-200 transition disabled:opacity-50"
                >
                  Change Photo
                </button>
                <p className="text-xs text-gray-500 mt-1">Max size: 2MB</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  type="text"
                  value={settings.name}
                  onChange={(e) => setSettings({...settings, name: e.target.value})}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
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

          {/* WhatsApp Reminders */}
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-4">WhatsApp Reminders</h2>
            
            <div className="space-y-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={settings.reminder_enabled}
                  onChange={(e) => setSettings({...settings, reminder_enabled: e.target.checked})}
                  className="rounded"
                />
                <span className="text-sm font-medium">Enable daily reminders</span>
              </label>

              <div>
                <label className="block text-sm font-medium mb-1">
                  WhatsApp Number <span className="text-gray-400 text-xs">(with country code)</span>
                </label>
                <input
                  type="tel"
                  placeholder="+919876543210"
                  value={settings.whatsapp_number}
                  onChange={(e) => setSettings({...settings, whatsapp_number: e.target.value})}
                  disabled={!settings.reminder_enabled}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Reminder Time</label>
                <input
                  type="time"
                  value={settings.reminder_time}
                  onChange={(e) => setSettings({...settings, reminder_time: e.target.value})}
                  disabled={!settings.reminder_enabled}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                />
              </div>
            </div>
          </div>

          {/* Preferences */}
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-4">Preferences</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Currency</label>
                <select
                  value={settings.currency}
                  onChange={(e) => setSettings({...settings, currency: e.target.value})}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                >
                  <option value="INR">🇮🇳 INR (₹)</option>
                  <option value="USD">🇺🇸 USD ($)</option>
                  <option value="EUR">🇪🇺 EUR (€)</option>
                  <option value="GBP">🇬🇧 GBP (£)</option>
                  <option value="JPY">🇯🇵 JPY (¥)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Monthly Budget (Optional)</label>
                <input
                  type="number"
                  placeholder="Enter your monthly budget"
                  value={settings.monthly_budget}
                  onChange={(e) => setSettings({...settings, monthly_budget: e.target.value})}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={settings.email_notifications}
                  onChange={(e) => setSettings({...settings, email_notifications: e.target.checked})}
                  className="rounded"
                />
                <span className="text-sm font-medium">Receive weekly summary via email</span>
              </label>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="p-6">
            <h2 className="text-lg font-semibold text-red-600 mb-4">Danger Zone</h2>
            
            <div className="space-y-3">
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to delete all your expense data? This cannot be undone.')) {
                    // Implement delete all data
                  }
                }}
                className="text-red-600 hover:text-red-700 text-sm font-medium"
              >
                Delete all expense data
              </button>
              
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to export your data? It will download as JSON.')) {
                    // Implement export
                  }
                }}
                className="text-gray-600 hover:text-gray-700 text-sm font-medium block"
              >
                Export all data
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 transition disabled:bg-blue-300"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </>
  )
}