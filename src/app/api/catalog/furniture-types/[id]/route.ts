import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAdmin } from '@/lib/auth';
import { handleError, AppError } from '@/lib/errors';
import { logCatalogChange } from '@/lib/audit';

export const PATCH = withAdmin(async (req, { params }, user) => {
  try {
    const { precioBase } = await req.json();
    const before = await prisma.furnitureType.findUnique({ where: { id: params.id } });
    if (!before) throw new AppError('Tipo de mueble no encontrado', 404);
    const ft = await prisma.furnitureType.update({ where: { id: params.id }, data: { precioBase: Number(precioBase) } });

    await logCatalogChange({
      userId: user.userId, modulo: 'TIPOS_MUEBLE', accion: 'EDITAR',
      entidadId: ft.id, entidadNombre: ft.nombre,
      valorAnterior: { precioBase: before.precioBase }, valorNuevo: { precioBase: ft.precioBase },
    });

    return NextResponse.json({ ok: true, data: ft });
  } catch (e) { return handleError(e); }
});

export const DELETE = withAdmin(async (_req, { params }, user) => {
  try {
    const ft = await prisma.furnitureType.findUnique({ where: { id: params.id } });
    if (!ft) throw new AppError('Tipo de mueble no encontrado', 404);
    const usageCount = await prisma.quotationItem.count({ where: { furnitureTypeId: params.id } });
    if (usageCount > 0) throw new AppError(`No se puede eliminar: está usado en ${usageCount} cotización(es)`, 409);
    await (prisma as any).materialFurniturePrice.deleteMany({ where: { furnitureTypeId: params.id } });
    await prisma.furnitureType.delete({ where: { id: params.id } });

    await logCatalogChange({
      userId: user.userId, modulo: 'TIPOS_MUEBLE', accion: 'ELIMINAR',
      entidadId: ft.id, entidadNombre: ft.nombre, valorAnterior: { precioBase: ft.precioBase },
    });

    return NextResponse.json({ ok: true, message: 'Tipo de mueble eliminado' });
  } catch (e) { return handleError(e); }
});
