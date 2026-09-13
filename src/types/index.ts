// ─── ENUMS ─────────────────────────────────────────────
export type ProjectStatus   = 'COTIZACION' | 'APROBADO' | 'PRODUCCION' | 'INSTALACION' | 'FINALIZADO' | 'CANCELADO';
export type QuotationStatus = 'BORRADOR' | 'ENVIADA' | 'APROBADA' | 'RECHAZADA';
export type SaleStatus      = 'ACTIVA' | 'FINALIZADA' | 'CANCELADA';
export type StageStatus     = 'PENDIENTE' | 'EN_PROCESO' | 'COMPLETADO';

// Runtime constants (para usar como valores, no solo como tipos)
export const PROJECT_STATUSES   = ['COTIZACION','APROBADO','PRODUCCION','INSTALACION','FINALIZADO','CANCELADO'] as const;
export const QUOTATION_STATUSES = ['BORRADOR','ENVIADA','APROBADA','RECHAZADA'] as const;
export const STAGE_STATUSES     = ['PENDIENTE','EN_PROCESO','COMPLETADO'] as const;

// ─── ENTIDADES ─────────────────────────────────────────
export interface Client {
  id: string;
  nombre: string;
  telefono?: string;
  correo?: string;
  direccion?: string;
  observaciones?: string;
  createdAt: string;
  _count?: { projects: number };
}

export interface Project {
  id: string;
  clientId: string;
  client?: Client;
  nombreProyecto: string;
  ubicacion?: string;
  descripcion?: string;
  estado: ProjectStatus;
  fechaInstalacionTentativa?: string;
  createdAt: string;
  quotations?: Quotation[];
  productionStages?: ProductionStage[];
  sale?: Sale;
  _count?: { quotations: number; payments: number };
}

export interface FurnitureType {
  id: string;
  nombre: string;
  precioBase: string; // Prisma Decimal → string
}

export interface Material {
  id: string;
  nombre: string;
  descripcion?: string;
}

export interface CountertopType {
  id: string;
  nombre: string;
  precioM2: string;
}

export interface Extra {
  id: string;
  nombre: string;
  precio: string;
  unidad?: string;
  activo: boolean;
}

export interface Service {
  id: string;
  nombre: string;
  precioBase: string;
  activo: boolean;
}

export interface QuotationItemExtra {
  id: string;
  extra: Extra;
  cantidad: number;
  subtotal: string;
}

export interface QuotationItem {
  id: string;
  furnitureType: FurnitureType;
  material: Material;
  countertopType?: CountertopType;
  descripcion?: string;
  nombrePersonalizado?: string | null;
  fondoPersonalizado?: string | null;
  largo: string;
  alto?: string;
  ancho?: string;
  cantidad: number;
  precioUnitario: string;
  subtotal: string;
  quotationItemExtras: QuotationItemExtra[];
}

export interface QuotationService {
  id: string;
  service: Service;
  cantidad: number;
  subtotal: string;
}

export interface Quotation {
  id: string;
  projectId: string;
  project?: Project;
  version: number;
  subtotal: string;
  descuento: string;
  descuentoMotivo?: string | null;
  incluirIva: boolean;
  ivaMonto: string;
  total: string;
  estado: QuotationStatus;
  createdAt: string;
  quotationItems?: QuotationItem[];
  quotationServices?: QuotationService[];
}

export interface Sale {
  id: string;
  projectId: string;
  quotationId: string;
  total: string;
  estado: SaleStatus;
  fecha: string;
}

export interface Payment {
  id: string;
  projectId: string;
  monto: string;
  metodoPago: string;
  comprobanteUrl?: string;
  observaciones?: string;
  fechaPago: string;
  receipt?: Receipt;
  _count?: { receiptFiles: number };
}

export interface Receipt {
  id: string;
  numeroRecibo: string;
  pdfUrl?: string;
  fechaGeneracion: string;
}

export interface PaymentSchedule {
  id: string;
  descripcion?: string;
  porcentaje: string;
  fechaEstimada?: string;
  pagado: boolean;
}

export interface ProductionStage {
  id: string;
  etapa: string;
  estado: StageStatus;
  fechaInicio?: string;
  fechaFin?: string;
}

export interface InventoryItem {
  id: string;
  nombre: string;
  categoria?: string;
  unidadMedida?: string;
  stockActual: string;
  stockMinimo: string;
}

export interface User {
  id: string;
  nombre: string;
  correo: string;
  activo: boolean;
  role: { id: string; nombre: string };
}

// ─── HELPERS ───────────────────────────────────────────
export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  COTIZACION: 'Cotización',
  APROBADO: 'Aprobado',
  PRODUCCION: 'En Producción',
  INSTALACION: 'En Instalación',
  FINALIZADO: 'Finalizado',
  CANCELADO: 'Cancelado',
};

export const QUOTATION_STATUS_LABELS: Record<QuotationStatus, string> = {
  BORRADOR: 'Borrador',
  ENVIADA: 'Enviada',
  APROBADA: 'Aprobada',
  RECHAZADA: 'Rechazada',
};

export const formatCRC = (value: string | number): string => {
  const num = Number(value);
  const formatted = new Intl.NumberFormat('es-CR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
  return '₡' + formatted;
};

export const formatDate = (date?: string) =>
  date ? new Date(date).toLocaleDateString('es-CR') : '—';

// ─── CALENDARIO ─────────────────────────────────────────
export interface CalendarEvent {
  id: string;
  dbId?: string;            // ID real en BD (para eventos personalizados)
  type: 'INSTALACION' | 'COBRO' | 'MEDICION' | 'TALLER' | 'REUNION' | 'OTRO';
  title: string;
  description?: string;
  date: string;
  projectId?: string;
  projectName?: string;
  clientName?: string;
  estado?: string;
  porcentaje?: number | null;
  monto?: number | null;
  editable?: boolean;
    createdBy?: string;
    audiencia?: string;
}
