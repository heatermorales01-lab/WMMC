'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  ArrowLeft, Plus, FileText, CreditCard, Package,
  CheckCircle2, Circle, Clock, ChevronRight, MapPin,
    Calendar, Paperclip, Trash2, Pencil, Save, X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { projectsApi, quotationsApi } from '@/lib/api';
import type { Project, Quotation, ProductionStage, StageStatus } from '@/types';
import { formatDate, formatCRC } from '@/types';
import { PageLoader, ProjectBadge, QuotationBadge, Spinner, Confirm } from '@/components/ui';
import { useAuthStore } from '@/store/auth.store';
import ProjectFiles from '@/components/ProjectFiles';
import PaymentSchedulePanel from '@/components/PaymentSchedulePanel';

type Tab = 'cotizaciones' | 'produccion' | 'pagos' | 'archivos';

const PROJECT_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'COTIZACION',  label: 'Cotización' },
  { value: 'APROBADO',    label: 'Aprobado' },
  { value: 'PRODUCCION',  label: 'En Producción' },
  { value: 'INSTALACION', label: 'En Instalación' },
  { value: 'FINALIZADO',  label: 'Finalizado' },
  { value: 'CANCELADO',   label: 'Cancelado' },
];

const STAGE_ICON: Record<StageStatus, typeof Circle> = {
  PENDIENTE:   Circle,
  EN_PROCESO:  Clock,
  COMPLETADO:  CheckCircle2,
};
const STAGE_COLOR: Record<StageStatus, string> = {
  PENDIENTE:  'text-slate-300',
  EN_PROCESO: 'text-amber-500',
  COMPLETADO: 'text-green-500',
};

