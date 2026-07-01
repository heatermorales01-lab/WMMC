'use client';
import { useParams } from 'next/navigation';
import ProjectDetailPage from '@/components/pages/proyectos/ProjectDetailPage';
export default function Page() {
  const params = useParams();
  return <ProjectDetailPage id={params.id as string} />;
}
