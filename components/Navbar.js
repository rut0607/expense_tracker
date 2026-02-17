'use client'

import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Navbar() {
  const { data: session } = useSession()
  const pathname = usePathname()

  const isActive = (path) => pathname === path

  return (
    <nav className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="text-xl font-bold text-blue-600">
              ExpenseTracker
            </Link>
          </div>
          
          {session && (
            <div className="flex items-center space-x-4">
              <Link
                href="/"
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  isActive('/') 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-gray-700 hover:text-blue-600'
                }`}
              >
                Today
              </Link>
              
              <Link
                href="/history"
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  isActive('/history') 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-gray-700 hover:text-blue-600'
                }`}
              >
                History
              </Link>
              
              <Link
                href="/settings"
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  isActive('/settings') 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-gray-700 hover:text-blue-600'
                }`}
              >
                Settings
              </Link>
              
              <div className="border-l h-8 mx-2 border-gray-300"></div>
              
              <span className="text-sm text-gray-600">
                {session.user.name || session.user.email}
              </span>
              
              <button
                onClick={() => signOut()}
                className="bg-red-500 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-600 transition"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}