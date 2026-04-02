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
  manifest: '/manifest.json?v=1.2',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'CarWash',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/icon-192-192.jpg', sizes: '1024x1024', type: 'image/jpeg' },
      { url: '/icon-512-512.jpg', sizes: '1024x1024', type: 'image/jpeg' },
    ],
    apple: [
      { url: '/icon-192-192.jpg', sizes: '1024x1024', type: 'image/jpeg' },
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
