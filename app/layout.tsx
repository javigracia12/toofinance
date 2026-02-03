import type { Metadata } from 'next'
import './globals.css'
import { AuthGuard } from './AuthGuard'

export const metadata: Metadata = {
  title: 'Expenses',
  description: 'Track your expenses',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <AuthGuard>{children}</AuthGuard>
      </body>
    </html>
  )
}
