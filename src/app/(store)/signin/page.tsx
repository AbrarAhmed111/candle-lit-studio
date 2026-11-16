import type { Metadata } from 'next'
import AuthForm from '@/components/store/AuthForm'

export const metadata: Metadata = { title: 'Sign in' }

export default function SignInPage() {
  return <AuthForm mode="signin" />
}
