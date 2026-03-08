// app/auth/signup/page.tsx
// Redirects to the landing page which hosts the sign-up panel.

import { redirect } from 'next/navigation'

export default function SignUpPage() {
  redirect('/?panel=signup')
}