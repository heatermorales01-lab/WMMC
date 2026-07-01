'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FileText, ArrowRight, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { quotationsApi } from '@/lib/api';
import type { Quotation } from '@/types';
import { formatCRC, formatDate } from '@/types';
import { PageLoader, QuotationBadge, EmptyState, Confirm } from '@/components/ui';

export default function QuotationsPage() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = () => {
    quotationsApi.list().then(setQuotations).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await quotationsApi.delete(deleteId);
      toast.success('Cotización eliminada');
      setDeleteId(null);
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al eliminar cotización');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-5">
      <div className="page-header">
        <h1 className="page-title">Cotizaciones</h1>
      </div>
      <div className="card">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Versión</th>
                <th>Proyecto</th>
                <th>Cliente</th>
                <th>Estado</th>
                <th>Total</th>
                <th>Fecha</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {quotations.length === 0 ? (
                <tr><td colSpan={7}><EmptyState icon={<FileText size={24} />} title="Sin cotizaciones" /></td></tr>
              ) : (
                quotations.map((q) => (
                  <tr key={q.id}>
                    <td className="font-semibold">v{q.version}</td>
                    <td>{q.project?.nombreProyecto || '—'}</td>
                    <td>{q.project?.client?.nombre || '—'}</td>
                    <td><QuotationBadge status={q.estado} /></td>
                    <td className="font-semibold">{formatCRC(q.total)}</td>
                    <td>{formatDate(q.createdAt)}</td>
                    <td>
                      <div className="flex items-center gap-1">
                        <Link href={`/cotizaciones/${q.id}`} className="btn-ghost btn-sm">
                          Ver <ArrowRight size={12} />
                        </Link>
                        <button
                          className="btn-ghost btn-sm text-danger hover:bg-red-50"
                          onClick={() => setDeleteId(q.id)}
                          title="Eliminar cotización"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {deleteId && (
        <Confirm
          message="¿Eliminar esta cotización? Si está aprobada, también se eliminará su venta, pagos y recibos. Esta acción no se puede deshacer."
          onConfirm={handleDelete}
          onCancel={() => setDeleteId(null)}
          loading={deleting}
        />
      )}
    </div>
  );
}
