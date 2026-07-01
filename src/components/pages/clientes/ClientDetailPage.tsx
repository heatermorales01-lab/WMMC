'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
const navigate = (path: string) => { if(typeof window !== 'undefined') window.location.href = path; };
import { useEffect, useState } from 'react';
import { ArrowLeft, Plus, FolderKanban, Phone, Mail, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import { clientsApi, projectsApi } from '@/lib/api';
import type { Client, Project } from '@/types';
import { formatDate } from '@/types';
import { PageLoader, ProjectBadge, EmptyState } from '@/components/ui';
import { useForm } from 'react-hook-form';
import { Modal, FormGroup, Spinner } from '@/components/ui';

export default function ClientDetailPage({ id }: { id: string }) {
  const router = useRouter();
  const [client, setClient] = useState<Client & { projects?: Project[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showProjectModal, setShowProjectModal] = useState(false);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<any>();

  const load = async () => {
    try {
      const data = await clientsApi.get(id!);
      setClient(data);
    } catch {
      toast.error('Cliente no encontrado');
      router.push('/clientes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const onCreateProject = async (data: any) => {
    try {
      const project = await projectsApi.create({ ...data, clientId: id });
      toast.success('Proyecto creado');
      setShowProjectModal(false);
      reset();
      router.push(`/proyectos/${project.id}`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al crear proyecto');
    }
  };

  if (loading) return <PageLoader />;
  if (!client) return null;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/clientes" className="btn-ghost btn-sm">
          <ArrowLeft size={14} />
        </Link>
        <div className="page-header mb-0 flex-1">
          <h1 className="page-title">{client.nombre}</h1>
          <button className="btn-primary" onClick={() => setShowProjectModal(true)}>
            <Plus size={16} /> Nuevo proyecto
          </button>
        </div>
      </div>

      {/* Info del cliente */}
      <div className="card card-body">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          {client.telefono && (
            <div className="flex items-center gap-2 text-slate-600">
              <Phone size={15} className="text-wood-500" />
              {client.telefono}
            </div>
          )}
          {client.correo && (
            <div className="flex items-center gap-2 text-slate-600">
              <Mail size={15} className="text-wood-500" />
              {client.correo}
            </div>
          )}
          {client.direccion && (
            <div className="flex items-center gap-2 text-slate-600">
              <MapPin size={15} className="text-wood-500" />
              {client.direccion}
            </div>
          )}
        </div>
        {client.observaciones && (
          <p className="mt-3 text-sm text-slate-500 border-t pt-3">{client.observaciones}</p>
        )}
      </div>

      {/* Proyectos */}
      <div className="card">
        <div className="card-header">
          <h2 className="font-display font-bold text-slate-900">Proyectos</h2>
          <span className="badge-neutral">{client.projects?.length ?? 0}</span>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Proyecto</th><th>Ubicación</th><th>Estado</th><th>Instalación</th><th></th></tr>
            </thead>
            <tbody>
              {!client.projects?.length ? (
                <tr>
                  <td colSpan={5}>
                    <EmptyState
                      icon={<FolderKanban size={24} />}
                      title="Sin proyectos"
                      action={
                        <button className="btn-primary btn-sm" onClick={() => setShowProjectModal(true)}>
                          <Plus size={14} /> Crear proyecto
                        </button>
                      }
                    />
                  </td>
                </tr>
              ) : (
                client.projects.map((p) => (
                  <tr key={p.id}>
                    <td className="font-semibold text-slate-900">{p.nombreProyecto}</td>
                    <td>{p.ubicacion || '—'}</td>
                    <td><ProjectBadge status={p.estado} /></td>
                    <td>{formatDate(p.fechaInstalacionTentativa)}</td>
                    <td>
                      <Link href={`/proyectos/${p.id}`} className="btn-ghost btn-sm">Ver</Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal nuevo proyecto */}
      {showProjectModal && (
        <Modal title="Nuevo proyecto" onClose={() => setShowProjectModal(false)}>
          <form onSubmit={handleSubmit(onCreateProject)} className="space-y-4">
            <FormGroup label="Nombre del proyecto" error={errors.nombreProyecto?.message as string} required>
              <input className="input" {...register('nombreProyecto', { required: 'Requerido' })} />
            </FormGroup>
            <FormGroup label="Ubicación">
              <input className="input" placeholder="Ej: Condominio Las Palmas, Heredia" {...register('ubicacion')} />
            </FormGroup>
            <FormGroup label="Descripción">
              <textarea className="input h-20 resize-none" {...register('descripcion')} />
            </FormGroup>
            <FormGroup label="Fecha estimada de instalación">
              <input type="date" className="input" {...register('fechaInstalacionTentativa')} />
            </FormGroup>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className="btn-secondary" onClick={() => setShowProjectModal(false)}>Cancelar</button>
              <button type="submit" className="btn-primary" disabled={isSubmitting}>
                {isSubmitting ? <Spinner size="sm" /> : 'Crear proyecto'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
