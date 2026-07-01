'use client';
import { useParams } from 'next/navigation';
import ClientDetailPage from '@/components/pages/clientes/ClientDetailPage';
export default function Page() {
  const params = useParams();
  return <ClientDetailPage id={params.id as string} />;
}
