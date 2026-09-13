import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAdmin } from '@/lib/auth';
import { handleError, AppError } from '@/lib/errors';
import { logCatalogChange } from '@/lib/audit';

export const PATCH = withAdmin(async (_req, { params }, user) => {
  try {
    const extra = await prisma.extra.findUnique({ where: { id: params.id } });
    if (!extra) throw new AppError('Extra no encontrado', 404);
    const updated = await prisma.extra.update({ where: { id: params.id }, data: { activo: !extra.activo } });

    await logCatalogChange({
      userId: user.userId, modulo: 'EXTRAS', accion: 'EDITAR',
      entidadId: extra.id, entidadNombre: extra.nombre,
      valorAnterior: { activo: extra.activo }, valorNuevo: { activo: updated.activo },
    });

    return NextResponse.json({ ok: true, data: updated });
  } catch (e) { return handleError(e); }
});
