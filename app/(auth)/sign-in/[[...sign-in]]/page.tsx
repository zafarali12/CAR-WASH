// app/auth/sign-in/[[...sign-in]]/page.tsx
import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🚗</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">CarWash</h1>
          <p className="text-gray-400 text-sm mt-1">Book your car wash in minutes</p>
        </div>
        <SignIn
          path="/sign-in"
          routing="path"
          appearance={{
            elements: {
              rootBox: 'w-full',
              card: 'shadow-sm border border-gray-100 rounded-2xl',
              headerTitle: 'hidden',
              headerSubtitle: 'hidden',
            }
          }}
        />
      </div>
    </div>
  )
}
