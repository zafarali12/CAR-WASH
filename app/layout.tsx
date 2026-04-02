// app/layout.tsx
import type { Metadata, Viewport } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import { Inter } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const viewport: Viewport = {
  themeColor: '#2563eb',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export const metadata: Metadata = {
  title: 'CarWash - Book Your Car Wash',
  description: 'Premium car wash booking at your doorstep',
  manifest: '/manifest.json?v=2.0',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'CarWash',
    startupImage: [
      { url: '/icon-512-512.png', media: '(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2)' }
    ],
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/icon-192-192.png', sizes: '192x192 1024x1024', type: 'image/png' },
      { url: '/icon-512-512.png', sizes: '512x512 1024x1024', type: 'image/png' },
    ],
    shortcut: '/icon-192-192.png',
    apple: [
      { url: '/icon-192-192.png', sizes: '1024x1024', type: 'image/png' },
    ],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={inter.className}>
          {children}
          <Toaster position="top-right" />
        </body>
      </html>
    </ClerkProvider>
  )
}
