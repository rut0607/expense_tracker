import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL is not set in environment variables')
}

if (!supabaseAnonKey) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_ANON_KEY is not set in environment variables')
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '')

// Helper to check connection (optional)
export const checkSupabaseConnection = async () => {
  try {
    const { error } = await supabase.from('users').select('count', { count: 'exact', head: true })
    if (error) throw error
    return { success: true }
  } catch (error) {
    console.error('Supabase connection error:', error)
    return { success: false, error: error.message }
  }
}