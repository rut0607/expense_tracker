import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Helper to validate UUID format
const isValidUUID = (uuid) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        try {
          const { data, error } = await supabaseAdmin.auth.signInWithPassword({
            email: credentials.email,
            password: credentials.password,
          })

          if (error || !data.user) {
            console.error('Auth error:', error)
            return null
          }

          return {
            id: data.user.id,
            email: data.user.email,
            name: data.user.user_metadata?.name || data.user.email?.split('@')[0],
          }
        } catch (error) {
          console.error('Auth error:', error)
          return null
        }
      }
    }),

    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],

  callbacks: {
    async jwt({ token, user, account }) {
      // Initial sign in
      if (user) {
        token.id = user.id
        token.email = user.email
        console.log('JWT callback - user:', { id: user.id, email: user.email })
      }
      return token
    },
    
    async session({ session, token }) {
      if (session?.user) {
        // First try to use token.id
        session.user.id = token.id
        
        // If token.id is not a valid UUID (like Google's numeric ID), look up the real UUID
        if (!isValidUUID(token.id) && session.user.email) {
          console.log('Session: Numeric ID detected, looking up UUID for email:', session.user.email)
          
          try {
            // Look up the real UUID from public.users
            const { data, error } = await supabaseAdmin
              .from('users')
              .select('id')
              .eq('email', session.user.email)
              .single()
            
            if (error) {
              console.error('Session: Error looking up user:', error)
            } else if (data) {
              console.log('Session: Replacing numeric ID with UUID:', data.id)
              session.user.id = data.id
            }
          } catch (error) {
            console.error('Session: Error in UUID lookup:', error)
          }
        }
        
        console.log('Session callback - final user ID:', session.user.id)
      }
      return session
    },
    
    async signIn({ user, account, profile }) {
      if (account.provider === 'google') {
        try {
          console.log('Google sign in - profile:', profile)
          
          // Check if user exists in public.users
          const { data: existingUser, error: checkError } = await supabaseAdmin
            .from('users')
            .select('id, email')
            .eq('email', profile.email)
            .maybeSingle()
          
          if (checkError) {
            console.error('Error checking existing user:', checkError)
          }
          
          if (existingUser) {
            // User exists, use their UUID
            user.id = existingUser.id
            console.log('Existing user found in public.users:', existingUser.id)
          } else {
            // Check if user exists in auth.users
            const { data: authUsers, error: authError } = await supabaseAdmin
              .from('auth.users')
              .select('id, email')
              .eq('email', profile.email)
              .maybeSingle()
            
            if (authError) {
              console.error('Error checking auth.users:', authError)
            }
            
            if (authUsers) {
              // User exists in auth but not in public.users - add them
              console.log('User found in auth.users but not public.users, adding...')
              
              const { error: insertError } = await supabaseAdmin
                .from('users')
                .insert({
                  id: authUsers.id,
                  email: profile.email,
                  name: profile.name,
                  avatar_url: profile.picture
                })
              
              if (insertError) {
                console.error('Error inserting into public.users:', insertError)
              } else {
                user.id = authUsers.id
                console.log('Added user to public.users:', authUsers.id)
              }
            } else {
              // New user - create in both
              console.log('Creating new user in auth.users...')
              
              const { data: newAuthUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
                email: profile.email,
                email_confirm: true,
                user_metadata: {
                  name: profile.name,
                  avatar_url: profile.picture
                }
              })
              
              if (createError) {
                console.error('Error creating user in auth:', createError)
                return false
              }
              
              // Create in public.users
              const { error: insertError } = await supabaseAdmin
                .from('users')
                .insert({
                  id: newAuthUser.user.id,
                  email: profile.email,
                  name: profile.name,
                  avatar_url: profile.picture
                })
              
              if (insertError) {
                console.error('Error inserting into public.users:', insertError)
              }
              
              user.id = newAuthUser.user.id
              console.log('New user created:', newAuthUser.user.id)
            }
          }
        } catch (error) {
          console.error('Error in Google sign in:', error)
          return false
        }
      }
      return true
    }
  },

  pages: {
    signIn: '/login',
    signUp: '/signup',
    error: '/login',
  },

  session: {
    strategy: 'jwt',
  },

  secret: process.env.NEXTAUTH_SECRET,
}