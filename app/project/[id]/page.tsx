'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import DashboardShell from '@/components/DashboardShell';
import ProjectWorkspace from '@/components/ProjectWorkspace';
import NewProject from '@/components/NewProject';
import AnimatedLogo from '@/components/AnimatedLogo';
import type { ProjectData } from '@/lib/project-types';

export default function ProjectPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  const [project, setProject] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/landing');
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== 'authenticated' || !projectId) return;

    const fetchProject = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/projects/${projectId}`);
        if (!res.ok) {
          if (res.status === 404) {
            setError('Проект не найден');
          } else {
            setError(`Ошибка загрузки: HTTP ${res.status}`);
          }
          return;
        }
        const data = await res.json();
        setProject(data);
      } catch {
        setError('Ошибка сети');
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [status, projectId]);

  if (status === 'loading' || loading) {
    return (
      <DashboardShell title="Загрузка...">
        <div className="flex flex-col items-center justify-center py-20">
          <AnimatedLogo size={64} inline />
          <p className="text-white/40 text-sm mt-4">Загружаем проект...</p>
        </div>
      </DashboardShell>
    );
  }

  if (error) {
    return (
      <DashboardShell title="Ошибка">
        <div className="max-w-lg mx-auto glass-card p-10 text-center">
          <div className="text-3xl mb-3">⚠️</div>
          <p className="text-red-400 text-sm mb-4">{error}</p>
          <button onClick={() => router.push('/dashboard')} className="btn-primary text-sm px-6">
            На главную
          </button>
        </div>
      </DashboardShell>
    );
  }

  if (!project) return null;

  const isCompleted = project.status === 'completed';

  return (
    <DashboardShell title={project.title || 'Проект'}>
      {isCompleted ? (
        <ProjectWorkspace project={project} />
      ) : (
        <NewProject initialProject={project} />
      )}
    </DashboardShell>
  );
}
