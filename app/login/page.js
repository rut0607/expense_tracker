'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false
      })

      if (result.error) {
        setError('Invalid email or password')
      } else {
        router.push('/')
      }
    } catch (error) {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex text-black">
      {/* Left Column - Form */}
      <div className="w-full md:w-1/2 flex flex-col justify-center px-8 sm:px-16 lg:px-24 bg-white">

        <div className="mb-12">
          <Link href="/" className="text-2xl font-bold tracking-tight flex items-center gap-2">
            {/* Simple logo shape */}
            <div className="w-6 h-6 bg-black rounded-sm transform rotate-45"></div>
            Tracker.
          </Link>
        </div>

        <div className="max-w-md w-full">
          <h1 className="text-5xl md:text-6xl font-semibold tracking-tight leading-[1.1] mb-6">
            Track expenses effortlessly.
          </h1>
          <p className="text-gray-500 text-lg mb-10 leading-relaxed">
            Fast, user-friendly and engaging - turn managing your finances into a seamless habit.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm font-medium">
                {error}
              </div>
            )}

            <div>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="Enter email address"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[--color-brand-green] focus:bg-white transition-all text-base placeholder:text-gray-400"
              />
            </div>

            <div>
              <input
                id="password"
                name="password"
                type="password"
                placeholder="Enter password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[--color-brand-green] focus:bg-white transition-all text-base placeholder:text-gray-400"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 px-4 bg-[--color-brand-green] hover:bg-[--color-brand-green-hover] text-black font-semibold rounded-2xl transition-colors disabled:opacity-50 text-base"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <div className="mt-8 flex items-center gap-4">
            <div className="h-px bg-gray-200 flex-1"></div>
            <span className="text-sm text-gray-400 font-medium">or</span>
            <div className="h-px bg-gray-200 flex-1"></div>
          </div>

          <div className="mt-8">
            <button
              onClick={() => signIn('google', { callbackUrl: '/' })}
              className="w-full flex items-center justify-center gap-3 py-4 px-4 border border-gray-200 rounded-2xl hover:bg-gray-50 transition-colors font-medium text-black"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </button>
          </div>

          <p className="mt-8 text-center text-gray-500">
            Don't have an account?{' '}
            <Link href="/signup" className="text-black font-semibold hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>

      {/* Right Column - Visual Graphic */}
      <div className="hidden md:flex md:w-1/2 bg-[#fafafa] relative overflow-hidden items-center justify-center">
        {/* Placeholder for the graphic */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-gray-100 to-[#fafafa] opacity-50"></div>

        {/* Abstract floating UI representations */}
        <div className="relative z-10 w-full max-w-lg aspect-square">
          <div className="absolute top-1/4 left-1/4 w-32 h-16 bg-white rounded-2xl shadow-xl flex items-center px-4 gap-3 rotate-[-5deg] animate-pulse" style={{ animationDuration: '4s' }}>
            <div className="w-8 h-8 rounded-full bg-gray-100"></div>
            <div className="w-12 h-2 rounded bg-gray-200"></div>
          </div>
          <div className="absolute top-1/3 right-1/4 w-48 h-32 bg-white rounded-3xl shadow-2xl flex flex-col p-5 gap-3 rotate-[5deg]">
            <div className="w-16 h-3 rounded bg-[--color-brand-green] mb-2"></div>
            <div className="w-full h-2 rounded bg-gray-100"></div>
            <div className="w-3/4 h-2 rounded bg-gray-100"></div>
            <div className="w-5/6 h-2 rounded bg-gray-100"></div>
          </div>
          <div className="absolute bottom-1/4 left-1/3 w-40 h-10 bg-white rounded-xl shadow-lg flex items-center justify-between px-4 rotate-[-2deg]">
            <div className="w-6 h-2 rounded bg-gray-300"></div>
            <div className="w-6 h-6 rounded-md bg-[--color-brand-green] opacity-80"></div>
          </div>
        </div>
      </div>
    </div>
  )
}