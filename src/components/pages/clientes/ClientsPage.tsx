'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Users, Search, ArrowRight, Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { clientsApi } from '@/lib/api';
import type { Client } from '@/types';
import { PageLoader, Modal, Confirm, EmptyState, FormGroup, Spinner } from '@/components/ui';

const schema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  telefono: z.string().optional(),
  correo: z.string().email('Correo inválido').optional().or(z.literal('')),
  direccion: z.string().optional(),
  observaciones: z.string().optional(),
});
type Form = z.infer<typeof schema>;

export default function ClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [filtered, setFiltered] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [selected, setSelected] = useState<Client | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<Form>({
    resolver: zodResolver(schema),
  });

  const load = async () => {
    try {
      const data = await clientsApi.list();
      setClients(data);
      setFiltered(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(clients.filter((c) =>
      c.nombre.toLowerCase().includes(q) ||
      c.correo?.toLowerCase().includes(q) ||
      c.telefono?.includes(q)
    ));
  }, [search, clients]);

  const openCreate = () => { reset({}); setModal('create'); };
  const openEdit = (c: Client) => { setSelected(c); reset(c); setModal('edit'); };
  const closeModal = () => { setModal(null); setSelected(null); };

  const onSubmit = async (data: Form) => {
    try {
      if (modal === 'create') {
        await clientsApi.create(data);
        toast.success('Cliente creado');
      } else {
        await clientsApi.update(selected!.id, data);
        toast.success('Cliente actualizado');
      }
      closeModal();
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al guardar');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await clientsApi.delete(deleteId);
      toast.success('Cliente eliminado');
      setDeleteId(null);
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'No se pudo eliminar');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-5">
      <div className="page-header">
        <h1 className="page-title">Clientes</h1>
        <button className="btn-primary" onClick={openCreate}>
          <Plus size={16} /> Nuevo cliente
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          className="input pl-9"
          placeholder="Buscar por nombre, correo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Teléfono</th>
                <th>Correo</th>
                <th>Proyectos</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <EmptyState
                      icon={<Users size={28} />}
                      title="Sin clientes"
                      description="Registra tu primer cliente para comenzar"
                      action={<button className="btn-primary btn-sm" onClick={openCreate}><Plus size={14} />Nuevo cliente</button>}
                    />
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => router.push(`/clientes/${c.id}`)}
                    className="cursor-pointer hover:bg-slate-50"
                  >
                    <td className="font-semibold text-slate-900">{c.nombre}</td>
                    <td>{c.telefono || '—'}</td>
                    <td>{c.correo || '—'}</td>
                    <td>
                      <span className="badge-neutral">{c._count?.projects ?? 0}</span>
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <Link href={`/clientes/${c.id}`} className="btn-ghost btn-sm">
                          <ArrowRight size={14} />
                        </Link>
                        <button className="btn-ghost btn-sm" onClick={() => openEdit(c)}>
                          <Pencil size={14} />
                        </button>
                        <button className="btn-ghost btn-sm text-danger hover:bg-red-50" onClick={() => setDeleteId(c.id)}>
                          <Trash2 size={14} />
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

      {/* Modal crear/editar */}
      {modal && (
        <Modal title={modal === 'create' ? 'Nuevo cliente' : 'Editar cliente'} onClose={closeModal}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <FormGroup label="Nombre" error={errors.nombre?.message} required>
              <input className={`input ${errors.nombre ? 'input-error' : ''}`} {...register('nombre')} />
            </FormGroup>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormGroup label="Teléfono" error={errors.telefono?.message}>
                <input className="input" {...register('telefono')} />
              </FormGroup>
              <FormGroup label="Correo" error={errors.correo?.message}>
                <input type="email" className="input" {...register('correo')} />
              </FormGroup>
            </div>
            <FormGroup label="Dirección">
              <input className="input" {...register('direccion')} />
            </FormGroup>
            <FormGroup label="Observaciones">
              <textarea className="input h-20 resize-none" {...register('observaciones')} />
            </FormGroup>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className="btn-secondary" onClick={closeModal}>Cancelar</button>
              <button type="submit" className="btn-primary" disabled={isSubmitting}>
                {isSubmitting ? <Spinner size="sm" /> : modal === 'create' ? 'Crear cliente' : 'Guardar cambios'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Confirm delete */}
      {deleteId && (
        <Confirm
          message="¿Eliminar este cliente? Esta acción no se puede deshacer."
          onConfirm={handleDelete}
          onCancel={() => setDeleteId(null)}
          loading={deleting}
        />
      )}
    </div>
  );
}
