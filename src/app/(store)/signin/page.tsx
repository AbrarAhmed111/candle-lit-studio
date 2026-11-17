import type { Metadata } from 'next'
import { Suspense } from 'react'
import AuthForm from '@/components/store/AuthForm'

export const metadata: Metadata = { title: 'Sign in' }

export default function SignInPage() {
  return (
    <Suspense>
      <AuthForm mode="signin" />
    </Suspense>
  )
}
