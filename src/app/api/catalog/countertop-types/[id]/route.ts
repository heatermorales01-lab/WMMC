import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAdmin } from '@/lib/auth';
import { handleError, AppError } from '@/lib/errors';
import { logCatalogChange } from '@/lib/audit';

export const PATCH = withAdmin(async (req, { params }, user) => {
  try {
    const { precioM2 } = await req.json();
    const before = await prisma.countertopType.findUnique({ where: { id: params.id } });
    if (!before) throw new AppError('Tipo de sobre no encontrado', 404);
    const ct = await prisma.countertopType.update({ where: { id: params.id }, data: { precioM2: Number(precioM2) } });

    await logCatalogChange({
      userId: user.userId, modulo: 'TABLETOPS', accion: 'EDITAR',
      entidadId: ct.id, entidadNombre: ct.nombre,
      valorAnterior: { precioM2: before.precioM2 }, valorNuevo: { precioM2: ct.precioM2 },
    });

    return NextResponse.json({ ok: true, data: ct });
  } catch (e) { return handleError(e); }
});

export const DELETE = withAdmin(async (_req, { params }, user) => {
  try {
    const ct = await prisma.countertopType.findUnique({ where: { id: params.id } });
    if (!ct) throw new AppError('Tipo de sobre no encontrado', 404);
    const count = await prisma.quotationItem.count({ where: { countertopTypeId: params.id } });
    if (count > 0) throw new AppError(`No se puede eliminar: usado en ${count} cotización(es)`, 409);
    await prisma.countertopType.delete({ where: { id: params.id } });

    await logCatalogChange({
      userId: user.userId, modulo: 'TABLETOPS', accion: 'ELIMINAR',
      entidadId: ct.id, entidadNombre: ct.nombre, valorAnterior: { precioM2: ct.precioM2 },
    });

    return NextResponse.json({ ok: true, message: 'Tipo de sobre eliminado' });
  } catch (e) { return handleError(e); }
});
