import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'FaceFinder - Find Anyone in Seconds',
  description: 'Upload a face, paste a dataset link, and let AI do the work',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="font-sans">{children}</body>
    </html>
  )
}
