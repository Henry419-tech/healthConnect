// app/auth/signin/page.tsx
// Redirects to the landing page which hosts the sign-in panel.
// The `panel=signin` query param tells the landing page to open the sign-in
// slide-in automatically. The `callbackUrl` is preserved so the user lands
// back on their original destination after signing in.

import { redirect } from 'next/navigation'

interface Props {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>
}

export default async function SignInPage({ searchParams }: Props) {
  const { callbackUrl, error } = await searchParams
  const params = new URLSearchParams()
  params.set('panel', 'signin')
  if (callbackUrl) params.set('callbackUrl', callbackUrl)
  if (error)       params.set('error', error)

  redirect(`/?${params.toString()}`)
}