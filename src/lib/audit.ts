import { prisma } from '@/lib/prisma';

// ─── Catálogo y precios ─────────────────────────────
export async function logCatalogChange(params: {
  userId: string;
  modulo: 'MATERIALES' | 'TIPOS_MUEBLE' | 'TABLETOPS' | 'EXTRAS' | 'SERVICIOS' | 'PRECIOS';
  accion: 'CREAR' | 'EDITAR' | 'ELIMINAR';
  entidadId?: string;
  entidadNombre?: string;
  valorAnterior?: any;
  valorNuevo?: any;
}) {
  await (prisma as any).catalogAuditLog.create({
    data: {
      userId: params.userId,
      modulo: params.modulo,
      accion: params.accion,
      entidadId: params.entidadId,
      entidadNombre: params.entidadNombre,
      valorAnterior: params.valorAnterior ?? undefined,
      valorNuevo: params.valorNuevo ?? undefined,
    },
  }).catch((err: any) => console.error('Error registrando bitácora de catálogo:', err));
}

// ─── Inventario ──────────────────────────────────────
export async function logInventoryMovement(params: {
  userId: string;
  itemId?: string;
  itemNombre: string;
  tipoMovimiento: 'ENTRADA' | 'SALIDA' | 'CREAR' | 'EDITAR' | 'ELIMINAR';
  cantidad?: number;
  detalle?: any;
}) {
  await (prisma as any).inventoryAuditLog.create({
    data: {
      userId: params.userId,
      itemId: params.itemId,
      itemNombre: params.itemNombre,
      tipoMovimiento: params.tipoMovimiento,
      cantidad: params.cantidad,
      detalle: params.detalle ?? undefined,
    },
  }).catch((err: any) => console.error('Error registrando bitácora de inventario:', err));
}

// ─── Correcciones de horario ─────────────────────────
export async function logTimesheetCorrection(params: {
  adminId: string;
  trabajadorId: string;
  timesheetEntryId: string;
  campo: string;
  valorAnterior?: string | null;
  valorNuevo?: string | null;
  motivo?: string | null;
}) {
  await (prisma as any).timesheetAuditLog.create({
    data: {
      adminId: params.adminId,
      trabajadorId: params.trabajadorId,
      timesheetEntryId: params.timesheetEntryId,
      campo: params.campo,
      valorAnterior: params.valorAnterior ?? null,
      valorNuevo: params.valorNuevo ?? null,
      motivo: params.motivo ?? null,
    },
  }).catch((err: any) => console.error('Error registrando bitácora de horario:', err));
}
