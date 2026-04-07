'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, Lock, ArrowRight, User, Sparkles, LayoutDashboard, ShieldCheck } from 'lucide-react'

export default function SignupPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    // Placeholder for your signup logic (API call)
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      })

      if (res.ok) {
        router.push('/login')
      } else {
        const data = await res.json()
        setError(data.message || 'Registration failed')
      }
    } catch (err) {
      setError('Connection failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-[#030303] font-sans selection:bg-teal-500/30">
      
      {/* --- ENHANCED DYNAMIC BACKGROUND --- */}
      <motion.div 
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-teal-500/10 rounded-full blur-[160px] pointer-events-none" 
      />
      <motion.div 
        animate={{ scale: [1.2, 1, 1.2], opacity: [0.2, 0.4, 0.2] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-[-10%] right-[-5%] w-[700px] h-[700px] bg-emerald-600/10 rounded-full blur-[140px] pointer-events-none" 
      />

      {/* --- MAIN SIGNUP CARD --- */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-[1100px] min-h-[720px] flex flex-col md:flex-row bg-white/[0.01] backdrop-blur-3xl rounded-[3.5rem] border border-white/5 shadow-[0_0_100px_rgba(0,0,0,0.8)] overflow-hidden m-4"
      >
        
        {/* LEFT VISUAL PANEL */}
        <div className="relative w-full md:w-[48%] h-72 md:h-auto overflow-hidden group">
          <motion.div 
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 1.5 }}
            className="absolute inset-0 bg-cover bg-center grayscale-[0.2]"
            style={{ backgroundImage: `url('https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=1200&auto=format&fit=crop')` }} 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0c0c0c] via-teal-950/60 to-[#030303]/20" />
          
          <div className="absolute inset-0 p-14 flex flex-col justify-between z-20">
            <motion.div 
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="flex items-center gap-4"
            >
              <div className="p-3 bg-white/5 rounded-2xl backdrop-blur-2xl border border-white/10 shadow-2xl">
                <LayoutDashboard size={28} className="text-teal-400" />
              </div>
              <div className="h-8 w-[1px] bg-white/20 mx-1" />
              <span className="font-bold tracking-[0.3em] text-white/50 uppercase text-[10px]">Secure Registration</span>
            </motion.div>

            <div className="space-y-8">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-white/5 border border-white/10 text-teal-300 text-[11px] font-bold uppercase tracking-widest backdrop-blur-md"
              >
                <div className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-pulse" />
                <Sparkles size={14} className="animate-spin-slow" /> One-Click Setup
              </motion.div>
              
              <h2 className="text-6xl font-black text-white leading-[0.95] tracking-tighter">
                Start <br /> 
                <span className="bg-clip-text text-transparent bg-gradient-to-br from-white via-teal-200 to-emerald-500">
                  Your Journey.
                </span>
              </h2>
            </div>
          </div>

          <div className="absolute top-0 -right-1 h-full w-48 z-10 hidden md:block">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
              <path d="M100 0 C 20 25, 20 75, 100 100 L 100 0 Z" fill="rgba(0,0,0,0.3)" />
              <path d="M100 0 C 30 25, 30 75, 100 100 L 100 0 Z" fill="#0c0c0c" />
            </svg>
          </div>
        </div>

        {/* RIGHT FORM PANEL */}
        <div className="flex-1 bg-[#0c0c0c] p-10 md:p-20 flex flex-col justify-center">
          <div className="max-w-md mx-auto w-full">
            <motion.header 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mb-12"
            >
              <h1 className="text-4xl font-black text-white mb-3 tracking-tight">Create Account</h1>
              <p className="text-gray-500 text-sm font-medium">Join the next generation of expense analysis</p>
            </motion.header>

            <form onSubmit={handleSubmit} className="space-y-5">
              <AnimatePresence>
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="bg-red-500/10 border border-red-500/20 text-red-400 px-5 py-4 rounded-2xl text-[11px] font-bold tracking-wider flex items-center gap-3"
                  >
                    <div className="w-1 h-1 bg-red-400 rounded-full" />
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-4">
                {/* Name Input */}
                <div className="relative group">
                  <div className="absolute inset-0 bg-teal-500/20 rounded-2xl blur-md opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
                  <div className="relative bg-[#111] border border-white/5 rounded-2xl py-1 transition-all group-focus-within:border-teal-500/50">
                    <User className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-teal-400 transition-colors" size={20} />
                    <input
                      type="text"
                      placeholder="Full Name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-transparent py-4 pl-14 pr-6 text-white placeholder:text-gray-700 focus:outline-none transition-all"
                      required
                    />
                  </div>
                </div>

                {/* Email Input */}
                <div className="relative group">
                  <div className="absolute inset-0 bg-teal-500/20 rounded-2xl blur-md opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
                  <div className="relative bg-[#111] border border-white/5 rounded-2xl py-1 transition-all group-focus-within:border-teal-500/50">
                    <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-teal-400 transition-colors" size={20} />
                    <input
                      type="email"
                      placeholder="Email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-transparent py-4 pl-14 pr-6 text-white placeholder:text-gray-700 focus:outline-none transition-all"
                      required
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div className="relative group">
                  <div className="absolute inset-0 bg-teal-500/20 rounded-2xl blur-md opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
                  <div className="relative bg-[#111] border border-white/5 rounded-2xl py-1 transition-all group-focus-within:border-teal-500/50">
                    <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-teal-400 transition-colors" size={20} />
                    <input
                      type="password"
                      placeholder="Password (min 8 chars)"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-transparent py-4 pl-14 pr-6 text-white placeholder:text-gray-700 focus:outline-none transition-all"
                      required
                    />
                  </div>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={loading}
                className="w-full bg-white text-black font-black py-5 rounded-2xl flex items-center justify-center gap-3 group relative overflow-hidden transition-all mt-4"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-teal-400/20 to-emerald-400/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="relative z-10">{loading ? 'Creating Account...' : 'Initialize Account'}</span>
                {!loading && <ArrowRight size={20} className="relative z-10 group-hover:translate-x-1.5 transition-transform" />}
              </motion.button>
            </form>

            <div className="my-10 flex items-center gap-5 text-gray-800">
              <div className="h-[1px] flex-1 bg-white/5" />
              <div className="flex items-center gap-2">
                <ShieldCheck size={12} className="text-gray-600" />
                <span className="text-[9px] font-black uppercase tracking-[4px]">Verified SSL</span>
              </div>
              <div className="h-[1px] flex-1 bg-white/5" />
            </div>

            <button
              onClick={() => signIn('google', { callbackUrl: '/' })}
              className="w-full flex items-center justify-center gap-4 py-4 bg-[#0f0f0f] border border-white/5 rounded-2xl hover:border-white/10 transition-all text-white font-bold text-sm group"
            >
              <svg className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Fast Sign up with Google
            </button>

            <footer className="mt-12 text-center">
              <p className="text-gray-600 text-[11px] font-bold uppercase tracking-widest">
                Already have protocol access?
              </p>
              <Link href="/login" className="mt-3 block text-teal-400 font-black hover:text-teal-300 transition-colors text-xs">
                Back to Secure Login
              </Link>
            </footer>
          </div>
        </div>
      </motion.div>
    </div>
  )
}