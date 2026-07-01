'use client';
import { useEffect, useState } from 'react';
import { Settings, Pencil, Check, X, Plus, ChevronDown, ChevronUp, RotateCcw, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { catalogApi, materialPricesApi } from '@/lib/api';
import type { FurnitureType, CountertopType, Extra, Service, Material } from '@/types';
import { formatCRC } from '@/types';
import { PageLoader, Spinner, Confirm, MoneyInput } from '@/components/ui';

// ─── Precio editable inline ─────────────────────────────
function EditablePrice({ value, onSave }: { value: string | number; onSave: (v: number) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(String(value));
  const [saving, setSaving] = useState(false);

  // Mantener sincronizado si el valor llega después (carga asíncrona)
  useEffect(() => {
    if (!editing) setVal(String(value));
  }, [value, editing]);

  const save = async () => {
    setSaving(true);
    try {
      await onSave(Number(val));
      setEditing(false);
      toast.success('Actualizado');
    } catch { toast.error('Error al actualizar'); }
    finally { setSaving(false); }
  };

  if (!editing) return (
    <div className="flex items-center justify-center gap-2">
      <span className="font-semibold">{formatCRC(value || 0)}</span>
      <button className="btn-ghost btn-sm p-1" onClick={() => setEditing(true)}><Pencil size={12} /></button>
    </div>
  );
  return (
    <div className="flex items-center justify-center gap-1">
      <MoneyInput value={val} onChange={setVal} className="w-36 py-1 text-sm" />
      <button className="btn-ghost btn-sm text-green-600 p-1" onClick={save} disabled={saving}>
        {saving ? <Spinner size="sm" /> : <Check size={14} />}
      </button>
      <button className="btn-ghost btn-sm text-danger p-1" onClick={() => setEditing(false)}>
        <X size={14} />
      </button>
    </div>
  );
}

// ─── Fila editable completa (nombre + precio [+ unidad]) ─
function EditableRow({
  nombre, precio, unidad, activo, onSave, onDelete, onReactivate
}: {
  nombre: string; precio: string | number; unidad?: string; activo: boolean;
  onSave: (data: { nombre: string; precio: number; unidad?: string }) => Promise<void>;
  onDelete: () => Promise<string>; // devuelve un mensaje (eliminado o desactivado)
  onReactivate: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ nombre, precio: String(precio), unidad: unidad || '' });
  const [saving, setSaving] = useState(false);
  const [working, setWorking] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await onSave({ nombre: form.nombre, precio: Number(form.precio), unidad: form.unidad });
      setEditing(false);
      toast.success('Actualizado');
    } catch { toast.error('Error al actualizar'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setWorking(true);
    try {
      const message = await onDelete();
      toast.success(message);
      setConfirmDelete(false);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al eliminar');
    } finally {
      setWorking(false);
    }
  };

  const handleReactivate = async () => {
    setWorking(true);
    try {
      await onReactivate();
      toast.success('Reactivado');
    } catch { toast.error('Error al reactivar'); }
    finally { setWorking(false); }
  };

  if (!editing) return (
    <>
      <td className={`font-semibold ${!activo ? 'text-slate-400 line-through' : ''}`}>{nombre}</td>
      {unidad !== undefined && <td className={!activo ? 'text-slate-400' : ''}>{unidad || '—'}</td>}
      <td className={!activo ? 'text-slate-400' : ''}>{formatCRC(precio)}</td>
      <td>
        <div className="flex items-center gap-1">
          <button className="btn-ghost btn-sm p-1" onClick={() => setEditing(true)} title="Editar">
            <Pencil size={12} />
          </button>
          {activo ? (
            <button
              className="btn-ghost btn-sm p-1 text-danger hover:bg-red-50"
              onClick={() => setConfirmDelete(true)}
              disabled={working}
              title="Eliminar"
            >
              {working ? <Spinner size="sm" /> : <Trash2 size={12} />}
            </button>
          ) : (
            <button
              className="btn-ghost btn-sm p-1 text-green-600 hover:bg-green-50"
              onClick={handleReactivate}
              disabled={working}
              title="Reactivar"
            >
              {working ? <Spinner size="sm" /> : <RotateCcw size={12} />}
            </button>
          )}
          {!activo && <span className="badge-neutral text-[10px]">Inactivo</span>}
        </div>
        {confirmDelete && (
          <Confirm
            message="¿Eliminar este elemento? Si ya se usó en alguna cotización, se desactivará en su lugar para conservar el historial."
            onConfirm={handleDelete}
            onCancel={() => setConfirmDelete(false)}
            loading={working}
          />
        )}
      </td>
    </>
  );

  return (
    <td colSpan={unidad !== undefined ? 4 : 3} className="!py-2">
      <div className="flex flex-wrap items-center gap-2">
        <input className="input py-1 text-sm w-44" value={form.nombre}
          onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))} placeholder="Nombre" />
        {unidad !== undefined && (
          <input className="input py-1 text-sm w-28" value={form.unidad}
            onChange={(e) => setForm((p) => ({ ...p, unidad: e.target.value }))} placeholder="Unidad" />
        )}
        <MoneyInput value={form.precio} onChange={(v) => setForm((p) => ({ ...p, precio: v }))} className="py-1 text-sm w-36" />
        <button className="btn-primary btn-sm" onClick={save} disabled={saving}>
          {saving ? <Spinner size="sm" /> : 'Guardar'}
        </button>
        <button className="btn-ghost btn-sm" onClick={() => setEditing(false)}>Cancelar</button>
      </div>
    </td>
  );
}

