import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl) {
  throw new Error('❌ NEXT_PUBLIC_SUPABASE_URL is not set in environment variables')
}

if (!supabaseServiceRoleKey) {
  throw new Error('❌ SUPABASE_SERVICE_ROLE_KEY is not set in environment variables')
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Helper to check admin connection
export const checkAdminConnection = async () => {
  try {
    const { error } = await supabaseAdmin.from('users').select('count', { count: 'exact', head: true })
    if (error) throw error
    return { success: true }
  } catch (error) {
    console.error('Supabase admin connection error:', error)
    return { success: false, error: error.message }
  }
}