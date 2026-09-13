'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
    CreditCard, Plus, Receipt, Download, ArrowRight,ArrowLeft, FolderKanban, Paperclip, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { paymentsApi, projectsApi, pdfApi } from '@/lib/api';
import type { Payment, Project } from '@/types';
import { formatCRC, formatDate } from '@/types';
import { PageLoader, Modal, FormGroup, Spinner, EmptyState, MoneyInput } from '@/components/ui';
import { useSearchParams, useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';

export default function PaymentsPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const proyectoId = searchParams.get('proyecto');
  const [project, setProject] = useState<Project | null>(null);
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [paymentsData, setPaymentsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ monto: '', observaciones: '', comprobanteUrl: '' });
  const [saving, setSaving] = useState(false);
  const [receiptFilesPayment, setReceiptFilesPayment] = useState<Payment | null>(null);
  const [receiptFiles, setReceiptFiles] = useState<any[]>([]);
  const [loadingReceiptFiles, setLoadingReceiptFiles] = useState(false);
  const [uploadingReceiptFile, setUploadingReceiptFile] = useState(false);

    const load = async () => {
        if (!proyectoId) {
            try {
                const projects: Project[] = await projectsApi.list();
                setAllProjects(projects.filter((p) => p.sale));
            } finally {
                setLoading(false);
            }
            return;
        }

        try {
            const proj = await projectsApi.get(proyectoId);
            console.log("PROYECTO:", proj);
            console.log("SALE:", proj.sale);

            setProject(proj);

            if (proj.sale) {
                const payments = await paymentsApi.byProject(proyectoId);
                setPaymentsData(payments);
            } else {
                setPaymentsData({
                    resumen: null,
                    payments: [],
                });
            }
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

    const handleDelete = async (paymentId: string) => {
        if (!confirm('¿Desea eliminar este pago y su recibo?')) return;

        try {
            await paymentsApi.delete(paymentId);

            toast.success('Pago eliminado');

            load();
        } catch {
            toast.error('No se pudo eliminar el pago');
        }
    };

    const openReceiptFiles = async (payment: Payment) => {
        setReceiptFilesPayment(payment);
        setLoadingReceiptFiles(true);
        try {
            const files = await paymentsApi.listReceiptFiles(payment.id);
            setReceiptFiles(files);
        } catch {
            toast.error('No se pudo cargar el respaldo');
        } finally {
            setLoadingReceiptFiles(false);
        }
    };

    const handleUploadReceiptFile = async (file: File) => {
        if (!receiptFilesPayment) return;
        setUploadingReceiptFile(true);
        try {
            const uploaded = await paymentsApi.uploadReceiptFile(receiptFilesPayment.id, file);
            setReceiptFiles((prev) => [uploaded, ...prev]);
            toast.success('Imagen agregada');
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'No se pudo subir la imagen');
        } finally {
            setUploadingReceiptFile(false);
        }
    };

    const handleDeleteReceiptFile = async (fileId: string) => {
        try {
            await paymentsApi.deleteReceiptFile(fileId);
            setReceiptFiles((prev) => prev.filter((f) => f.id !== fileId));
            toast.success('Imagen eliminada');
        } catch {
            toast.error('No se pudo eliminar la imagen');
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
                    <tr
                      key={p.id}
                      onClick={() => router.push(`/pagos?proyecto=${p.id}`)}
                      className="cursor-pointer hover:bg-slate-50"
                    >
                      <td className="font-semibold text-slate-900" onClick={(e) => e.stopPropagation()}>
                        <Link href={`/proyectos/${p.id}`} className="hover:text-wood-600 flex items-center gap-2">
                          <FolderKanban size={14} className="text-wood-500" />
                          {p.nombreProyecto}
                        </Link>
                      </td>
                      <td>{p.client?.nombre || '—'}</td>
                      <td className="font-semibold">{p.sale ? formatCRC(p.sale.total) : '—'}</td>
                      <td onClick={(e) => e.stopPropagation()}>
                              <Link href={`/pagos?proyecto=${p.id}`}
                                  prefetch={false} className="btn-ghost btn-sm">
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
              <div className="space-y-2">
                  <Link
                      href="/pagos"
                      className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-wood-600 transition-colors"
                  >
                      <ArrowLeft size={15} />
                      Volver a proyectos con venta
                  </Link>

                  <h1 className="page-title">Pagos</h1>

                  {project && (
                      <Link
                          href={`/proyectos/${project.id}`}
                          className="text-sm text-wood-600 hover:underline"
                      >
                          {project.nombreProyecto}
                      </Link>
                  )}
              </div>

              {project && (
                  project.sale ? (
                      <button className="btn-primary" onClick={() => setShowCreate(true)}>
                          <Plus size={15} />
                          Registrar pago
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
                          <tr><th>Fecha</th><th>Monto</th><th>Observaciones</th><th>Recibo</th><th>Respaldo</th>
                              <th>Acciones</th></tr>
            </thead>
            <tbody>
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={6}>
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
                        <td>
                          <button className="btn-ghost btn-sm" onClick={() => openReceiptFiles(p)} title="Ver/agregar imágenes de respaldo">
                            <Paperclip size={13} /> {p._count?.receiptFiles ? p._count.receiptFiles : ''}
                          </button>
                        </td>
                        <td>
                            <button
                                className="btn-danger btn-sm"
                                onClick={() => handleDelete(p.id)}
                            >
                                <Trash2 size={14} />
                            </button>
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

      {receiptFilesPayment && (
        <Modal
          title={`Respaldo — pago ${formatCRC(receiptFilesPayment.monto)} (${formatDate(receiptFilesPayment.fechaPago)})`}
          onClose={() => setReceiptFilesPayment(null)}
          size="sm"
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-500">
              Imágenes de respaldo del comprobante (capturas o fotos que el cliente envió). Solo visible para administración; se guardan en un almacenamiento privado, independiente del recibo en PDF.
            </p>

            <label className="btn-secondary btn-sm w-full justify-center cursor-pointer">
              {uploadingReceiptFile ? <Spinner size="sm" /> : <><Paperclip size={14} /> Agregar imagen</>}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                className="hidden"
                disabled={uploadingReceiptFile}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUploadReceiptFile(file);
                  e.target.value = '';
                }}
              />
            </label>

            {loadingReceiptFiles ? (
              <div className="flex justify-center py-4"><Spinner /></div>
            ) : receiptFiles.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">Sin imágenes de respaldo todavía</p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {receiptFiles.map((f) => (
                  <div key={f.id} className="relative group">
                    <a href={f.url} target="_blank" rel="noopener noreferrer">
                      <img src={f.url} alt={f.nombreArchivo} className="w-full h-20 object-cover rounded border" />
                    </a>
                    <button
                      className="absolute -top-1.5 -right-1.5 bg-white border rounded-full p-0.5 text-danger shadow-sm"
                      onClick={() => handleDeleteReceiptFile(f.id)}
                      title="Eliminar imagen"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
