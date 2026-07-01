// Shared type enums used in API routes
export enum QuotationStatus {
  BORRADOR   = 'BORRADOR',
  ENVIADA    = 'ENVIADA',
  APROBADA   = 'APROBADA',
  RECHAZADA  = 'RECHAZADA',
}

export enum ProjectStatus {
  PENDIENTE   = 'PENDIENTE',
  EN_PROCESO  = 'EN_PROCESO',
  EN_PAUSA    = 'EN_PAUSA',
  FINALIZADO  = 'FINALIZADO',
  CANCELADO   = 'CANCELADO',
}

export interface AuthRequest {
  userId: string;
  roleId: string;
  roleName: string;
}
