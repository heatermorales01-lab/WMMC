'use client';
import { useEffect, useState } from 'react';
import { Package, Plus, AlertTriangle, ArrowUp, ArrowDown, Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { inventoryApi } from '@/lib/api';
import type { InventoryItem } from '@/types';
import { PageLoader, EmptyState, Modal, FormGroup, Spinner, Confirm } from '@/components/ui';
import { useAuthStore } from '@/store/auth.store';

export default function InventoryPage() {
  const { isAdmin } = useAuthStore();
  const [data, setData] = useState<{ items: InventoryItem[]; lowStockCount: number }>({ items: [], lowStockCount: 0 });
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [adjustItem, setAdjustItem] = useState<InventoryItem | null>(null);
  const [adjustOp, setAdjustOp] = useState<'ENTRADA' | 'SALIDA'>('ENTRADA');
  const [adjustQty, setAdjustQty] = useState(1);
  const [saving, setSaving] = useState(false);
  const [newItem, setNewItem] = useState({ nombre: '', categoria: '', unidadMedida: '', stockMinimo: 0 });
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [editForm, setEditForm] = useState({ nombre: '', categoria: '', unidadMedida: '' });
  const [deleteItem, setDeleteItem] = useState<InventoryItem | null>(null);
  const [deleting, setDeleting] = useState(false);

    const load = async () => {
        try {
            setLoading(true);

            const response = await inventoryApi.list();

            console.log(response);

            setData({
                items: response.items ?? [],
                lowStockCount: response.lowStockCount ?? 0,
            });

        } catch (e) {
            console.error(e);
            toast.error("Error cargando inventario");
        } finally {
            setLoading(false);
        }
    };
  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!newItem.nombre) { toast.error('El nombre es requerido'); return; }
    setSaving(true);
    try {
      await inventoryApi.create(newItem);
      toast.success('Item creado');
      setShowCreate(false);
      setNewItem({ nombre: '', categoria: '', unidadMedida: '', stockMinimo: 0 });
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error');
    } finally {
      setSaving(false);
    }
  };

  const handleAdjust = async () => {
    if (!adjustItem) return;
    setSaving(true);
    try {
      await inventoryApi.adjust(adjustItem.id, adjustQty, adjustOp);
      toast.success(`${adjustOp === 'ENTRADA' ? 'Entrada' : 'Salida'} registrada`);
      setAdjustItem(null);
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error');
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (item: InventoryItem) => {
    setEditItem(item);
    setEditForm({ nombre: item.nombre, categoria: item.categoria || '', unidadMedida: item.unidadMedida || '' });
  };

  const handleSaveEdit = async () => {
    if (!editItem) return;
    if (!editForm.nombre.trim()) { toast.error('El nombre es requerido'); return; }
    setSaving(true);
    try {
      await inventoryApi.update(editItem.id, editForm);
      toast.success('Item actualizado');
      setEditItem(null);
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    setDeleting(true);
    try {
      await inventoryApi.delete(deleteItem.id);
      toast.success('Item eliminado');
      setDeleteItem(null);
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
        <div>
          <h1 className="page-title">Inventario</h1>
          {data.lowStockCount > 0 && (
            <p className="text-sm text-amber-600 flex items-center gap-1 mt-1">
              <AlertTriangle size={14} /> {data.lowStockCount} items bajo stock mínimo
            </p>
          )}
        </div>
        {isAdmin && (
          <button className="btn-primary" onClick={() => setShowCreate(true)}>
            <Plus size={15} /> Nuevo item
          </button>
        )}
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Categoría</th>
                <th>Unidad</th>
                <th>Stock actual</th>
                <th>Stock mínimo</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.items.length === 0 ? (
                <tr><td colSpan={6}><EmptyState icon={<Package size={24} />} title="Inventario vacío" /></td></tr>
              ) : (
                data.items.map((item) => {
                  const lowStock = Number(item.stockActual) <= Number(item.stockMinimo);
                  return (
                    <tr key={item.id}>
                      <td className="font-semibold text-slate-900">{item.nombre}</td>
                      <td>{item.categoria || '—'}</td>
                      <td>{item.unidadMedida || '—'}</td>
                      <td>
                        <span className={`font-semibold ${lowStock ? 'text-danger' : 'text-slate-800'}`}>
                          {Number(item.stockActual).toLocaleString()}
                          {lowStock && <AlertTriangle size={12} className="inline ml-1 text-danger" />}
                        </span>
                      </td>
                      <td>{Number(item.stockMinimo).toLocaleString()}</td>
                      <td>
                        <div className="flex gap-1">
                          <button
                            className="btn-ghost btn-sm text-green-600"
                            onClick={() => { setAdjustItem(item); setAdjustOp('ENTRADA'); setAdjustQty(1); }}
                          >
                            <ArrowUp size={13} />
                          </button>
                          <button
                            className="btn-ghost btn-sm text-red-500"
                            onClick={() => { setAdjustItem(item); setAdjustOp('SALIDA'); setAdjustQty(1); }}
                          >
                            <ArrowDown size={13} />
                          </button>
                          {isAdmin && (
                            <>
                              <button className="btn-ghost btn-sm" onClick={() => openEdit(item)} title="Editar">
                                <Pencil size={13} />
                              </button>
                              <button className="btn-ghost btn-sm text-danger" onClick={() => setDeleteItem(item)} title="Eliminar">
                                <Trash2 size={13} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal nuevo item */}
      {showCreate && (
        <Modal title="Nuevo item de inventario" onClose={() => setShowCreate(false)} size="sm">
          <div className="space-y-4">
            <FormGroup label="Nombre" required>
              <input className="input" value={newItem.nombre} onChange={(e) => setNewItem((p) => ({ ...p, nombre: e.target.value }))} />
            </FormGroup>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormGroup label="Categoría">
                <input className="input" placeholder="Herraje, Lámina..." value={newItem.categoria} onChange={(e) => setNewItem((p) => ({ ...p, categoria: e.target.value }))} />
              </FormGroup>
              <FormGroup label="Unidad">
                <input className="input" placeholder="Unidad, Lámina..." value={newItem.unidadMedida} onChange={(e) => setNewItem((p) => ({ ...p, unidadMedida: e.target.value }))} />
              </FormGroup>
            </div>
            <FormGroup label="Stock mínimo">
              <input type="number" className="input" value={newItem.stockMinimo} onChange={(e) => setNewItem((p) => ({ ...p, stockMinimo: Number(e.target.value) }))} />
            </FormGroup>
            <div className="flex justify-end gap-2">
              <button className="btn-secondary" onClick={() => setShowCreate(false)}>Cancelar</button>
              <button className="btn-primary" onClick={handleCreate} disabled={saving}>
                {saving ? <Spinner size="sm" /> : 'Crear item'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal ajuste de stock */}
      {adjustItem && (
        <Modal title={`${adjustOp === 'ENTRADA' ? 'Entrada' : 'Salida'} — ${adjustItem.nombre}`} onClose={() => setAdjustItem(null)} size="sm">
          <div className="space-y-4">
            <p className="text-sm text-slate-600">Stock actual: <strong>{Number(adjustItem.stockActual).toLocaleString()}</strong></p>
            <FormGroup label="Cantidad">
              <input type="number" min={1} className="input" value={adjustQty} onChange={(e) => setAdjustQty(Number(e.target.value))} />
            </FormGroup>
            <div className="flex justify-end gap-2">
              <button className="btn-secondary" onClick={() => setAdjustItem(null)}>Cancelar</button>
              <button
                className={adjustOp === 'ENTRADA' ? 'btn-primary' : 'btn-danger'}
                onClick={handleAdjust} disabled={saving}
              >
                {saving ? <Spinner size="sm" /> : `Registrar ${adjustOp === 'ENTRADA' ? 'entrada' : 'salida'}`}
              </button>
            </div>
          </div>
        </Modal>
      )}
      {/* Modal editar item (solo admin) */}
      {editItem && (
        <Modal title={`Editar — ${editItem.nombre}`} onClose={() => setEditItem(null)} size="sm">
          <div className="space-y-4">
            <FormGroup label="Nombre" required>
              <input className="input" value={editForm.nombre} onChange={(e) => setEditForm((p) => ({ ...p, nombre: e.target.value }))} />
            </FormGroup>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormGroup label="Categoría">
                <input className="input" value={editForm.categoria} onChange={(e) => setEditForm((p) => ({ ...p, categoria: e.target.value }))} />
              </FormGroup>
              <FormGroup label="Unidad">
                <input className="input" value={editForm.unidadMedida} onChange={(e) => setEditForm((p) => ({ ...p, unidadMedida: e.target.value }))} />
              </FormGroup>
            </div>
            <div className="flex justify-end gap-2">
              <button className="btn-secondary" onClick={() => setEditItem(null)}>Cancelar</button>
              <button className="btn-primary" onClick={handleSaveEdit} disabled={saving}>
                {saving ? <Spinner size="sm" /> : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Confirmar eliminación (solo admin) */}
      {deleteItem && (
        <Confirm
          message={`¿Eliminar "${deleteItem.nombre}" del inventario? Esta acción no se puede deshacer.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteItem(null)}
          loading={deleting}
        />
      )}
    </div>
  );
}
