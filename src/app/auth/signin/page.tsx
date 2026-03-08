// app/auth/signin/page.tsx
// Redirects to the landing page which hosts the sign-in panel.
// The `panel=signin` query param tells the landing page to open the sign-in
// slide-in automatically. The `callbackUrl` is preserved so the user lands
// back on their original destination after signing in.

import { redirect } from 'next/navigation'

interface Props {
  searchParams: { callbackUrl?: string; error?: string }
}

export default function SignInPage({ searchParams }: Props) {
  const params = new URLSearchParams()
  params.set('panel', 'signin')
  if (searchParams.callbackUrl) params.set('callbackUrl', searchParams.callbackUrl)
  if (searchParams.error)       params.set('error', searchParams.error)

  redirect(`/?${params.toString()}`)
}