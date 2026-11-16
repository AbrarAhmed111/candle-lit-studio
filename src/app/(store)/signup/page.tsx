import type { Metadata } from 'next'
import AuthForm from '@/components/store/AuthForm'

export const metadata: Metadata = { title: 'Create an account' }

export default function SignUpPage() {
  return <AuthForm mode="signup" />
}
