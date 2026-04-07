import { createClient } from '@supabase/supabase-js'

class SupabaseClient {
  constructor() {
    this.url = process.env.NEXT_PUBLIC_SUPABASE_URL
    this.anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    this.serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!this.url || !this.anonKey) {
      throw new Error('Missing Supabase environment variables')
    }
  }

  getClient() {
    return createClient(this.url, this.anonKey)
  }

  getAdminClient() {
    if (!this.serviceKey) {
      throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')
    }
    return createClient(this.url, this.serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  }

  // Helper to get client with user context
  async withUser(userId, callback) {
    const supabase = this.getClient()
    // You can add custom headers or context here if needed
    return callback(supabase)
  }
}

export const supabase = new SupabaseClient()