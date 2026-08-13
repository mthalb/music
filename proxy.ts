import { NextResponse } from 'next/server'

// Admin authorization is enforced by every /api/admin route. Keeping navigation
// unblocked avoids preview proxies dropping a newly-issued cookie mid-redirect;
// the dashboard redirects to login if its authenticated API request returns 401.
export default function proxy() {
  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
