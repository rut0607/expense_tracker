import './globals.css'
import { AuthProvider } from './providers/AuthProvider'

export const metadata = {
  title: 'Daily Expense Tracker',
  description: 'Track your daily expenses',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}