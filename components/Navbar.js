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
    <header className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] ${
      isScrolled ? 'pt-4' : 'pt-0'
    }`}>
      <div className={`mx-auto transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] ${
        isScrolled ? 'max-w-[900px]' : 'max-w-[1800px]'
      } px-6`}>
        
        <nav className={`relative flex items-center justify-between transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] ${
          isScrolled 
            ? 'h-16 px-6 bg-white/70 backdrop-blur-2xl rounded-full border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.08)]' 
            : 'h-24 px-6 bg-transparent border-b border-transparent'
        }`}>
          
          {/* 1. BRAND - Magnetic Interaction */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative w-8 h-8 bg-black flex items-center justify-center transition-all duration-500 group-hover:rotate-[15deg]">
                <div className="absolute inset-0 bg-brand-green opacity-0 group-hover:opacity-100 blur-md transition-opacity" />
                <div className="relative w-2 h-2 bg-brand-green group-hover:bg-white transition-colors" />
              </div>
              <span className={`nike-display text-xl tracking-tighter transition-all duration-500 ${
                isScrolled ? 'scale-90 origin-left' : 'scale-100'
              }`}>
                VANTAGE<span className="text-brand-green">.</span>
              </span>
            </Link>
          </div>

          {/* 2. NAVIGATION - Voiceflow Pill Style */}
          <div className={`hidden md:flex items-center transition-all duration-500 p-1 ${
            isScrolled ? 'bg-zinc-100/50 rounded-full' : 'bg-transparent'
          }`}>
            {navLinks.map((link) => {
              const active = isActive(link.href)
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative px-4 py-2 text-[11px] font-black uppercase tracking-[0.2em] transition-all duration-300 rounded-full ${
                    active 
                      ? 'text-black' 
                      : 'text-zinc-400 hover:text-black'
                  }`}
                >
                  {/* Sliding Background Indicator */}
                  {active && (
                    <div className="absolute inset-0 bg-white rounded-full shadow-sm z-[-1] animate-in fade-in zoom-in-95 duration-300" />
                  )}
                  {link.label}
                </Link>
              )
            })}
          </div>

          {/* 3. IDENTITY - Compact & Precise */}
          <div className="flex items-center gap-4">
            {session ? (
              <div className="flex items-center gap-3">
                <div className={`hidden lg:flex flex-col items-end transition-opacity duration-500 ${isScrolled ? 'opacity-0 w-0' : 'opacity-100'}`}>
                  <span className="text-[10px] font-black text-brand-green uppercase tracking-widest italic leading-none">Verified</span>
                  <span className="text-sm font-bold text-black uppercase tracking-tight">{session.user?.name?.split(' ')[0]}</span>
                </div>
                <button
                  onClick={() => signOut()}
                  className={`flex items-center justify-center rounded-full bg-black text-white hover:bg-brand-green hover:text-black transition-all duration-500 ${
                    isScrolled ? 'w-10 h-10' : 'w-12 h-12'
                  }`}
                >
                  <PowerIcon className="w-5 h-5 stroke-[2.5]" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-6">
                <Link href="/login" className="text-[11px] font-black text-black uppercase tracking-widest hover:opacity-50">
                  Login
                </Link>
                <Link 
                  href="/signup" 
                  className={`nike-btn-primary flex items-center gap-2 transition-all duration-500 ${
                    isScrolled ? 'py-2 px-6' : 'py-3 px-8'
                  }`}
                >
                  Start <ArrowRightIcon className="w-4 h-4" />
                </Link>
              </div>
            )}

            {/* Mobile Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-black hover:bg-zinc-100 rounded-full transition-colors"
            >
              {mobileMenuOpen ? <XMarkIcon className="h-6 w-6" /> : <Bars3Icon className="h-6 w-6" />}
            </button>
          </div>
        </nav>
      </div>

      {/* MOBILE OVERLAY - Clean Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 top-0 bg-white z-[120] md:hidden p-8 flex flex-col animate-in slide-in-from-right duration-500">
          <div className="flex justify-between items-center mb-12">
            <span className="nike-display text-2xl">VANTAGE.</span>
            <button onClick={() => setMobileMenuOpen(false)} className="p-2 bg-black text-white rounded-full">
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
          <div className="flex flex-col gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`nike-display text-5xl tracking-tighter ${
                  isActive(link.href) ? 'text-brand-green italic' : 'text-zinc-200'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
          <div className="mt-auto">
            <button onClick={() => signOut()} className="nike-btn-primary w-full py-6 text-xl uppercase tracking-widest">
              Logout System
            </button>
          </div>
        </div>
      )}
    </header>
  )
}