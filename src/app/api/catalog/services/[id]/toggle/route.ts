import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAdmin } from '@/lib/auth';
import { handleError, AppError } from '@/lib/errors';
import { logCatalogChange } from '@/lib/audit';

export const PATCH = withAdmin(async (_req, { params }, user) => {
  try {
    const svc = await prisma.service.findUnique({ where: { id: params.id } });
    if (!svc) throw new AppError('Servicio no encontrado', 404);
    const updated = await prisma.service.update({ where: { id: params.id }, data: { activo: !svc.activo } });

    await logCatalogChange({
      userId: user.userId, modulo: 'SERVICIOS', accion: 'EDITAR',
      entidadId: svc.id, entidadNombre: svc.nombre,
      valorAnterior: { activo: svc.activo }, valorNuevo: { activo: updated.activo },
    });

    return NextResponse.json({ ok: true, data: updated });
  } catch (e) { return handleError(e); }
});
