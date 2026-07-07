'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft, Plus, Trash2, ChevronDown, ChevronUp, CheckCircle, Send, XCircle, Download, Percent, Pencil, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { quotationsApi, catalogApi, pdfApi } from '@/lib/api';
import type {
  Quotation, FurnitureType, Material, CountertopType, Extra, Service,
  QuotationItem,
} from '@/types';
import { formatCRC } from '@/types';
import { PageLoader, QuotationBadge, Modal, FormGroup, Spinner, Confirm, MoneyInput } from '@/components/ui';

// ─── Formulario agregar mueble ──────────────────────────
function AddItemForm({
  furnitureTypes, materials, countertopTypes, extras, item,
  onAdd, onClose,
}: {
  furnitureTypes: FurnitureType[];
  materials: Material[];
  countertopTypes: CountertopType[];
        extras: Extra[];
        item?: QuotationItem | null;
  onAdd: (data: any) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<any>({
    furnitureTypeId: furnitureTypes[0]?.id || '',
    materialId: materials[0]?.id || '',
    countertopTypeId: '',
    descripcion: '',
    nombrePersonalizado: '',
    largo: '',
    alto: '',
    ancho: '',
    cantidad: 1,
    estiloDoble: 'FUNCIONAL',
    tipoCajonEspecial: false,
    cascada: 'NINGUNA',
    extras: [] as { extraId: string; cantidad: number }[],
  });
    const [saving, setSaving] = useState(false);
    useEffect(() => {
        if (!item) return;

        setForm({
            furnitureTypeId: item.furnitureType.id,
            materialId: item.material.id,
            countertopTypeId: item.countertopType?.id || '',

            descripcion: item.descripcion || '',
            nombrePersonalizado: item.nombrePersonalizado || '',

            largo: item.largo,
            alto: item.alto || '',
            ancho: item.ancho || '',
            cantidad: item.cantidad,

            estiloDoble: (item as any).estiloDoble || 'FUNCIONAL',
            tipoCajonEspecial: (item as any).tipoCajonEspecial || false,
            cascada: (item as any).cascada || 'NINGUNA',

            extras:
                item.quotationItemExtras?.map((e: any) => ({
                    extraId: e.extra.id,
                    cantidad: e.cantidad,
                })) || [],
        });

    }, [item]);

  const selectedType = furnitureTypes.find((f) => f.id === form.furnitureTypeId);
  const typeName = selectedType?.nombre || '';
  const needsAlto = ['AEREO', 'TORRE', 'ALACENA_REFRI', 'AEREO_REFRI', 'ISLA', 'PUERTA_INTERNA_MDF', 'PUERTA_INTERNA_MEL'].includes(typeName);
  const needsAncho = typeName === 'ISLA';
  const needsCascada = typeName === 'ISLA';
  const needsEstilo = typeName === 'AEREO';
  const needsCajon = typeName === 'AEREO_REFRI';
  const needsSobre = ['BASE', 'ISLA', 'BANIO_SUSPENDIDO', 'BANIO_PISO'].includes(typeName);
  const isCloset = typeName.includes('CLOSET');
  const isTorre = ['TORRE', 'ALACENA_REFRI'].includes(typeName);
  const isBanioType = ['BANIO_SUSPENDIDO', 'BANIO_PISO'].includes(typeName);
  // Fondo estándar mostrado como info al cotizar:
  // Closets y baños → 50cm, Torres/Alacenas → 65cm, Base/Baño → 50cm
  const fondoInfo: string | null =
    isCloset ? 'Fondo estándar: 50 cm' :
    isTorre ? 'Fondo estándar: 65 cm' :
    isBanioType ? 'Fondo estándar: 50 cm' :
    typeName === 'BASE' ? 'Fondo estándar: 50 cm' :
    null;
  const isPuertaInterna = ['PUERTA_INTERNA_MDF', 'PUERTA_INTERNA_MEL'].includes(typeName);
  // Solo Puerta Principal tiene precio fijo (no depende de dimensiones)
  const isPrecioFijo = typeName === 'PUERTA_PRINCIPAL_MDF';

  const set = (field: string, value: any) => setForm((p: any) => ({ ...p, [field]: value }));

  const addExtra = () => {
    if (extras.length > 0) {
      setForm((p: any) => ({
        ...p,
        extras: [...p.extras, { extraId: extras[0].id, cantidad: 1 }],
      }));
    }
  };

  const removeExtra = (i: number) => {
    setForm((p: any) => ({ ...p, extras: p.extras.filter((_: any, idx: number) => idx !== i) }));
  };

  const submit = async () => {
    if (!isPrecioFijo && !form.largo) { toast.error('El largo es requerido'); return; }
    setSaving(true);
    try {
      await onAdd({
        ...form,
        largo: isPrecioFijo ? 100 : Number(form.largo),
        alto: form.alto ? Number(form.alto) : undefined,
        ancho: form.ancho ? Number(form.ancho) : undefined,
        cantidad: Number(form.cantidad),
        countertopTypeId: form.countertopTypeId || undefined,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Tipo y material */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <FormGroup label="Tipo de mueble" required>
          <select className="input" value={form.furnitureTypeId} onChange={(e) => set('furnitureTypeId', e.target.value)}>
            {furnitureTypes.map((f) => <option key={f.id} value={f.id}>{f.nombre}</option>)}
          </select>
        </FormGroup>
        <FormGroup label="Material" required>
          <select className="input" value={form.materialId} onChange={(e) => set('materialId', e.target.value)}>
            {materials.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
          </select>
        </FormGroup>
      </div>

      {/* Dimensiones */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {!isPrecioFijo && (
          <FormGroup label="Largo (cm)" required>
            <input type="number" className="input" value={form.largo} onChange={(e) => set('largo', e.target.value)} placeholder="200" />
            {isCloset && (
              <p className="text-xs text-slate-400 mt-1">
                Se calcula como (Largo ÷ 100) × precio del catálogo para este rango de altura.
              </p>
            )}
            {fondoInfo && (
              <p className="text-xs text-wood-600 mt-1 font-medium">{fondoInfo}</p>
            )}
          </FormGroup>
        )}
        {needsAlto && (
          <FormGroup label="Alto (cm)">
            <input type="number" className="input" value={form.alto} onChange={(e) => set('alto', e.target.value)} placeholder="70" />
          </FormGroup>
        )}
        {needsAncho && (
          <FormGroup label="Ancho (cm)">
            <input type="number" className="input" value={form.ancho} onChange={(e) => set('ancho', e.target.value)} placeholder="90" />
          </FormGroup>
        )}
        <FormGroup label="Cantidad">
          <input type="number" min={1} className="input" value={form.cantidad} onChange={(e) => set('cantidad', e.target.value)} />
        </FormGroup>
      </div>

      {/* Sobre (encimera) */}
      {needsSobre && (
        <FormGroup label="Sobre (encimera)">
          <select className="input" value={form.countertopTypeId} onChange={(e) => set('countertopTypeId', e.target.value)}>
            <option value="">Sin sobre</option>
            {countertopTypes.map((c) => <option key={c.id} value={c.id}>{c.nombre} — ₡{Number(c.precioM2).toLocaleString()}/m²</option>)}
          </select>
        </FormGroup>
      )}

      {/* Opciones específicas por tipo */}
      {needsEstilo && (
        <FormGroup label="Estilo doble">
          <select className="input" value={form.estiloDoble} onChange={(e) => set('estiloDoble', e.target.value)}>
            <option value="FUNCIONAL">Funcional</option>
            <option value="FALSO">Falso</option>
          </select>
        </FormGroup>
      )}
      {needsCajon && (
        <div className="flex items-center gap-2">
          <input type="checkbox" id="cajon" checked={form.tipoCajonEspecial}
            onChange={(e) => set('tipoCajonEspecial', e.target.checked)} className="w-4 h-4 accent-wood-500" />
          <label htmlFor="cajon" className="text-sm font-medium text-slate-700">Tipo cajón especial</label>
        </div>
      )}
      {needsCascada && (
        <FormGroup label="Cascada">
          <select className="input" value={form.cascada} onChange={(e) => set('cascada', e.target.value)}>
            <option value="NINGUNA">Sin cascada</option>
            <option value="UN_LADO">Un lado</option>
            <option value="AMBOS_LADOS">Ambos lados</option>
          </select>
        </FormGroup>
      )}

      <FormGroup label="Nombre personalizado (opcional)">
        <input className="input" placeholder="Ej: Walking Closet — Cuarto principal" value={form.nombrePersonalizado || ''} onChange={(e) => set('nombrePersonalizado', e.target.value)} />
        <p className="text-xs text-slate-400 mt-1">Si lo dejás en blanco, en el PDF aparece el nombre técnico del tipo de mueble.</p>
      </FormGroup>
      <FormGroup label="Descripción">
        <input className="input" placeholder="Ej: Mueble bajo cocina lado derecho" value={form.descripcion} onChange={(e) => set('descripcion', e.target.value)} />
      </FormGroup>

      {/* Aviso para puertas: guarnición/barniz/vidrio se agregan abajo como Extras */}
      {isPuertaInterna && (
        <div className="p-3 bg-wood-50 border border-wood-200 rounded-lg text-xs text-wood-700">
          Tip: agregá Guarnición, Barniz o Vidrio en la sección de Extras abajo si esta puerta los requiere.
        </div>
      )}

      {/* Extras */}
      {!isPrecioFijo && (
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="label mb-0">Extras</label>
          <button type="button" className="btn-ghost btn-sm" onClick={addExtra}>
            <Plus size={13} /> Agregar extra
          </button>
        </div>
        {form.extras.map((ex: any, i: number) => (
          <div key={i} className="flex gap-2 mb-2">
            <select
              className="input flex-1"
              value={ex.extraId}
              onChange={(e) => {
                const updated = [...form.extras];
                updated[i] = { ...updated[i], extraId: e.target.value };
                set('extras', updated);
              }}
            >
              {extras.map((e) => <option key={e.id} value={e.id}>{e.nombre} — ₡{Number(e.precio).toLocaleString()}</option>)}
            </select>
            <input
              type="number" min={1} className="input w-20"
              value={ex.cantidad}
              onChange={(e) => {
                const updated = [...form.extras];
                updated[i] = { ...updated[i], cantidad: Number(e.target.value) };
                set('extras', updated);
              }}
            />
            <button className="btn-ghost btn-sm text-danger" onClick={() => removeExtra(i)}>
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
      )}

      <div className="flex justify-end gap-2 pt-2 border-t">
        <button className="btn-secondary" onClick={onClose}>Cancelar</button>
        <button className="btn-primary" onClick={submit} disabled={saving}>
          {saving ? <Spinner size="sm" /> : 'Agregar mueble'}
        </button>
      </div>
    </div>
  );
}

// ─── Item de cotización ─────────────────────────────────
function QuotationItemRow({ item, onDelete, onEdit,onNameUpdate, onFondoUpdate }: {
  item: QuotationItem;
    onDelete: (id: string) => void;
    onEdit: (item: QuotationItem) => void;
  onNameUpdate: (id: string, nombre: string | null) => void;
  onFondoUpdate: (id: string, fondo: string | null) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameVal, setNameVal] = useState(item.nombrePersonalizado || '');
  const [savingName, setSavingName] = useState(false);
  const [editingFondo, setEditingFondo] = useState(false);
  const [fondoVal, setFondoVal] = useState(item.fondoPersonalizado || '');
  const [savingFondo, setSavingFondo] = useState(false);

  const tipoNombre = item.furnitureType.nombre.toUpperCase();
  const fondoDefault =
    tipoNombre.includes('CLOSET') || tipoNombre.includes('BANIO') || tipoNombre === 'BASE' || tipoNombre === 'MUEBLE_TV'
      ? '50 cm'
      : tipoNombre === 'TORRE' || tipoNombre === 'ALACENA_REFRI' ? '65 cm' : null;
  const fondoDisplay = item.fondoPersonalizado || fondoDefault;

  const displayName = item.nombrePersonalizado || item.furnitureType.nombre;

  const saveName = async () => {
    setSavingName(true);
    try {
      await quotationsApi.updateItemName(item.id, nameVal.trim() || null);
      onNameUpdate(item.id, nameVal.trim() || null);
      setEditingName(false);
      toast.success('Nombre actualizado');
    } catch {
      toast.error('Error al actualizar el nombre');
    } finally {
      setSavingName(false);
    }
  };

  const saveFondo = async () => {
    setSavingFondo(true);
    try {
      await quotationsApi.updateItemFondo(item.id, fondoVal.trim() || null);
      onFondoUpdate(item.id, fondoVal.trim() || null);
      setEditingFondo(false);
      toast.success('Fondo actualizado');
    } catch {
      toast.error('Error al actualizar el fondo');
    } finally {
      setSavingFondo(false);
    }
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 bg-white">
        <button onClick={() => setExpanded(!expanded)} className="text-slate-400 hover:text-slate-600 shrink-0">
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        <div className="flex-1 min-w-0">
          {/* Nombre con edición inline */}
          {editingName ? (
            <div className="flex items-center gap-2 mb-1">
              <input
                className="input py-1 text-sm flex-1 min-w-0"
                value={nameVal}
                placeholder={item.furnitureType.nombre}
                onChange={(e) => setNameVal(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditingName(false); }}
                autoFocus
              />
              <button className="btn-ghost btn-sm text-green-600 p-1" onClick={saveName} disabled={savingName}>
                {savingName ? <Spinner size="sm" /> : <Check size={13} />}
              </button>
              <button className="btn-ghost btn-sm p-1" onClick={() => { setEditingName(false); setNameVal(item.nombrePersonalizado || ''); }}>
                <X size={13} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="font-semibold text-slate-900 text-sm">
                {displayName}
                {item.nombrePersonalizado && (
                  <span className="text-xs text-slate-400 font-normal ml-1">({item.furnitureType.nombre})</span>
                )}
              </p>
              <button
                className="btn-ghost p-0.5 text-slate-400 hover:text-slate-600"
                onClick={() => setEditingName(true)}
                title="Personalizar nombre para el PDF"
              >
                <Pencil size={11} />
              </button>
            </div>
          )}

          {/* Material, sobre y fondo con edición inline del fondo */}
          <p className="text-xs text-slate-500 flex items-center gap-1 flex-wrap">
            <span>{item.material.nombre}</span>
            {item.countertopType && <span className="text-slate-400"> · Sobre {item.countertopType.nombre}</span>}
            {editingFondo ? (
              <span className="flex items-center gap-1">
                · Fondo:
                <input
                  className="input py-0 px-1 text-xs w-20 h-5"
                  value={fondoVal}
                  placeholder="ej: 50 cm"
                  onChange={(e) => setFondoVal(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') saveFondo(); if (e.key === 'Escape') setEditingFondo(false); }}
                  autoFocus
                />
                <button className="text-green-600 p-0.5" onClick={saveFondo} disabled={savingFondo}>
                  {savingFondo ? <Spinner size="sm" /> : <Check size={11} />}
                </button>
                <button className="text-slate-400 p-0.5" onClick={() => { setEditingFondo(false); setFondoVal(item.fondoPersonalizado || ''); }}>
                  <X size={11} />
                </button>
              </span>
            ) : (
              fondoDisplay && (
                <span
                  className="text-wood-600 font-medium cursor-pointer hover:text-wood-800 flex items-center gap-0.5"
                  onClick={() => { setFondoVal(item.fondoPersonalizado || fondoDefault || ''); setEditingFondo(true); }}
                  title="Clic para personalizar el fondo en el PDF"
                >
                  · Fondo {fondoDisplay} <Pencil size={9} />
                </span>
              )
            )}
          </p>

          <p className="text-xs text-slate-400">
            Largo: {item.largo} cm
            {item.alto ? ` · Alto: ${item.alto} cm` : ''}
            {item.ancho ? ` · Ancho: ${item.ancho} cm` : ''}
            {` · Cant: ${item.cantidad}`}
          </p>
          {item.descripcion && (
            <p className="text-xs text-slate-400 italic mt-0.5">{item.descripcion}</p>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="font-bold text-slate-900">{formatCRC(item.subtotal)}</p>
          <p className="text-xs text-slate-400">{formatCRC(item.precioUnitario)} c/u</p>
              </div>

              <div className="flex items-center gap-1 ml-1 shrink-0">

                  <button
                      className="btn-ghost btn-sm text-wood-600"
                      onClick={() => onEdit(item)}
                      title="Editar mueble"
                  >
                      <Pencil size={14} />
                  </button>

                  <button
                      className="btn-ghost btn-sm text-danger"
                      onClick={() => onDelete(item.id)}
                      title="Eliminar"
                  >
                      <Trash2 size={14} />
                  </button>

              </div>
      </div>
      {expanded && item.quotationItemExtras.length > 0 && (
        <div className="bg-slate-50 px-6 py-3 border-t space-y-1">
          {item.quotationItemExtras.map((ex) => (
            <div key={ex.id} className="flex justify-between text-sm text-slate-600">
              <span>{ex.extra.nombre} × {ex.cantidad}</span>
              <span>{formatCRC(ex.subtotal)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── PÁGINA PRINCIPAL ──────────────────────────────────
export default function QuotationDetailPage({ id }: { id: string }) {
  const router = useRouter();
  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [loading, setLoading] = useState(true);
  const [catalog, setCatalog] = useState<any>({});
    const [showAddItem, setShowAddItem] = useState(false);
    const [editingItem, setEditingItem] = useState<QuotationItem | null>(null);
  const [showAddService, setShowAddService] = useState(false);
  const [confirmStatus, setConfirmStatus] = useState<string | null>(null);
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);
  const [deleteServiceId, setDeleteServiceId] = useState<string | null>(null);
  const [confirmDeleteQuotation, setConfirmDeleteQuotation] = useState(false);
  const [deletingQuotation, setDeletingQuotation] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [updatingIva, setUpdatingIva] = useState(false);
  const [showDiscount, setShowDiscount] = useState(false);
  const [discountForm, setDiscountForm] = useState({ monto: '', motivo: '' });
  const [updatingDiscount, setUpdatingDiscount] = useState(false);

  const load = async () => {
    const [q, furnitureTypes, materials, countertopTypes, extras, services] = await Promise.all([
      quotationsApi.get(id!),
      catalogApi.furnitureTypes(),
      catalogApi.materials(),
      catalogApi.countertopTypes(),
      catalogApi.extras(),
      catalogApi.services(),
    ]);
    setQuotation(q);
    setCatalog({
      furnitureTypes,
      materials,
      countertopTypes,
      extras: (extras as any[]).filter((e) => e.activo),
      services: (services as any[]).filter((s) => s.activo),
    });
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const handleAddItem = async (data: any) => {
    await quotationsApi.addItem(id!, data);
    toast.success('Mueble agregado');
    await load();
  };

  const handleDeleteItem = async () => {
    if (!deleteItemId) return;
    await quotationsApi.removeItem(deleteItemId);
    toast.success('Item eliminado');
    setDeleteItemId(null);
    await load();
  };

    const handleEditItem = async (data: any) => {
        if (!editingItem) return;

        await quotationsApi.updateItem(editingItem.id, data);

        toast.success("Mueble actualizado");

        setEditingItem(null);
        setShowAddItem(false);

        await load();
    };

  const handleRemoveService = async () => {
    if (!deleteServiceId) return;
    try {
      await quotationsApi.removeService(deleteServiceId);
      toast.success('Servicio eliminado');
      setDeleteServiceId(null);
      await load();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al eliminar servicio');
    }
  };

  const handleToggleIva = async () => {
    if (!quotation) return;
    setUpdatingIva(true);
    try {
      await quotationsApi.updateIva(id!, !quotation.incluirIva);
      toast.success(quotation.incluirIva ? 'IVA removido' : 'IVA (13%) aplicado');
      await load();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al actualizar IVA');
    } finally {
      setUpdatingIva(false);
    }
  };

  const handleUpdateDiscount = async () => {
    setUpdatingDiscount(true);
    try {
      await quotationsApi.updateDiscount(id!, Number(discountForm.monto) || 0, discountForm.motivo || undefined);
      toast.success(Number(discountForm.monto) > 0 ? 'Descuento aplicado' : 'Descuento removido');
      setShowDiscount(false);
      await load();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al actualizar descuento');
    } finally {
      setUpdatingDiscount(false);
    }
  };

  const handleDeleteQuotation = async () => {
    setDeletingQuotation(true);
    try {
      await quotationsApi.delete(id!);
      toast.success('Cotización eliminada');
      router.push(`/proyectos/${quotation?.project?.id || quotation?.projectId}`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al eliminar cotización');
      setConfirmDeleteQuotation(false);
    } finally {
      setDeletingQuotation(false);
    }
  };

  const handleStatusChange = async () => {
    if (!confirmStatus) return;
    setSavingStatus(true);
    try {
      await quotationsApi.updateStatus(id!, confirmStatus);
      toast.success(`Cotización marcada como ${confirmStatus}`);
      setConfirmStatus(null);
      await load();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al cambiar estado');
    } finally {
      setSavingStatus(false);
    }
  };

  const [serviceForm, setServiceForm] = useState({ serviceId: '', cantidad: 1, montoManual: '', usarMontoManual: false });
  const [savingService, setSavingService] = useState(false);

  const selectedService: Service | undefined = catalog.services?.find((s: Service) => s.id === serviceForm.serviceId);
  const serviceNombre = (selectedService?.nombre || '').toUpperCase();
  const isTransporte = serviceNombre.includes('TRANSPORT');
  const isInstalacion = serviceNombre.includes('INSTALAC');

  const handleAddService = async () => {
    if (!serviceForm.serviceId) { toast.error('Selecciona un servicio'); return; }
    if (serviceForm.usarMontoManual && !serviceForm.montoManual) {
      toast.error('Ingresá el monto'); return;
    }
    setSavingService(true);
      try {
          console.log("ENVIANDO", {
              serviceId: serviceForm.serviceId,
              cantidad: serviceForm.cantidad,
              montoManual: serviceForm.usarMontoManual
                  ? Number(serviceForm.montoManual)
                  : undefined,
          });


      await quotationsApi.addService(id!, {
        serviceId: serviceForm.serviceId,
        cantidad: serviceForm.cantidad,
        montoManual: serviceForm.usarMontoManual ? Number(serviceForm.montoManual) : undefined,
      });
      toast.success('Servicio agregado');
      setShowAddService(false);
      await load();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error');
    } finally {
      setSavingService(false);
    }
  };

  useEffect(() => {
    if (catalog.services?.length) {
      setServiceForm((p) => ({ ...p, serviceId: catalog.services[0].id }));
    }
  }, [catalog.services]);

  // Reiniciar opciones específicas al cambiar de servicio
  useEffect(() => {
    setServiceForm((p) => ({ ...p, cantidad: 1, montoManual: '', usarMontoManual: false }));
  }, [serviceForm.serviceId]);

  const handleDownloadPDF = async () => {
    setDownloadingPdf(true);
    try {
      const filename = `Cotizacion-v${quotation!.version}-${quotation!.project?.nombreProyecto?.replace(/\s+/g,'_') || ''}.pdf`;
      await pdfApi.downloadQuotation(id!, filename);
      toast.success('PDF descargado');
    } catch {
      toast.error('Error al generar PDF');
    } finally {
      setDownloadingPdf(false);
    }
  };

    const handleCancelApproval = async () => {
        if (!confirm("¿Desea anular la aprobación de esta cotización? Se eliminará la venta, pagos, recibos y plan de pagos.")) {
            return;
        }

        try {
            await quotationsApi.cancelApproval(quotation.id);

            toast.success("Aprobación anulada");

            await load(); // vuelve a cargar la cotización
        } catch (err: any) {
            toast.error(err.response?.data?.error || "No se pudo anular la aprobación");
        }
    };


  if (loading || !quotation) return <PageLoader />;

  const isEditable = quotation.estado === 'BORRADOR';
  const projectId = quotation.project?.id || quotation.projectId;

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <Link href={`/proyectos/${quotation?.project?.id || ''}`} className="btn-ghost btn-sm shrink-0"><ArrowLeft size={14} /></Link>
          <div className="min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="page-title mb-0">
                Cotización v{quotation.version}
              </h1>
              <QuotationBadge status={quotation.estado} />
            </div>
            <p className="text-sm text-slate-500 mt-0.5 truncate">
              {quotation.project?.nombreProyecto} · {quotation.project?.client?.nombre}
            </p>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-2 flex-wrap sm:justify-end">
          {isEditable && (
            <button className="btn-secondary" onClick={() => setConfirmStatus('ENVIADA')}>
              <Send size={14} /> Enviar
            </button>
          )}

          {/* Botón PDF siempre visible */}
          <button
            className="btn-secondary"
            onClick={handleDownloadPDF}
            disabled={downloadingPdf}
            title="Descargar PDF"
          >
            {downloadingPdf ? <Spinner size="sm" /> : <><Download size={14} /> PDF</>}
          </button>

          {/* Eliminar cotización */}
          <button
            className="btn-ghost text-danger hover:bg-red-50"
            onClick={() => setConfirmDeleteQuotation(true)}
            title="Eliminar cotización"
          >
            <Trash2 size={14} />
          </button>

          {quotation.estado === 'ENVIADA' && (
            <>
              <button className="btn-primary" onClick={() => setConfirmStatus('APROBADA')}>
                <CheckCircle size={14} /> Aprobar
              </button>
              <button className="btn-danger" onClick={() => setConfirmStatus('RECHAZADA')}>
                <XCircle size={14} /> Rechazar
              </button>
            </>
                  )}

                  {quotation.estado === 'APROBADA' && (
                      <button
                          className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                          onClick={handleCancelApproval}
                      >
                          <XCircle size={14} />
                          Anular aprobación
                      </button>
                  )}
        </div>
      </div>

      {/* Muebles */}
      <div className="card">
        <div className="card-header">
          <h2 className="font-display font-bold text-slate-900">Muebles</h2>
          {isEditable && (
                      <button className="btn-primary btn-sm" onClick={() => {
                          setEditingItem(null);
                          setShowAddItem(true);
                      }}>
              <Plus size={13} /> Agregar mueble
            </button>
          )}
        </div>
        <div className="p-4 space-y-2">
          {!quotation.quotationItems?.length ? (
            <p className="text-center py-8 text-slate-400 text-sm">Sin muebles — agrega el primero</p>
          ) : (
            quotation.quotationItems.map((item) => (
              <QuotationItemRow
                key={item.id}
                    item={item}

                onDelete={isEditable ? (iid) => setDeleteItemId(iid) : () => {}}
                    onEdit={(item) => {
                        setEditingItem(item);
                        setShowAddItem(true);
                    }}
                    onNameUpdate={(iid, nombre) => {
                  setQuotation((q) => q ? ({
                    ...q,
                    quotationItems: q.quotationItems.map((it) =>
                      it.id === iid ? { ...it, nombrePersonalizado: nombre } : it
                    ),
                  }) : q);
                }}
                onFondoUpdate={(iid, fondo) => {
                  setQuotation((q) => q ? ({
                    ...q,
                    quotationItems: q.quotationItems.map((it) =>
                      it.id === iid ? { ...it, fondoPersonalizado: fondo } : it
                    ),
                  }) : q);
                }}
              />
            ))
          )}
        </div>
      </div>

      {/* Servicios */}
      <div className="card">
        <div className="card-header">
          <h2 className="font-display font-bold text-slate-900">Servicios</h2>
          {isEditable && (
            <button className="btn-secondary btn-sm" onClick={() => setShowAddService(true)}>
              <Plus size={13} /> Agregar servicio
            </button>
          )}
        </div>
        <div className="px-4 py-3 space-y-1">
          {!quotation.quotationServices?.length ? (
            <p className="text-sm text-slate-400 py-4 text-center">Sin servicios</p>
          ) : (
            quotation.quotationServices.map((qs) => (
              <div key={qs.id} className="flex items-center justify-between text-sm py-1.5 group">
                <span className="text-slate-700">{qs.service.nombre} × {qs.cantidad}</span>
                <div className="flex items-center gap-3">
                  <span className="font-semibold">{formatCRC(qs.subtotal)}</span>
                  {isEditable && (
                    <button
                      className="opacity-0 group-hover:opacity-100 text-danger transition-opacity"
                      onClick={() => setDeleteServiceId(qs.id)}
                      title="Eliminar servicio"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Total */}
      <div className="card card-body">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-slate-600">
            <span>Subtotal muebles</span>
            <span>{formatCRC(quotation.subtotal)}</span>
          </div>
          {quotation.quotationServices?.map((qs) => (
            <div key={qs.id} className="flex justify-between text-slate-500">
              <span>{qs.service.nombre}</span>
              <span>{formatCRC(qs.subtotal)}</span>
            </div>
          ))}

          {/* Descuento */}
          {Number(quotation.descuento) > 0 && (
            <div className="flex justify-between text-wood-700 font-medium">
              <span className="flex items-center gap-1.5">
                Descuento
                {quotation.descuentoMotivo && <span className="text-xs text-slate-400 font-normal">({quotation.descuentoMotivo})</span>}
              </span>
              <span>- {formatCRC(quotation.descuento)}</span>
            </div>
          )}
          {isEditable && (
            <div>
              {showDiscount ? (
                <div className="bg-slate-50 rounded-lg p-3 space-y-2">
                  <p className="text-xs font-semibold text-slate-600">Descuento</p>
                  <MoneyInput
                    value={discountForm.monto}
                    onChange={(v) => setDiscountForm((p) => ({ ...p, monto: v }))}
                    placeholder="0"
                    className="py-1.5 text-sm"
                  />
                  <input
                    className="input py-1.5 text-sm"
                    value={discountForm.motivo}
                    onChange={(e) => setDiscountForm((p) => ({ ...p, motivo: e.target.value }))}
                    placeholder="Motivo (ej: cliente frecuente)"
                  />
                  <div className="flex gap-2">
                    <button className="btn-primary btn-sm" onClick={handleUpdateDiscount} disabled={updatingDiscount}>
                      {updatingDiscount ? <Spinner size="sm" /> : 'Aplicar'}
                    </button>
                    {Number(quotation.descuento) > 0 && (
                      <button className="btn-ghost btn-sm text-danger" onClick={() => { setDiscountForm({ monto: '0', motivo: '' }); handleUpdateDiscount(); }}>
                        Quitar descuento
                      </button>
                    )}
                    <button className="btn-ghost btn-sm" onClick={() => setShowDiscount(false)}>Cancelar</button>
                  </div>
                </div>
              ) : (
                <button
                  className="btn-ghost btn-sm text-slate-500 hover:text-slate-700"
                  onClick={() => { setDiscountForm({ monto: String(Number(quotation.descuento) || ''), motivo: quotation.descuentoMotivo || '' }); setShowDiscount(true); }}
                >
                  <Percent size={13} /> {Number(quotation.descuento) > 0 ? 'Editar descuento' : 'Agregar descuento'}
                </button>
              )}
            </div>
          )}

          {/* IVA toggle */}
          <div className="flex items-center justify-between pt-2 border-t">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={quotation.incluirIva}
                disabled={!isEditable || updatingIva}
                onChange={handleToggleIva}
                className="w-4 h-4 accent-wood-500"
              />
              <span className="flex items-center gap-1 text-slate-600">
                <Percent size={13} /> Aplicar IVA (13%)
              </span>
              {updatingIva && <Spinner size="sm" />}
            </label>
            {quotation.incluirIva && (
              <span className="font-semibold text-slate-700">{formatCRC(quotation.ivaMonto)}</span>
            )}
          </div>

          <div className="flex justify-between font-bold text-lg text-slate-900 border-t pt-3 mt-2">
            <span>Total</span>
            <span className="text-wood-600">{formatCRC(quotation.total)}</span>
          </div>
        </div>
      </div>

      {/* Modal agregar mueble */}
      {showAddItem && (
              <Modal title={editingItem ? "Editar mueble" : "Agregar mueble"} onClose={() => {
                  setShowAddItem(false);
                  setEditingItem(null);
              }} size="lg">
          <AddItemForm
            furnitureTypes={catalog.furnitureTypes || []}
            materials={catalog.materials || []}
            countertopTypes={catalog.countertopTypes || []}
            extras={catalog.extras || []}
            item={editingItem}

            onAdd={editingItem ? handleEditItem : handleAddItem}
                 onClose={() => {
                    setShowAddItem(false);
                    setEditingItem(null);
                 }}
          />
        </Modal>
      )}

      {/* Modal agregar servicio */}
      {showAddService && (
        <Modal title="Agregar servicio" onClose={() => setShowAddService(false)} size="sm">
          <div className="space-y-4">
            <FormGroup label="Servicio">
              <select className="input" value={serviceForm.serviceId} onChange={(e) => setServiceForm((p) => ({ ...p, serviceId: e.target.value }))}>
                {catalog.services?.map((s: Service) => (
                  <option key={s.id} value={s.id}>{s.nombre} — {formatCRC(s.precioBase)}</option>
                ))}
              </select>
            </FormGroup>

            {/* Transporte: cobra por kilómetro */}
            {isTransporte && !serviceForm.usarMontoManual && (
              <FormGroup label="Kilómetros">
                <input type="number" min={0} step="0.1" className="input" value={serviceForm.cantidad}
                  onChange={(e) => setServiceForm((p) => ({ ...p, cantidad: Number(e.target.value) }))}
                  placeholder="Ej: 12" />
                <p className="text-xs text-slate-400 mt-1">
                  {selectedService && `${formatCRC(selectedService.precioBase)} × ${serviceForm.cantidad || 0} km = `}
                  <span className="font-semibold">
                    {selectedService && formatCRC(Number(selectedService.precioBase) * (Number(serviceForm.cantidad) || 0))}
                  </span>
                </p>
              </FormGroup>
            )}

            {/* Cantidad genérica para otros servicios (no transporte, no instalación) */}
            {!isTransporte && !isInstalacion && !serviceForm.usarMontoManual && (
              <FormGroup label="Cantidad">
                <input type="number" min={1} className="input" value={serviceForm.cantidad}
                  onChange={(e) => setServiceForm((p) => ({ ...p, cantidad: Number(e.target.value) }))} />
              </FormGroup>
            )}

            {/* Instalación o cualquier servicio: permitir monto manual acordado */}
            {(isInstalacion || !isTransporte) && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox" id="montoManual"
                  checked={serviceForm.usarMontoManual}
                  onChange={(e) => setServiceForm((p) => ({ ...p, usarMontoManual: e.target.checked }))}
                  className="w-4 h-4 accent-wood-500"
                />
                <label htmlFor="montoManual" className="text-sm font-medium text-slate-700">
                  Definir un monto acordado manualmente
                </label>
              </div>
            )}

            {serviceForm.usarMontoManual && (
              <FormGroup label="Monto (₡)" required>
                <MoneyInput
                  value={serviceForm.montoManual}
                  onChange={(v) => setServiceForm((p) => ({ ...p, montoManual: v }))}
                  placeholder="80 000"
                />
              </FormGroup>
            )}

            <div className="flex justify-end gap-2">
              <button className="btn-secondary" onClick={() => setShowAddService(false)}>Cancelar</button>
              <button className="btn-primary" onClick={handleAddService} disabled={savingService}>
                {savingService ? <Spinner size="sm" /> : 'Agregar'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Confirm cambio de estado */}
      {confirmStatus && (
        <Confirm
          message={`¿Marcar esta cotización como "${confirmStatus}"?${confirmStatus === 'APROBADA' ? ' Esto creará la venta automáticamente.' : ''}`}
          onConfirm={handleStatusChange}
          onCancel={() => setConfirmStatus(null)}
          loading={savingStatus}
        />
      )}

      {/* Confirm delete item */}
      {deleteItemId && (
        <Confirm
          message="¿Eliminar este mueble de la cotización?"
          onConfirm={handleDeleteItem}
          onCancel={() => setDeleteItemId(null)}
        />
      )}

      {/* Confirm delete service */}
      {deleteServiceId && (
        <Confirm
          message="¿Eliminar este servicio de la cotización?"
          onConfirm={handleRemoveService}
          onCancel={() => setDeleteServiceId(null)}
        />
      )}

      {/* Confirm delete quotation */}
      {confirmDeleteQuotation && (
        <Confirm
          message={
            quotation.estado === 'APROBADA'
              ? '¿Eliminar esta cotización? Tiene una VENTA asociada — se eliminarán también sus pagos y recibos. Esta acción no se puede deshacer.'
              : '¿Eliminar esta cotización completa? Esta acción no se puede deshacer.'
          }
          onConfirm={handleDeleteQuotation}
          onCancel={() => setConfirmDeleteQuotation(false)}
          loading={deletingQuotation}
        />
      )}
    </div>
  );
}
