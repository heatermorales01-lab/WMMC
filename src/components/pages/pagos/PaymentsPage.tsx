'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CreditCard, Plus, Receipt, Download, ArrowRight, FolderKanban } from 'lucide-react';
import toast from 'react-hot-toast';
import { paymentsApi, projectsApi, pdfApi } from '@/lib/api';
import type { Payment, Project } from '@/types';
import { formatCRC, formatDate } from '@/types';
import { PageLoader, Modal, FormGroup, Spinner, EmptyState, MoneyInput } from '@/components/ui';

export default function PaymentsPage() {
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const proyectoId = searchParams.get('proyecto');
  const [project, setProject] = useState<Project | null>(null);
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [paymentsData, setPaymentsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ monto: '', observaciones: '', comprobanteUrl: '' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!proyectoId) {
      try {
        const projects: Project[] = await projectsApi.list();
        // Solo proyectos con venta activa (donde puede haber pagos)
        setAllProjects(projects.filter((p) => p.sale));
      } finally {
        setLoading(false);
      }
      return;
    }
    try {
      const [proj, payments] = await Promise.all([
        projectsApi.get(proyectoId),
        paymentsApi.byProject(proyectoId),
      ]);
      setProject(proj);
      setPaymentsData(payments);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [proyectoId]);

  const handleCreate = async () => {
    if (!form.monto) { toast.error('El monto es requerido'); return; }
    if (!form.comprobanteUrl) { toast.error('El comprobante es obligatorio (RN09)'); return; }
    setSaving(true);
    try {
      await paymentsApi.create({ projectId: proyectoId, ...form, monto: Number(form.monto) });
      toast.success('Pago registrado');
      setShowCreate(false);
      setForm({ monto: '', observaciones: '', comprobanteUrl: '' });
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al registrar pago');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageLoader />;

  if (!proyectoId) {
    return (
      <div className="space-y-5">
        <div className="page-header">
          <h1 className="page-title">Pagos</h1>
        </div>
        <p className="text-sm text-slate-500">
          Seleccioná un proyecto con venta activa para ver y registrar sus pagos.
        </p>
        <div className="card">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Proyecto</th><th>Cliente</th><th>Total venta</th><th></th></tr>
              </thead>
              <tbody>
                {allProjects.length === 0 ? (
                  <tr><td colSpan={4}>
                    <EmptyState
                      icon={<CreditCard size={24} />}
                      title="Sin proyectos con venta"
                      description="Los pagos aparecen aquí una vez que una cotización se aprueba y genera una venta"
                    />
                  </td></tr>
                ) : (
                  allProjects.map((p) => (
                    <tr key={p.id}>
                      <td className="font-semibold text-slate-900">
                        <Link href={`/proyectos/${p.id}`} className="hover:text-wood-600 flex items-center gap-2">
                          <FolderKanban size={14} className="text-wood-500" />
                          {p.nombreProyecto}
                        </Link>
                      </td>
                      <td>{p.client?.nombre || '—'}</td>
                      <td className="font-semibold">{p.sale ? formatCRC(p.sale.total) : '—'}</td>
                      <td>
                        <Link href={`/pagos?proyecto=${p.id}`} className="btn-ghost btn-sm">
                          Ver pagos <ArrowRight size={12} />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  const resumen = paymentsData?.resumen;
  const payments: Payment[] = paymentsData?.payments || [];

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="page-header">
        <div>
          <h1 className="page-title">Pagos</h1>
          {project && (
            <Link href={`/proyectos/${project.id}`} className="text-sm text-wood-600 hover:underline">
              ← {project.nombreProyecto}
            </Link>
          )}
        </div>
        {project && (
          project.sale ? (
            <button className="btn-primary" onClick={() => setShowCreate(true)}>
              <Plus size={15} /> Registrar pago
            </button>
          ) : (
            <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Este proyecto no tiene una venta activa (la cotización debe estar APROBADA) — no se pueden registrar pagos.
            </span>
          )
        )}
      </div>

      {/* Resumen financiero */}
      {resumen && (
        <div className="grid grid-cols-3 gap-4">
          <div className="card card-body text-center">
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Total venta</p>
            <p className="text-xl font-bold text-slate-900">{formatCRC(resumen.totalVenta)}</p>
          </div>
          <div className="card card-body text-center">
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Pagado</p>
            <p className="text-xl font-bold text-green-600">{formatCRC(resumen.totalPagado)}</p>
          </div>
          <div className="card card-body text-center">
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Saldo</p>
            <p className={`text-xl font-bold ${resumen.saldo > 0 ? 'text-danger' : 'text-slate-900'}`}>
              {formatCRC(resumen.saldo)}
            </p>
          </div>
        </div>
      )}

      {/* Lista de pagos */}
      <div className="card">
        <div className="card-header">
          <h2 className="font-display font-bold text-slate-900 flex items-center gap-2">
            <CreditCard size={17} className="text-wood-500" /> Historial de pagos
          </h2>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Fecha</th><th>Monto</th><th>Observaciones</th><th>Recibo</th></tr>
            </thead>
            <tbody>
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={4}>
                    <EmptyState icon={<CreditCard size={24} />} title="Sin pagos registrados" />
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id}>
                    <td>{formatDate(p.fechaPago)}</td>
                    <td className="font-bold text-slate-900">{formatCRC(p.monto)}</td>
                    <td className="text-slate-500">{p.observaciones || '—'}</td>
                    <td>
                      {p.receipt ? (
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1 text-green-600 text-xs font-semibold">
                            <Receipt size={13} /> {p.receipt.numeroRecibo}
                          </span>
                          <button
                            className="btn-ghost btn-sm p-1"
                            title="Descargar recibo PDF"
                            onClick={() => pdfApi.downloadReceipt(p.id, `Recibo-${p.receipt!.numeroRecibo}.pdf`)
                              .catch(() => toast.error('Error al generar recibo'))}
                          >
                            <Download size={13} />
                          </button>
                        </div>
                      ) : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal registrar pago */}
      {showCreate && (
        <Modal title="Registrar pago" onClose={() => setShowCreate(false)} size="sm">
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
              RN09: Todo pago requiere comprobante de transferencia.
            </div>
            <FormGroup label="Monto (₡)" required>
              <MoneyInput value={form.monto} onChange={(v) => setForm((p) => ({ ...p, monto: v }))}
                placeholder="500000" />
            </FormGroup>
            <FormGroup label="URL o número de comprobante" required>
              <input className="input" value={form.comprobanteUrl}
                onChange={(e) => setForm((p) => ({ ...p, comprobanteUrl: e.target.value }))}
                placeholder="Número de transferencia o enlace" />
            </FormGroup>
            <FormGroup label="Observaciones">
              <textarea className="input h-20 resize-none" value={form.observaciones}
                onChange={(e) => setForm((p) => ({ ...p, observaciones: e.target.value }))} />
            </FormGroup>
            <div className="flex justify-end gap-2">
              <button className="btn-secondary" onClick={() => setShowCreate(false)}>Cancelar</button>
              <button className="btn-primary" onClick={handleCreate} disabled={saving}>
                {saving ? <Spinner size="sm" /> : 'Registrar pago'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
