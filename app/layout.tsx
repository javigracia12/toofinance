import type { Metadata } from 'next'
import './globals.css'
import { AuthGuard } from './AuthGuard'

export const metadata: Metadata = {
  title: 'Valora',
  description: 'Track expenses and net worth in one place.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark');else document.documentElement.classList.remove('dark');})();`,
          }}
        />
      </head>
      <body>
        <AuthGuard>{children}</AuthGuard>
      </body>
    </html>
  )
}
