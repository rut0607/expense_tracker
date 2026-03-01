'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  Squares2X2Icon, 
  ClockIcon, 
  BanknotesIcon, 
  ChartBarIcon, 
  Cog6ToothIcon,
  PowerIcon,
  ArrowRightIcon,
  Bars3Icon,
  XMarkIcon
} from '@heroicons/react/24/outline'

export default function Navbar() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const [isScrolled, setIsScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const isActive = (path) => path === '/' ? pathname === '/' : pathname.startsWith(path)
  
  if (pathname === '/login' || pathname === '/signup') return null

  const navLinks = [
    { href: '/', label: 'Dashboard', icon: Squares2X2Icon },
    { href: '/analytics', label: 'Analytics', icon: ChartBarIcon },
    { href: '/budgets', label: 'Budgets', icon: BanknotesIcon },
    { href: '/history', label: 'History', icon: ClockIcon },
    { href: '/settings', label: 'Settings', icon: Cog6ToothIcon },
  ]

  return (
    <header className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-500 ease-in-out ${
      isScrolled ? 'pt-3' : 'pt-6'
    }`}>
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6">
        <nav className={`flex items-center justify-between h-[72px] px-4 transition-all duration-500 rounded-[28px] border ${
          isScrolled 
            ? 'bg-white/70 backdrop-blur-xl border-zinc-200/50 shadow-[0_10px_40px_rgba(0,0,0,0.04)]' 
            : 'bg-white border-zinc-100 shadow-sm'
        }`}>
          
          {/* 1. BRAND POD - VANTAGE */}
          <div className="flex items-center pl-2">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="relative w-9 h-9 bg-zinc-950 rounded-xl flex items-center justify-center transition-all group-hover:bg-emerald-500">
                {/* Custom geometric logo mark */}
                <div className="absolute inset-2 border-2 border-white/20 rounded-sm group-hover:border-white/40 transition-colors" />
                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full shadow-[0_0_8px_rgba(52,211,153,0.6)] group-hover:bg-white" />
              </div>
              <span className="hidden lg:block text-xl font-black tracking-tighter text-zinc-900">
                Vantage<span className="text-emerald-500">.</span>
              </span>
            </Link>
          </div>

          {/* 2. NAVIGATION POD (All Features Visible) */}
          <div className="hidden md:flex items-center bg-zinc-50 p-1.5 rounded-[20px] border border-zinc-100">
            {navLinks.map((link) => {
              const Icon = link.icon
              const active = isActive(link.href)
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-2 px-4 py-2 text-[12px] font-bold uppercase tracking-widest rounded-[14px] transition-all duration-300 ${
                    active 
                      ? 'bg-white text-zinc-900 shadow-sm ring-1 ring-zinc-200/50' 
                      : 'text-zinc-400 hover:text-zinc-900 hover:bg-white/50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${active ? 'text-emerald-500' : 'text-zinc-400'}`} />
                  {link.label}
                </Link>
              )
            })}
          </div>

          {/* 3. IDENTITY POD */}
          <div className="flex items-center gap-3 pr-2">
            {session ? (
              <div className="flex items-center gap-4">
                <div className="hidden lg:flex flex-col items-end leading-none">
                  <span className="text-[10px] font-black text-zinc-300 uppercase tracking-widest mb-1 italic">Pro Access</span>
                  <span className="text-sm font-bold text-zinc-900">{session.user?.name?.split(' ')[0]}</span>
                </div>
                <button
                  onClick={() => signOut()}
                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-zinc-950 text-white hover:bg-red-500 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-zinc-200"
                  title="Sign Out"
                >
                  <PowerIcon className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <Link href="/login" className="hidden sm:block text-sm font-bold text-zinc-500 hover:text-zinc-900 transition-colors">
                  Sign in
                </Link>
                <Link 
                  href="/signup" 
                  className="group flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold rounded-xl shadow-lg shadow-emerald-100 transition-all hover:translate-y-[-1px]"
                >
                  See a demo
                  <ArrowRightIcon className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            )}

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-zinc-900 rounded-xl hover:bg-zinc-100"
            >
              {mobileMenuOpen ? <XMarkIcon className="h-6 w-6" /> : <Bars3Icon className="h-6 w-6" />}
            </button>
          </div>
        </nav>
      </div>

      {/* MOBILE OVERLAY */}
      {mobileMenuOpen && (
        <div className="absolute top-full left-0 right-0 px-4 pt-3 md:hidden">
          <div className="bg-white border border-zinc-100 rounded-[32px] p-4 shadow-2xl space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-4 px-5 py-4 rounded-2xl text-base font-bold transition-all ${
                  isActive(link.href) ? 'bg-zinc-950 text-white shadow-xl shadow-zinc-200' : 'text-zinc-500 hover:bg-zinc-50'
                }`}
              >
                <link.icon className="w-5 h-5" />
                {link.label}
              </Link>
            ))}
            <div className="pt-2 border-t border-zinc-50">
              <button
                onClick={() => signOut()}
                className="w-full flex items-center justify-center gap-3 py-4 text-red-500 font-bold bg-red-50 rounded-2xl"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}