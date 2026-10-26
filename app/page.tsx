import { Suspense } from 'react';
import { connection } from 'next/server';
import OwedApp from '@/components/owed-app';

// Read configuration per request, so a deploy picks up env changes without a rebuild.
async function ConfiguredApp() {
  await connection();
  return (
    <OwedApp
      licenseKey={process.env.AG_STUDIO_LICENSE_KEY}
      aiEnabled={!!process.env.ANTHROPIC_API_KEY}
      briefEnabled={!!process.env.ANTHROPIC_API_KEY}
    />
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="grid h-dvh place-items-center bg-[#0b1f33] text-white">owed</div>}>
      <ConfiguredApp />
    </Suspense>
  );
}
