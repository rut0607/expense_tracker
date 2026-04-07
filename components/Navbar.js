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
  XMarkIcon,
} from '@heroicons/react/24/outline'

export default function Navbar() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const [isScrolled, setIsScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 24)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const isActive = (path) => (path === '/' ? pathname === '/' : pathname.startsWith(path))

  if (pathname === '/login' || pathname === '/signup') return null

  const navLinks = [
    { href: '/', label: 'Dashboard', icon: Squares2X2Icon },
    { href: '/analytics', label: 'Analytics', icon: ChartBarIcon },
    { href: '/budgets', label: 'Budgets', icon: BanknotesIcon },
    { href: '/history', label: 'History', icon: ClockIcon },
    { href: '/settings', label: 'Settings', icon: Cog6ToothIcon },
  ]

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-500 ease-out pointer-events-none ${
          isScrolled ? 'pt-4' : 'pt-0 bg-[#050505]/50 backdrop-blur-md border-b border-white/5'
        }`}
      >
        <div
          className={`mx-auto flex items-center justify-between transition-all duration-500 ${
            isScrolled ? 'max-w-5xl px-4' : 'max-w-7xl px-6 lg:px-8 h-20'
          }`}
        >
          {/* ── ISLAND 1: BRAND ───────────────────────────────────────── */}
          <div
            className={`pointer-events-auto flex items-center transition-all duration-500 ${
              isScrolled
                ? 'h-12 px-5 bg-[#0a0a0a]/80 backdrop-blur-xl border border-white/10 rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.5)]'
                : 'h-auto px-0 bg-transparent border-transparent'
            }`}
          >
            <Link href="/" className="flex items-center gap-2 group shrink-0">
              <div className="relative w-6 h-6 flex items-center justify-center">
                <div className="absolute inset-0 rounded bg-orange-500/10 group-hover:bg-orange-500/20 transition-colors duration-300" />
                <div className="w-2 h-2 rounded-[2px] bg-orange-500 group-hover:rotate-45 transition-transform duration-500" />
              </div>
              <span className="text-sm font-semibold tracking-wide text-white">
                Vantage<span className="text-orange-500">.</span>
              </span>
            </Link>
          </div>

          {/* ── ISLAND 2: NAV LINKS (desktop) ─────────────────────────── */}
          <div
            className={`pointer-events-auto hidden md:flex items-center transition-all duration-500 ${
              isScrolled
                ? 'h-12 px-2 bg-[#0a0a0a]/80 backdrop-blur-xl border border-white/10 rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.5)]'
                : 'h-auto px-0 bg-transparent border-transparent'
            }`}
          >
            <nav className="flex items-center gap-1">
              {navLinks.map((link) => {
                const active = isActive(link.href)
                const Icon = link.icon
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`relative flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-medium transition-all duration-300 group overflow-hidden ${
                      active ? 'text-white' : 'text-neutral-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-colors duration-300 ${
                        active ? 'text-orange-400' : 'text-neutral-500 group-hover:text-neutral-300'
                      }`}
                    />
                    {link.label}

                    {/* Active Neon Horizon Underline */}
                    {active && (
                      <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-[2px] bg-orange-500 rounded-t-full shadow-[0_0_8px_rgba(249,115,22,0.8)]" />
                    )}
                  </Link>
                )
              })}
            </nav>
          </div>

          {/* ── ISLAND 3: USER / AUTH ─────────────────────────────────── */}
          <div
            className={`pointer-events-auto flex items-center transition-all duration-500 ${
              isScrolled
                ? 'h-12 px-2 pl-3 bg-[#0a0a0a]/80 backdrop-blur-xl border border-white/10 rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.5)]'
                : 'h-auto px-0 bg-transparent border-transparent'
            }`}
          >
            <div className="flex items-center gap-3">
              {session ? (
                <div className="flex items-center gap-1.5">
                  <div className="flex items-center gap-2.5 px-2">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center text-[11px] font-bold text-white shrink-0 shadow-inner">
                      {session.user?.name?.charAt(0).toUpperCase()}
                    </div>
                    {/* Hides name seamlessly when scrolled */}
                    <span
                      className={`text-[13px] font-medium text-neutral-300 whitespace-nowrap transition-all duration-300 origin-left hidden sm:block ${
                        isScrolled ? 'w-0 opacity-0 scale-x-0' : 'w-auto opacity-100 scale-x-100 pr-2'
                      }`}
                    >
                      {session.user?.name?.split(' ')[0]}
                    </span>
                  </div>

                  <div className={`w-[1px] h-4 bg-white/10 hidden sm:block transition-opacity duration-300 ${isScrolled ? 'opacity-0' : 'opacity-100'}`} />

                  <button
                    onClick={() => signOut()}
                    title="Sign out"
                    className="w-8 h-8 flex items-center justify-center rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-all duration-200"
                  >
                    <PowerIcon className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link
                    href="/login"
                    className="text-[13px] font-medium text-neutral-400 hover:text-white px-3 py-2 transition-colors"
                  >
                    Log in
                  </Link>
                  <Link
                    href="/signup"
                    className="flex items-center gap-1.5 bg-white text-black hover:bg-neutral-200 text-[13px] font-medium px-4 py-2 rounded-full transition-all duration-200"
                  >
                    Get started <ArrowRightIcon className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )}

              {/* Mobile Hamburger (Inside right island) */}
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="md:hidden w-8 h-8 mr-1 flex items-center justify-center rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-all duration-200"
              >
                <Bars3Icon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── MOBILE DRAWER ───────────────────────────────────────────────── */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[200] md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Drawer panel */}
          <div className="absolute right-0 top-0 bottom-0 w-72 bg-[#050505] border-l border-white/5 flex flex-col p-6 shadow-2xl animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <span className="text-sm font-semibold tracking-wide text-white">
                Vantage<span className="text-orange-500">.</span>
              </span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 text-neutral-400 hover:text-white transition-colors"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>

            {/* Links */}
            <nav className="flex flex-col gap-2">
              {navLinks.map((link) => {
                const active = isActive(link.href)
                const Icon = link.icon
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`relative flex items-center gap-3 px-4 py-3.5 rounded-xl text-[14px] font-medium transition-all duration-200 overflow-hidden ${
                      active
                        ? 'bg-white/5 text-white'
                        : 'text-neutral-400 hover:bg-white/5 hover:text-neutral-200'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-orange-400' : 'text-neutral-500'}`} />
                    {link.label}
                    {active && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-1/2 bg-orange-500 rounded-r-full shadow-[0_0_8px_rgba(249,115,22,0.8)]" />
                    )}
                  </Link>
                )
              })}
            </nav>

            {/* Footer */}
            <div className="mt-auto pt-6 border-t border-white/5">
              {session ? (
                <>
                  <div className="flex items-center gap-3 px-2 mb-4">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center text-sm font-medium text-white shrink-0">
                      {session.user?.name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex flex-col overflow-hidden">
                      <span className="text-[14px] font-medium text-white truncate">
                        {session.user?.name}
                      </span>
                      <span className="text-[12px] text-neutral-500 truncate">
                        {session.user?.email}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => signOut()}
                    className="w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-red-500/10 text-neutral-400 hover:text-red-400 text-[14px] font-medium py-3 rounded-xl transition-all duration-200"
                  >
                    <PowerIcon className="w-4 h-4" />
                    Sign out
                  </button>
                </>
              ) : (
                <div className="flex flex-col gap-3">
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full flex items-center justify-center py-3 text-[14px] font-medium text-white bg-white/5 hover:bg-white/10 rounded-xl transition-colors"
                  >
                    Log in
                  </Link>
                  <Link
                    href="/signup"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full flex items-center justify-center py-3 text-[14px] font-medium text-black bg-white hover:bg-neutral-200 rounded-xl transition-colors"
                  >
                    Get started
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}