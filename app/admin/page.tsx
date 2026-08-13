import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyToken, AdminPayload, ADMIN_COOKIE } from '@/lib/session'
import AdminDashboard from '@/components/admin-dashboard'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get(ADMIN_COOKIE)?.value
  const session = verifyToken<AdminPayload>(token)

  if (!session) {
    redirect('/admin/login')
  }

  return <AdminDashboard />
}