// ─── Fila agregar nuevo ─────────────────────────────────
function AddRow({ fields, onAdd, colSpan }: {
  fields: { key: string; placeholder: string; type?: string; width?: string }[];
  onAdd: (values: Record<string, string>) => Promise<void>;
  colSpan: number;
}) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (fields.some((f) => !values[f.key]?.trim())) { toast.error('Completá todos los campos'); return; }
    setSaving(true);
    try {
      await onAdd(values);
      setValues({});
      setOpen(false);
      toast.success('Agregado');
    } catch (err: any) { toast.error(err.response?.data?.error || 'Error'); }
    finally { setSaving(false); }
  };

  if (!open) return (
    <tr>
      <td colSpan={colSpan} className="!py-2">
        <button className="btn-ghost btn-sm" onClick={() => setOpen(true)}>
          <Plus size={13} /> Agregar nuevo
        </button>
      </td>
    </tr>
  );

  return (
    <tr className="bg-wood-50/40">
      <td colSpan={colSpan} className="!py-3">
        <div className="flex flex-wrap items-end gap-2">
          {fields.map((f) => (
            f.type === 'number'
              ? <MoneyInput key={f.key} value={values[f.key] || ''} onChange={(v) => setValues((p) => ({ ...p, [f.key]: v }))} className={`py-1.5 text-sm ${f.width || 'w-40'}`} placeholder={f.placeholder} />
              : <input key={f.key} type="text" className={`input py-1.5 text-sm ${f.width || 'w-40'}`} placeholder={f.placeholder} value={values[f.key] || ''} onChange={(e) => setValues((p) => ({ ...p, [f.key]: e.target.value }))} />
          ))}
          <button className="btn-primary btn-sm" onClick={submit} disabled={saving}>
            {saving ? <Spinner size="sm" /> : 'Guardar'}
          </button>
          <button className="btn-ghost btn-sm" onClick={() => { setOpen(false); setValues({}); }}>Cancelar</button>
        </div>
      </td>
    </tr>
  );
}

