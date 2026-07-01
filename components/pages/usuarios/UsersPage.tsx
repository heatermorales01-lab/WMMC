'use client';
import { useEffect, useState } from 'react';
import { Users, Plus, ToggleLeft, ToggleRight, Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { usersApi } from '@/lib/api';
import type { User } from '@/types';
import { useAuthStore } from '@/store/auth.store';
import { PageLoader, Modal, FormGroup, Spinner, Confirm } from '@/components/ui';

const emptyForm = { nombre: '', correo: '', password: '', roleId: '' };

export default function UsersPage() {
  const { user: currentUser } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [selected, setSelected] = useState<User | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [roles, setRoles] = useState<{ id: string; nombre: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleteUser, setDeleteUser] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    try {
      const [userData, roleData] = await Promise.all([usersApi.list(), usersApi.roles()]);
      setUsers(userData);
      setRoles(roleData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setForm({ ...emptyForm, roleId: roles[0]?.id || '' });
    setModal('create');
  };

  const openEdit = (u: User) => {
    setSelected(u);
    setForm({ nombre: u.nombre, correo: u.correo, password: '', roleId: u.role.id });
    setModal('edit');
  };

  const closeModal = () => { setModal(null); setSelected(null); };

  const handleSubmit = async () => {
    if (!form.nombre || !form.correo || (modal === 'create' && !form.password)) {
      toast.error('Completá todos los campos requeridos');
      return;
    }
    setSaving(true);
    try {
      if (modal === 'create') {
        await usersApi.create(form);
        toast.success('Usuario creado');
      } else if (selected) {
        const payload: any = { nombre: form.nombre, correo: form.correo, roleId: form.roleId };
        if (form.password) payload.password = form.password;
        await usersApi.update(selected.id, payload);
        toast.success('Usuario actualizado');
      }
      closeModal();
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al guardar usuario');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (user: User) => {
    try {
      await usersApi.toggle(user.id);
      toast.success(`Usuario ${user.activo ? 'desactivado' : 'activado'}`);
      load();
    } catch {
      toast.error('Error al cambiar estado');
    }
  };

  const handleDelete = async () => {
    if (!deleteUser) return;
    setDeleting(true);
    try {
      await usersApi.delete(deleteUser.id);
      toast.success('Usuario eliminado');
      setDeleteUser(null);
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
        <h1 className="page-title flex items-center gap-2">
          <Users size={22} className="text-wood-500" /> Usuarios
        </h1>
        <button className="btn-primary" onClick={openCreate}>
          <Plus size={15} /> Nuevo usuario
        </button>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Nombre</th><th>Correo</th><th>Rol</th><th>Estado</th><th></th></tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="font-semibold text-slate-900">{u.nombre}</td>
                  <td>{u.correo}</td>
                  <td><span className="badge-neutral">{u.role.nombre}</span></td>
                  <td>
                    {u.activo
                      ? <span className="badge-success">Activo</span>
                      : <span className="badge-neutral">Inactivo</span>}
                  </td>
                  <td>
                    <div className="flex items-center gap-1">
                      <button
                        className="btn-ghost btn-sm"
                        onClick={() => handleToggle(u)}
                        title={u.activo ? 'Desactivar' : 'Activar'}
                      >
                        {u.activo
                          ? <ToggleRight size={16} className="text-green-500" />
                          : <ToggleLeft size={16} className="text-slate-400" />}
                      </button>
                      <button className="btn-ghost btn-sm" onClick={() => openEdit(u)} title="Editar">
                        <Pencil size={14} />
                      </button>
                      {currentUser?.id !== u.id && (
                        <button
                          className="btn-ghost btn-sm text-danger hover:bg-red-50"
                          onClick={() => setDeleteUser(u)}
                          title="Eliminar"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <Modal title={modal === 'create' ? 'Nuevo usuario' : 'Editar usuario'} onClose={closeModal} size="sm">
          <div className="space-y-4">
            <FormGroup label="Nombre" required>
              <input className="input" value={form.nombre} onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))} />
            </FormGroup>
            <FormGroup label="Correo" required>
              <input type="email" className="input" value={form.correo} onChange={(e) => setForm((p) => ({ ...p, correo: e.target.value }))} />
            </FormGroup>
            <FormGroup label={modal === 'create' ? 'Contraseña' : 'Nueva contraseña (opcional)'} required={modal === 'create'}>
              <input type="password" className="input" value={form.password}
                placeholder={modal === 'edit' ? 'Dejar en blanco para no cambiar' : ''}
                onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} />
            </FormGroup>
            <FormGroup label="Rol" required>
              <select className="input" value={form.roleId} onChange={(e) => setForm((p) => ({ ...p, roleId: e.target.value }))}>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>{r.nombre}</option>
                ))}
              </select>
            </FormGroup>
            <div className="flex justify-end gap-2">
              <button className="btn-secondary" onClick={closeModal}>Cancelar</button>
              <button className="btn-primary" onClick={handleSubmit} disabled={saving}>
                {saving ? <Spinner size="sm" /> : modal === 'create' ? 'Crear usuario' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {deleteUser && (
        <Confirm
          message={`¿Eliminar al usuario "${deleteUser.nombre}"? Esta acción no se puede deshacer.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteUser(null)}
          loading={deleting}
        />
      )}
    </div>
  );
}
