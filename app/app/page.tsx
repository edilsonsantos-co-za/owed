import { Suspense } from 'react';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { connection } from 'next/server';
import OwedApp from '@/components/owed-app';
import { SESSION_COOKIE, isAdmin, readSession } from '@/lib/auth';

export const metadata: Metadata = { title: 'Owed · Dashboard' };

// Read configuration per request, so a deploy picks up env changes without a rebuild.
async function ConfiguredApp() {
  await connection();
  const user = await readSession((await cookies()).get(SESSION_COOKIE)?.value);
  return (
    <OwedApp
      licenseKey={process.env.AG_STUDIO_LICENSE_KEY}
      aiEnabled={!!process.env.ANTHROPIC_API_KEY}
      briefEnabled={!!process.env.ANTHROPIC_API_KEY}
      user={user && { id: user.sub, name: user.name, email: user.email, admin: isAdmin(user) }}
    />
  );
}

export default function Dashboard() {
  return (
    <Suspense fallback={<div className="h-dvh bg-canvas" />}>
      <ConfiguredApp />
    </Suspense>
  );
}
