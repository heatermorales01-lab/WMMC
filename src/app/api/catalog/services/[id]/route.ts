import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAdmin } from '@/lib/auth';
import { handleError, AppError } from '@/lib/errors';
import { logCatalogChange } from '@/lib/audit';

export const PUT = withAdmin(async (req, { params }, user) => {
  try {
    const { nombre, precioBase } = await req.json();
    const before = await prisma.service.findUnique({ where: { id: params.id } });
    if (!before) throw new AppError('Servicio no encontrado', 404);
    const svc = await prisma.service.update({ where: { id: params.id }, data: { nombre, precioBase: Number(precioBase) } });

    await logCatalogChange({
      userId: user.userId, modulo: 'SERVICIOS', accion: 'EDITAR',
      entidadId: svc.id, entidadNombre: svc.nombre,
      valorAnterior: { nombre: before.nombre, precioBase: before.precioBase },
      valorNuevo: { nombre: svc.nombre, precioBase: svc.precioBase },
    });

    return NextResponse.json({ ok: true, data: svc });
  } catch (e) { return handleError(e); }
});

export const DELETE = withAdmin(async (_req, { params }, user) => {
  try {
    const svc = await prisma.service.findUnique({ where: { id: params.id } });
    if (!svc) throw new AppError('Servicio no encontrado', 404);
    const count = await (prisma as any).quotationService.count({ where: { serviceId: params.id } });
    if (count === 0) {
      await prisma.service.delete({ where: { id: params.id } });
      await logCatalogChange({
        userId: user.userId, modulo: 'SERVICIOS', accion: 'ELIMINAR',
        entidadId: svc.id, entidadNombre: svc.nombre, valorAnterior: { precioBase: svc.precioBase },
      });
      return NextResponse.json({ ok: true, message: 'Servicio eliminado permanentemente' });
    }
    const updated = await prisma.service.update({ where: { id: params.id }, data: { activo: false } });
    await logCatalogChange({
      userId: user.userId, modulo: 'SERVICIOS', accion: 'ELIMINAR',
      entidadId: svc.id, entidadNombre: svc.nombre,
      valorAnterior: { activo: true }, valorNuevo: { activo: false, motivo: 'usado en cotizaciones, se desactivó en vez de borrar' },
    });
    return NextResponse.json({ ok: true, data: updated, message: `Usado en ${count} cotización(es), se desactivó.` });
  } catch (e) { return handleError(e); }
});
