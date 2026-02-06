'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui', padding: 40, maxWidth: 600 }}>
        <h1 style={{ fontSize: 24, marginBottom: 16 }}>Something went wrong</h1>
        <p style={{ color: '#71717a', marginBottom: 24 }}>{error.message}</p>
        <button
          onClick={() => reset()}
          style={{
            padding: '10px 20px',
            background: '#18181b',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
          }}
        >
          Try again
        </button>
      </body>
    </html>
  )
}
