import axios from 'axios';

// En Next.js el frontend llama a /api (mismo dominio) — no se necesita URL separada del backend
const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('wm_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('wm_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const authApi = {
  login: (correo: string, password: string) =>
    api.post('/auth/login', { correo, password }).then((r) => r.data.data),
  me: () => api.get('/auth/me').then((r) => r.data.data),
};

// ─── CLIENTES ──────────────────────────────────────────
export const clientsApi = {
  list: () => api.get('/clients').then((r) => r.data.data),
  get: (id: string) => api.get(`/clients/${id}`).then((r) => r.data.data),
  create: (data: any) => api.post('/clients', data).then((r) => r.data.data),
  update: (id: string, data: any) => api.put(`/clients/${id}`, data).then((r) => r.data.data),
  delete: (id: string) => api.delete(`/clients/${id}`).then((r) => r.data),
};

// ─── PROYECTOS ─────────────────────────────────────────
export const projectsApi = {
  list: () => api.get('/projects').then((r) => r.data.data),
  get: (id: string) => api.get(`/projects/${id}`).then((r) => r.data.data),
  create: (data: any) => api.post('/projects', data).then((r) => r.data.data),
  update: (id: string, data: any) => api.put(`/projects/${id}`, data).then((r) => r.data.data),
  updateStatus: (id: string, estado: string) =>
    api.patch(`/projects/${id}/status`, { estado }).then((r) => r.data.data),
  updateStage: (id: string, stageId: string, data: any) =>
    api.patch(`/projects/${id}/stages/${stageId}`, data).then((r) => r.data.data),
  delete: (id: string) =>
    api.delete(`/projects/${id}`).then((r) => r.data),
};

// ─── COTIZACIONES ──────────────────────────────────────
export const quotationsApi = {
  list: (projectId?: string) =>
    api.get('/quotations', { params: { projectId } }).then((r) => r.data.data),
  get: (id: string) => api.get(`/quotations/${id}`).then((r) => r.data.data),
  create: (projectId: string) =>
    api.post('/quotations', { projectId }).then((r) => r.data.data),
  updateStatus: (id: string, estado: string) =>
    api.patch(`/quotations/${id}/status`, { estado }).then((r) => r.data.data),
  delete: (id: string) =>
    api.delete(`/quotations/${id}`).then((r) => r.data),
  updateIva: (id: string, incluirIva: boolean) =>
    api.patch(`/quotations/${id}/iva`, { incluirIva }).then((r) => r.data.data),
  updateDiscount: (id: string, descuento: number, descuentoMotivo?: string) =>
    api.patch(`/quotations/${id}/discount`, { descuento, descuentoMotivo }).then((r) => r.data.data),
  addItem: (id: string, data: any) =>
    api.post(`/quotations/${id}/items`, data).then((r) => r.data.data),
  removeItem: (itemId: string) =>
    api.delete(`/quotations/items/${itemId}`).then((r) => r.data),
  updateItemName: (itemId: string, nombrePersonalizado: string | null) =>
    api.patch(`/quotations/items/${itemId}/name`, { nombrePersonalizado }).then((r) => r.data.data),
  updateItemFondo: (itemId: string, fondoPersonalizado: string | null) =>
    api.patch(`/quotations/items/${itemId}/fondo`, { fondoPersonalizado }).then((r) => r.data.data),
  addService: (id: string, data: any) =>
    api.post(`/quotations/${id}/services`, data).then((r) => r.data.data),
  removeService: (serviceQuotationId: string) =>
    api.delete(`/quotations/services/${serviceQuotationId}`).then((r) => r.data),
};

// ─── PAGOS ─────────────────────────────────────────────
export const paymentsApi = {
  byProject: (projectId: string) =>
    api.get(`/projects/${projectId}/payments`).then((r) => r.data.data),
  create: (data: any) => api.post('/payments', data).then((r) => r.data.data),
  getSchedule: (projectId: string) =>
    api.get(`/projects/${projectId}/payment-schedule`).then((r) => r.data.data),
  setSchedule: (projectId: string, cuotas: any[]) =>
    api.post(`/projects/${projectId}/payment-schedule`, { cuotas }).then((r) => r.data.data),
};

// ─── CATÁLOGO ──────────────────────────────────────────
export const catalogApi = {
  furnitureTypes: () => api.get('/catalog/furniture-types').then((r) => r.data.data),
  createFurnitureType: (data: { nombre: string; precioBase: number }) =>
    api.post('/catalog/furniture-types', data).then((r) => r.data.data),
  updateFurniturePrice: (id: string, precioBase: number) =>
    api.patch(`/catalog/furniture-types/${id}/price`, { precioBase }).then((r) => r.data.data),
  deleteFurnitureType: (id: string) =>
    api.delete(`/catalog/furniture-types/${id}`).then((r) => r.data),

  materials: () => api.get('/catalog/materials').then((r) => r.data.data),
  deleteMaterial: (id: string) =>
    api.delete(`/catalog/materials/${id}`).then((r) => r.data),

  countertopTypes: () => api.get('/catalog/countertop-types').then((r) => r.data.data),
  createCountertopType: (data: { nombre: string; precioM2: number }) =>
    api.post('/catalog/countertop-types', data).then((r) => r.data.data),
  updateCountertopPrice: (id: string, precioM2: number) =>
    api.patch(`/catalog/countertop-types/${id}/price`, { precioM2 }).then((r) => r.data.data),
  deleteCountertopType: (id: string) =>
    api.delete(`/catalog/countertop-types/${id}`).then((r) => r.data),

  extras: () => api.get('/catalog/extras').then((r) => r.data.data),
  createExtra: (data: { nombre: string; precio: number; unidad?: string }) =>
    api.post('/catalog/extras', data).then((r) => r.data.data),
  updateExtra: (id: string, data: { nombre: string; precio: number; unidad?: string }) =>
    api.put(`/catalog/extras/${id}`, data).then((r) => r.data.data),
  toggleExtra: (id: string) =>
    api.patch(`/catalog/extras/${id}/toggle`).then((r) => r.data.data),
  deleteExtra: (id: string) =>
    api.delete(`/catalog/extras/${id}`).then((r) => r.data),

  services: () => api.get('/catalog/services').then((r) => r.data.data),
  createService: (data: { nombre: string; precioBase: number }) =>
    api.post('/catalog/services', data).then((r) => r.data.data),
  updateService: (id: string, data: { nombre: string; precioBase: number }) =>
    api.put(`/catalog/services/${id}`, data).then((r) => r.data.data),
  toggleService: (id: string) =>
    api.patch(`/catalog/services/${id}/toggle`).then((r) => r.data.data),
  deleteService: (id: string) =>
    api.delete(`/catalog/services/${id}`).then((r) => r.data),
};

// ─── PRECIOS POR MATERIAL ──────────────────────────────────
export const materialPricesApi = {
  list: () => api.get('/catalog/material-prices').then((r) => r.data.data),
  upsert: (data: { furnitureTypeId: string; materialId: string; precio: number; precioBase210?: number; costoExtraCm?: number }) =>
    api.post('/catalog/material-prices', data).then((r) => r.data.data),
};

// ─── INVENTARIO ────────────────────────────────────────
export const inventoryApi = {
  list: () => api.get('/inventory').then((r) => r.data.data),
  create: (data: any) => api.post('/inventory', data).then((r) => r.data.data),
  updateStock: (id: string, data: any) =>
    api.patch(`/inventory/${id}/stock`, data).then((r) => r.data.data),
  adjust: (id: string, cantidad: number, operacion: 'ENTRADA' | 'SALIDA') =>
    api.post(`/inventory/${id}/adjust`, { cantidad, operacion }).then((r) => r.data.data),
};

// ─── USUARIOS ──────────────────────────────────────────
export const usersApi = {
  list: () => api.get('/users').then((r) => r.data.data),
  roles: () => api.get('/roles').then((r) => r.data.data),
  create: (data: any) => api.post('/users', data).then((r) => r.data.data),
  update: (id: string, data: any) => api.put(`/users/${id}`, data).then((r) => r.data.data),
  delete: (id: string) => api.delete(`/users/${id}`).then((r) => r.data),
  toggle: (id: string) => api.patch(`/users/${id}/toggle`).then((r) => r.data.data),
};

// ─── PDFs ──────────────────────────────────────────────
export const pdfApi = {
  quotationUrl:  (id: string) => `/api/quotations/${id}/pdf`,
  previewUrl:    (id: string) => `/api/quotations/${id}/preview`,
  receiptUrl:    (paymentId: string) => `/api/payments/${paymentId}/receipt/pdf`,

  downloadQuotation: async (id: string, filename: string) => {
    const token = localStorage.getItem('wm_token');
    const res = await fetch(`/api/quotations/${id}/pdf`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Error al generar PDF');
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  },

  downloadReceipt: async (paymentId: string, filename: string) => {
    const token = localStorage.getItem('wm_token');
    const res = await fetch(`/api/payments/${paymentId}/receipt/pdf`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Error al generar recibo');
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  },
};

// ─── ARCHIVOS DE PROYECTO ──────────────────────────────
export const filesApi = {
  list: (projectId: string) =>
    api.get(`/projects/${projectId}/files`).then((r) => r.data.data),
  upload: (projectId: string, file: File, tipo: string) => {
    const form = new FormData();
    form.append('archivo', file);
    form.append('tipo', tipo);
    return api.post(`/projects/${projectId}/files`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data.data);
  },
  delete: (fileId: string) =>
    api.delete(`/projects/files/${fileId}`).then((r) => r.data),
};

// ─── CALENDARIO ─────────────────────────────────────────
export const calendarApi = {
  events: () => api.get('/calendar/events').then((r) => r.data.data),
  createEvent: (data: { titulo: string; descripcion?: string; fecha: string; tipo: string; projectId?: string }) =>
    api.post('/calendar/events', data).then((r) => r.data.data),
  updateEvent: (id: string, data: Partial<{ titulo: string; descripcion: string; fecha: string; tipo: string; projectId: string }>) =>
    api.put(`/calendar/events/${id}`, data).then((r) => r.data.data),
  deleteEvent: (id: string) =>
    api.delete(`/calendar/events/${id}`).then((r) => r.data),
};

// ─── TIMESHEET ──────────────────────────────────────────
export const timesheetApi = {
  // Empleado/Trabajador
  today: () => api.get('/timesheet/today').then((r) => r.data),
  clockIn: () => api.post('/timesheet/entry').then((r) => r.data),
  clockOut: (id: string, observaciones?: string) =>
    api.patch(`/timesheet/entry/${id}/clock-out`, { observaciones }).then((r) => r.data),
  startBreak: (id: string, tipo: 'desayuno' | 'almuerzo' | 'cafe') =>
    api.patch(`/timesheet/entry/${id}/break/${tipo}/start`).then((r) => r.data),
  endBreak: (id: string, tipo: 'desayuno' | 'almuerzo' | 'cafe') =>
    api.patch(`/timesheet/entry/${id}/break/${tipo}/end`).then((r) => r.data),
  myHistory: (desde?: string, hasta?: string) =>
    api.get('/timesheet/my', { params: { desde, hasta } }).then((r) => r.data.data),
  breakPolicy: () => api.get('/timesheet/break-policy').then((r) => r.data.data),
  setBreakPolicy: (data: Record<string, number>) =>
    api.put('/timesheet/break-policy', data).then((r) => r.data),
  // Admin
  report: (params?: { userId?: string; desde?: string; hasta?: string }) =>
    api.get('/timesheet/report', { params }).then((r) => r.data),
  setWage: (userId: string, tarifaHora: number) =>
    api.put(`/timesheet/wage/${userId}`, { tarifaHora }).then((r) => r.data.data),
  updateEntry: (id: string, data: any) =>
    api.put(`/timesheet/entry/${id}`, data).then((r) => r.data),
  deleteEntry: (id: string) =>
    api.delete(`/timesheet/entry/${id}`).then((r) => r.data),
  // Cierre semanal
  closeWeek: (desde: string, hasta: string) =>
    api.post('/timesheet/close-week', { desde, hasta }).then((r) => r.data),
  weeklySummaries: (userId?: string) =>
    api.get('/timesheet/weekly-summaries', { params: { userId } }).then((r) => r.data.data),
  downloadWeeklyReport: async (desde: string, hasta: string, filename: string, userId?: string) => {
    const token = localStorage.getItem('wm_token');
    const params = new URLSearchParams({ desde, hasta, ...(userId ? { userId } : {}) });
    const res = await fetch(`/api/timesheet/report/pdf?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.error || 'Error al generar el reporte');
    }
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  },
};
