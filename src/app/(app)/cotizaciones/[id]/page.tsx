'use client';
import { useParams } from 'next/navigation';
import QuotationDetailPage from '@/components/pages/cotizaciones/QuotationDetailPage';
export default function Page() {
  const params = useParams();
  return <QuotationDetailPage id={params.id as string} />;
}
