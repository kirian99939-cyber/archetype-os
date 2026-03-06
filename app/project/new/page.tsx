'use client';

import { Suspense, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import DashboardShell from '@/components/DashboardShell';
import NewProject from '@/components/NewProject';

export default function NewProjectPage() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/landing');
    }
  }, [status, router]);

  return (
    <DashboardShell activePage="new-project" title="Новый проект">
      <Suspense fallback={<p className="text-white/40 text-sm">Загрузка...</p>}>
        <NewProject />
      </Suspense>
    </DashboardShell>
  );
}
