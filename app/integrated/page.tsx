'use client'

import Link from 'next/link'

export default function IntegratedPage() {
  return (
    <main className="min-h-screen bg-neutral-50 flex items-center justify-center px-6">
      <div className="max-w-xl rounded-2xl border border-neutral-200 bg-white p-8 text-center shadow-soft space-y-4">
        <h1 className="text-2xl font-extrabold text-neutral-900">FaceFinder Integrated Route</h1>
        <p className="text-neutral-600">
          The primary frontend flow has been migrated to the new FastAPI <strong>/process</strong> backend.
        </p>
        <Link href="/" className="inline-flex items-center justify-center px-5 py-3 rounded-xl bg-primary-600 text-white font-semibold hover:bg-primary-700">
          Go to Main Search Flow
        </Link>
      </div>
    </main>
  )
}
