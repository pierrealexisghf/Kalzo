'use client'

import { AppProvider } from '@/lib/AppContext'
import AppShell from '@/components/layout/AppShell'

export default function Home() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  )
}
