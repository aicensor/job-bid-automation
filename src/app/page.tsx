import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getSessionUser } from '@/lib/auth';

export default async function RootPage() {
  const user = await getSessionUser();

  if (!user) {
    // If there's a stale cookie, clear it to prevent redirect loops
    const cookieStore = await cookies();
    const hasToken = cookieStore.has('session');
    if (hasToken) {
      // Redirect to logout which clears the cookie via Route Handler
      redirect('/api/auth/logout?redirect=/login');
    }
    redirect('/login');
  }

  if (user.role === 'admin') redirect('/admin');
  redirect('/bidman');
}
