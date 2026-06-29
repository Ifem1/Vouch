import type { Metadata } from 'next'
import { Space_Grotesk, Geist, IBM_Plex_Mono } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'
import { AppShell } from '@/components/layout/app-shell'

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
})

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-geist-sans',
})

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-ibm-plex-mono',
})

export const metadata: Metadata = {
  title: 'Vouch — GEN-Backed Reputation',
  description:
    'Vouch is a GEN-backed reputation bond protocol. Create focused capability capsules, bond GEN, receive endorsements, face evidence-based challenges, and let GenLayer judge whether your reputation claim holds.',
  keywords: ['GenLayer', 'reputation', 'bond', 'GEN', 'capsule', 'on-chain', 'trust', 'StudioNet'],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${geist.variable} ${ibmPlexMono.variable}`}>
      <body className="min-h-screen bg-[var(--vault-black)] text-[var(--paper-white)] antialiased">
        <AppShell>{children}</AppShell>
        <Toaster theme="dark" position="bottom-right" />
      </body>
    </html>
  )
}