export default function ProjectDetailPage({ id }: { id: string }) {
  const router = useRouter();
    const [project, setProject] = useState<Project | null>(null);
    const [editingDate, setEditingDate] = useState(false);
    const [installationDate, setInstallationDate] = useState('');
    const [savingDate, setSavingDate] = useState(false);

  const [loading, setLoading]               = useState(true);
  const [tab, setTab]                       = useState<Tab | null>(null);
  const [creatingQuotation, setCreating]    = useState(false);
  const [updatingStage, setUpdatingStage]   = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { isAdmin, isTrabajador } = useAuthStore();

  const load = async () => {
      try {
        const data = await projectsApi.get(id!);

        setProject(data);
        setInstallationDate(
            data.fechaInstalacionTentativa
                ? data.fechaInstalacionTentativa.split('T')[0]
                : ''
        );

    } catch {
      toast.error('Proyecto no encontrado');
      router.push('/proyectos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const handleNewQuotation = async () => {
    setCreating(true);
    try {
      const q = await quotationsApi.create(id!);
      toast.success('Cotización creada');
      router.push(`/cotizaciones/${q.id}`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al crear cotización');
    } finally {
      setCreating(false);
    }
  };

  const handleStatusChange = async (estado: string) => {
    if (!project || estado === project.estado) return;
    setUpdatingStatus(true);
    try {
      await projectsApi.updateStatus(project.id, estado);
      toast.success('Estado del proyecto actualizado');
      await load();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al actualizar estado');
    } finally {
      setUpdatingStatus(false);
    }
    };

    const saveInstallationDate = async () => {
        if (!project) return;

        setSavingDate(true);

        try {
            await projectsApi.update(project.id, {
                nombreProyecto: project.nombreProyecto,
                ubicacion: project.ubicacion,
                descripcion: project.descripcion,
                fechaInstalacionTentativa: installationDate,
            });

            toast.success('Fecha actualizada');

            setEditingDate(false);

            await load();
        } catch {
            toast.error('No fue posible actualizar la fecha');
        } finally {
            setSavingDate(false);
        }
    };

  const handleDeleteProject = async () => {
    setDeleting(true);
    try {
      await projectsApi.delete(project!.id);
      toast.success('Proyecto eliminado');
      router.push(`/clientes/${project!.clientId}`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al eliminar proyecto');
    } finally {
      setDeleting(false);
    }
  };

  const cycleStage = async (stage: ProductionStage) => {
    const cycle: Record<StageStatus, StageStatus> = {
      PENDIENTE: 'EN_PROCESO', EN_PROCESO: 'COMPLETADO', COMPLETADO: 'PENDIENTE',
    };
    const next = cycle[stage.estado];
    setUpdatingStage(stage.id);
    try {
      await projectsApi.updateStage(id!, stage.id, {
        estado: next,
        fechaInicio: next === 'EN_PROCESO' ? new Date().toISOString().split('T')[0] : undefined,
        fechaFin:    next === 'COMPLETADO' ? new Date().toISOString().split('T')[0] : undefined,
      });
      await load();
    } catch {
      toast.error('Error al actualizar etapa');
    } finally {
      setUpdatingStage(null);
    }
  };

  if (loading) return <PageLoader />;
  if (!project) return null;

  const allTabs: { id: Tab; label: string; icon: typeof FileText; restricted?: boolean }[] = [
    { id: 'cotizaciones', label: 'Cotizaciones', icon: FileText,   restricted: true },
    { id: 'produccion',   label: 'Producción',   icon: Package   },
    { id: 'pagos',        label: 'Pagos',         icon: CreditCard, restricted: true },
    { id: 'archivos',     label: 'Archivos',      icon: Paperclip },
  ];
  const TABS = allTabs.filter((t) => !(isTrabajador && t.restricted));
  const activeTab: Tab = tab && TABS.some((t) => t.id === tab) ? tab : TABS[0].id;

  const totalVenta = project.sale ? Number(project.sale.total) : undefined;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link href="/proyectos" className="btn-ghost btn-sm mt-1"><ArrowLeft size={14} /></Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="page-title mb-0">{project.nombreProyecto}</h1>
            <ProjectBadge status={project.estado} />
            <div className="relative">
              <select
                className="input py-1 text-xs pr-7 cursor-pointer"
                value={project.estado}
                disabled={updatingStatus}
                onChange={(e) => handleStatusChange(e.target.value)}
              >
                {PROJECT_STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
              {updatingStatus && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2"><Spinner size="sm" /></div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4 mt-1 text-sm text-slate-500 flex-wrap">
            <Link href={`/clientes/${project.clientId}`} className="hover:text-wood-600">
              {project.client?.nombre}
            </Link>
            {project.ubicacion && (
              <span className="flex items-center gap-1"><MapPin size={13} />{project.ubicacion}</span>
            )}
                      <div className="flex items-center gap-2">

                          <Calendar size={13} />

                          {!editingDate ? (
                              <>
                                  <span>
                                      {project.fechaInstalacionTentativa
                                          ? formatDate(project.fechaInstalacionTentativa)
                                          : 'Sin definir'}
                                  </span>

                                  {isAdmin && (
                                      <button
                                          onClick={() => setEditingDate(true)}
                                          className="text-wood-600 hover:text-wood-700"
                                      >
                                          <Pencil size={14} />
                                      </button>
                                  )}
                              </>
                          ) : (
                              <>
                                  <input
                                      type="date"
                                      value={installationDate}
                                      onChange={(e) => setInstallationDate(e.target.value)}
                                      className="input h-8 py-1 text-xs w-40"
                                  />

                                  <button
                                      onClick={saveInstallationDate}
                                      disabled={savingDate}
                                      className="text-green-600 hover:text-green-700"
                                  >
                                      {savingDate
                                          ? <Spinner size="sm" />
                                          : <Save size={15} />
                                      }
                                  </button>

                                  <button
                                      onClick={() => setEditingDate(false)}
                                      className="text-red-500 hover:text-red-600"
                                  >
                                      <X size={15} />
                                  </button>
                              </>
                          )}

                      </div>
          </div>
        </div>
        {isAdmin && (
          <button
            className="btn-ghost text-danger hover:bg-red-50 mt-1"
            onClick={() => setConfirmDelete(true)}
            title="Eliminar proyecto"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {/* Banner venta */}
      {project.sale && !isTrabajador && (
        <div className="bg-green-50 border border-green-200 rounded-lg px-5 py-3 flex items-center justify-between text-sm">
          <span className="font-semibold text-green-700">Venta activa</span>
          <span className="text-green-900 font-bold text-lg">{formatCRC(project.sale.total)}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b overflow-x-auto">
        {TABS.map(({ id: tid, label, icon: Icon }) => (
          <button
            key={tid}
            onClick={() => setTab(tid)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
              activeTab === tid
                ? 'border-wood-500 text-wood-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {/* ─── COTIZACIONES ─── */}
      {activeTab === 'cotizaciones' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button className="btn-primary" onClick={handleNewQuotation} disabled={creatingQuotation}>
              {creatingQuotation ? <Spinner size="sm" /> : <><Plus size={15} /> Nueva cotización</>}
            </button>
          </div>
          {!project.quotations?.length ? (
            <div className="card card-body text-center py-12 text-slate-400 text-sm">
              Sin cotizaciones — crea la primera
            </div>
          ) : (
            project.quotations.map((q: Quotation) => (
              <Link
                key={q.id}
                href={`/cotizaciones/${q.id}`}
                className="card flex items-center justify-between px-5 py-4 hover:shadow-md transition-shadow"
              >
                <div>
                  <p className="font-semibold text-slate-900">Cotización v{q.version}</p>
                  <p className="text-sm text-slate-500">{formatDate(q.createdAt)}</p>
                </div>
                <div className="flex items-center gap-4">
                  <QuotationBadge status={q.estado} />
                  <span className="font-bold text-slate-900">{formatCRC(q.total)}</span>
                  <ChevronRight size={16} className="text-slate-400" />
                </div>
              </Link>
            ))
          )}
        </div>
      )}

      {/* ─── PRODUCCIÓN ─── */}
      {activeTab === 'produccion' && (
        <div className="card card-body space-y-2">
          <p className="text-xs text-slate-500 mb-3">Haz clic en una etapa para avanzar su estado</p>
          {project.productionStages?.map((stage) => {
            const Icon  = STAGE_ICON[stage.estado];
            const color = STAGE_COLOR[stage.estado];
            const busy  = updatingStage === stage.id;
            return (
              <button
                key={stage.id}
                onClick={() => cycleStage(stage)}
                disabled={busy}
                className="w-full flex items-center gap-4 p-4 rounded-lg border hover:bg-slate-50 transition-colors text-left"
              >
                {busy ? <Spinner size="sm" /> : <Icon size={22} className={color} />}
                <div className="flex-1">
                  <p className="font-semibold text-slate-800">{stage.etapa}</p>
                  <p className="text-xs text-slate-400">
                    {stage.fechaInicio ? `Inicio: ${formatDate(stage.fechaInicio)}` : 'Sin iniciar'}
                    {stage.fechaFin ? ` · Fin: ${formatDate(stage.fechaFin)}` : ''}
                  </p>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                  stage.estado === 'COMPLETADO' ? 'bg-green-100 text-green-700' :
                  stage.estado === 'EN_PROCESO' ? 'bg-amber-100 text-amber-700' :
                  'bg-slate-100 text-slate-500'
                }`}>
                  {stage.estado === 'COMPLETADO' ? 'Completado' :
                   stage.estado === 'EN_PROCESO' ? 'En proceso' : 'Pendiente'}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* ─── PAGOS ─── */}
      {activeTab === 'pagos' && (
        <div className="space-y-5">
          {/* Plan de pagos */}
          <div className="card card-body">
            <PaymentSchedulePanel projectId={project.id} totalVenta={totalVenta} />
          </div>

          {/* Botón ir a pagos */}
          <div className="flex justify-center">
            <Link href={`/pagos?proyecto=${project.id}`} className="btn-primary">
              <CreditCard size={15} /> Ver historial de pagos
            </Link>
          </div>
        </div>
      )}

      {/* ─── ARCHIVOS ─── */}
      {activeTab === 'archivos' && (
        <div className="card card-body">
          <ProjectFiles projectId={project.id} />
        </div>
      )}

      {/* Confirm eliminar proyecto */}
      {confirmDelete && (
        <Confirm
          message="¿Eliminar este proyecto por completo? Se eliminarán también sus cotizaciones, venta, pagos, recibos, archivos y plan de pagos. Esta acción no se puede deshacer."
          onConfirm={handleDeleteProject}
          onCancel={() => setConfirmDelete(false)}
          loading={deleting}
        />
      )}
    </div>
  );
}
