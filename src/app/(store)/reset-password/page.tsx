import type { Metadata } from 'next'
import { ResetPasswordForm } from '@/components/store/PasswordForms'

export const metadata: Metadata = { title: 'Choose a new password', robots: { index: false } }

// Opened from the reset email, after /auth/callback has signed the visitor in
export default function ResetPasswordPage() {
  return <ResetPasswordForm />
}