// ─── Botón eliminar simple (con confirmación) ──────────
function DeleteButton({ onDelete }: { onDelete: () => Promise<void> }) {
  const [confirm, setConfirm] = useState(false);
  const [working, setWorking] = useState(false);

  const handle = async () => {
    setWorking(true);
    try {
      await onDelete();
      toast.success('Eliminado');
      setConfirm(false);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'No se puede eliminar');
    } finally {
      setWorking(false);
    }
  };

  return (
    <>
      <button className="btn-ghost btn-sm p-1 text-danger hover:bg-red-50" onClick={() => setConfirm(true)} title="Eliminar">
        <Trash2 size={12} />
      </button>
      {confirm && (
        <Confirm
          message="¿Eliminar este elemento? Solo se puede eliminar si no está usado en ninguna cotización."
          onConfirm={handle}
          onCancel={() => setConfirm(false)}
          loading={working}
        />
      )}
    </>
  );
}

interface MaterialPrice {
  id: string; furnitureTypeId: string; materialId: string;
  precio: string; precioBase210?: string | null; costoExtraCm?: string | null;
  furnitureType: FurnitureType; material: Material;
}

export default function CatalogPage() {
  const [loading, setLoading] = useState(true);
  const [furnitureTypes, setFurnitureTypes] = useState<FurnitureType[]>([]);
  const [countertops, setCountertops] = useState<CountertopType[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [extras, setExtras] = useState<Extra[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [matPrices, setMatPrices] = useState<MaterialPrice[]>([]);
  const [showMatPrices, setShowMatPrices] = useState(true);

  const loadAll = () => {
    Promise.allSettled([
      catalogApi.furnitureTypes(),
      catalogApi.countertopTypes(),
      catalogApi.materials(),
      catalogApi.extras(),
      catalogApi.services(),
      materialPricesApi.list(),
    ]).then((results) => {
      const [ft, ct, mat, ex, sv, mp] = results;
      if (ft.status === 'fulfilled') setFurnitureTypes(ft.value); else console.error('furniture-types', ft.reason);
      if (ct.status === 'fulfilled') setCountertops(ct.value); else console.error('countertop-types', ct.reason);
      if (mat.status === 'fulfilled') setMaterials(mat.value); else console.error('materials', mat.reason);
      if (ex.status === 'fulfilled') setExtras(ex.value); else console.error('extras', ex.reason);
      if (sv.status === 'fulfilled') setServices(sv.value); else console.error('services', sv.reason);
      if (mp.status === 'fulfilled') {
        setMatPrices(mp.value);
      } else {
        console.error('material-prices', mp.reason);
        toast.error('No se pudieron cargar los precios por material. Verificá que el backend esté actualizado (endpoint /catalog/material-prices) y reiniciado.');
      }
    }).finally(() => setLoading(false));
  };

  useEffect(() => { loadAll(); }, []);

  if (loading) return <PageLoader />;

  // Agrupar precios por material para mostrarlos en tabla
  const matPricesByType: Record<string, Record<string, MaterialPrice>> = {};
  for (const mp of matPrices) {
    if (!matPricesByType[mp.furnitureTypeId]) matPricesByType[mp.furnitureTypeId] = {};
    matPricesByType[mp.furnitureTypeId][mp.materialId] = mp;
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1 className="page-title flex items-center gap-2">
          <Settings size={22} className="text-wood-500" /> Catálogo & Precios
        </h1>
      </div>

      {/* ── PRECIOS POR MATERIAL (tabla principal) ── */}
      <div className="card">
        <div className="card-header cursor-pointer" onClick={() => setShowMatPrices(!showMatPrices)}>
          <h2 className="font-display font-bold text-slate-900">Precios por tipo de mueble y material</h2>
          {showMatPrices ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
        {showMatPrices && (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Tipo de mueble</th>
                  {materials.map((m) => (
                    <th key={m.id} className="text-center">{m.nombre}</th>
                  ))}
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {furnitureTypes.map((ft) => (
                  <tr key={ft.id}>
                    <td className="font-semibold text-slate-800">{ft.nombre}</td>
                    {materials.map((m) => {
                      const mp = matPricesByType[ft.id]?.[m.id];
                      return (
                        <td key={m.id} className="text-center">
                          <EditablePrice
                            value={mp ? mp.precio : 0}
                            onSave={async (v) => {
                              const updated = await materialPricesApi.upsert({
                                furnitureTypeId: ft.id,
                                materialId: m.id,
                                precio: v,
                                precioBase210: mp?.precioBase210 ? Number(mp.precioBase210) : undefined,
                                costoExtraCm: mp?.costoExtraCm ? Number(mp.costoExtraCm) : undefined,
                              });
                              setMatPrices((prev) => {
                                const others = prev.filter((p) => !(p.furnitureTypeId === ft.id && p.materialId === m.id));
                                return [...others, updated];
                              });
                            }}
                          />
                        </td>
                      );
                    })}
                    <td className="text-center">
                      <DeleteButton onDelete={async () => {
                        await catalogApi.deleteFurnitureType(ft.id);
                        setFurnitureTypes(await catalogApi.furnitureTypes());
                        setMatPrices(await materialPricesApi.list());
                      }} />
                    </td>
                  </tr>
                ))}
                <AddRow colSpan={materials.length + 2}
                  fields={[
                    { key: 'nombre', placeholder: 'Nombre del nuevo tipo (ej: REPISA)', width: 'w-56' },
                  ]}
                  onAdd={async (v) => {
                    await catalogApi.createFurnitureType({ nombre: v.nombre, precioBase: 0 });
                    setFurnitureTypes(await catalogApi.furnitureTypes());
                  }} />
              </tbody>
            </table>
          </div>
        )}
        <p className="px-4 py-2 text-xs text-slate-400 border-t">
          Hacé clic en cualquier precio para editarlo. Los closets se calculan como (Largo ÷ 100) × precio mostrado aquí, para el rango de altura correspondiente. Al agregar un tipo nuevo, configurá su precio para cada material directamente en esta tabla.
        </p>
      </div>

      {/* ── MATERIALES (fijos, solo informativo) ── */}
      <div className="card">
        <div className="card-header"><h2 className="font-display font-bold text-slate-900">Materiales</h2></div>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Material</th><th>Descripción</th><th></th></tr></thead>
            <tbody>
              {materials.map((m) => (
                <tr key={m.id}>
                  <td className="font-semibold">{m.nombre}</td>
                  <td className="text-slate-500">{m.descripcion || '—'}</td>
                  <td>
                    {!['MELAMINA_RH', 'MDF_RH'].includes(m.nombre) && (
                      <DeleteButton onDelete={async () => {
                        await catalogApi.deleteMaterial(m.id);
                        setMaterials(await catalogApi.materials());
                        setMatPrices(await materialPricesApi.list());
                      }} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="px-4 py-2 text-xs text-slate-400 border-t">
          Los materiales son fijos (Melamina RH y MDF RH). Para ajustar precios, usá la tabla "Precios por tipo de mueble y material" arriba.
        </p>
      </div>

      {/* ── SOBRES ── */}
      <div className="card">
        <div className="card-header"><h2 className="font-display font-bold text-slate-900">Tipos de sobre</h2></div>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Sobre</th><th>Precio / m²</th><th></th></tr></thead>
            <tbody>
              {countertops.map((c) => (
                <tr key={c.id}>
                  <td className="font-semibold">{c.nombre}</td>
                  <td>
                    <EditablePrice value={c.precioM2}
                      onSave={async (v) => {
                        await catalogApi.updateCountertopPrice(c.id, v);
                        setCountertops(await catalogApi.countertopTypes());
                      }} />
                  </td>
                  <td>
                    <DeleteButton onDelete={async () => {
                      await catalogApi.deleteCountertopType(c.id);
                      setCountertops(await catalogApi.countertopTypes());
                    }} />
                  </td>
                </tr>
              ))}
              <AddRow colSpan={3}
                fields={[
                  { key: 'nombre', placeholder: 'Nombre (ej: MÁRMOL)', width: 'w-48' },
                  { key: 'precioM2', placeholder: 'Precio m² ₡', type: 'number', width: 'w-32' },
                ]}
                onAdd={async (v) => {
                  await catalogApi.createCountertopType({ nombre: v.nombre, precioM2: Number(v.precioM2) });
                  setCountertops(await catalogApi.countertopTypes());
                }} />
            </tbody>
          </table>
        </div>
      </div>

      {/* ── EXTRAS ── */}
      <div className="card">
        <div className="card-header"><h2 className="font-display font-bold text-slate-900">Extras</h2></div>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Extra</th><th>Unidad</th><th>Precio</th><th></th></tr></thead>
            <tbody>
              {extras.map((e) => (
                <tr key={e.id}>
                  <EditableRow nombre={e.nombre} precio={e.precio} unidad={e.unidad} activo={e.activo}
                    onSave={async (data) => {
                      await catalogApi.updateExtra(e.id, data);
                      setExtras(await catalogApi.extras());
                    }}
                    onDelete={async () => {
                      const res = await catalogApi.deleteExtra(e.id);
                      setExtras(await catalogApi.extras());
                      return res.message || 'Eliminado';
                    }}
                    onReactivate={async () => {
                      await catalogApi.toggleExtra(e.id);
                      setExtras(await catalogApi.extras());
                    }} />
                </tr>
              ))}
              <AddRow colSpan={4}
                fields={[
                  { key: 'nombre', placeholder: 'Nombre', width: 'w-44' },
                  { key: 'unidad', placeholder: 'Unidad (METRO, UNIDAD...)', width: 'w-36' },
                  { key: 'precio', placeholder: 'Precio ₡', type: 'number', width: 'w-28' },
                ]}
                onAdd={async (v) => {
                  await catalogApi.createExtra({ nombre: v.nombre, precio: Number(v.precio), unidad: v.unidad });
                  setExtras(await catalogApi.extras());
                }} />
            </tbody>
          </table>
        </div>
        <p className="px-4 py-2 text-xs text-slate-400 border-t">
          Desactivar un extra lo oculta de nuevas cotizaciones, pero conserva el historial de cotizaciones donde ya se usó.
        </p>
      </div>

      {/* ── SERVICIOS ── */}
      <div className="card">
        <div className="card-header"><h2 className="font-display font-bold text-slate-900">Servicios</h2></div>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Servicio</th><th>Precio base</th><th></th></tr></thead>
            <tbody>
              {services.map((s) => (
                <tr key={s.id}>
                  <EditableRow nombre={s.nombre} precio={s.precioBase} activo={s.activo}
                    onSave={async (data) => {
                      await catalogApi.updateService(s.id, { nombre: data.nombre, precioBase: data.precio });
                      setServices(await catalogApi.services());
                    }}
                    onDelete={async () => {
                      const res = await catalogApi.deleteService(s.id);
                      setServices(await catalogApi.services());
                      return res.message || 'Eliminado';
                    }}
                    onReactivate={async () => {
                      await catalogApi.toggleService(s.id);
                      setServices(await catalogApi.services());
                    }} />
                </tr>
              ))}
              <AddRow colSpan={3}
                fields={[
                  { key: 'nombre', placeholder: 'Nombre', width: 'w-48' },
                  { key: 'precioBase', placeholder: 'Precio ₡', type: 'number', width: 'w-32' },
                ]}
                onAdd={async (v) => {
                  await catalogApi.createService({ nombre: v.nombre, precioBase: Number(v.precioBase) });
                  setServices(await catalogApi.services());
                }} />
            </tbody>
          </table>
        </div>
        <p className="px-4 py-2 text-xs text-slate-400 border-t">
          Transporte: ₡ por km. Instalación: monto base que se puede sobreescribir manualmente al cotizar.
        </p>
      </div>
    </div>
  );
}
