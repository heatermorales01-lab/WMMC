import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAdmin } from '@/lib/auth';
import { handleError, AppError } from '@/lib/errors';
import { logCatalogChange } from '@/lib/audit';

export const PUT = withAdmin(async (req, { params }, user) => {
  try {
    const { nombre, precio, unidad } = await req.json();
    const before = await prisma.extra.findUnique({ where: { id: params.id } });
    if (!before) throw new AppError('Extra no encontrado', 404);
    const extra = await prisma.extra.update({ where: { id: params.id }, data: { nombre, precio: Number(precio), unidad } });

    await logCatalogChange({
      userId: user.userId, modulo: 'EXTRAS', accion: 'EDITAR',
      entidadId: extra.id, entidadNombre: extra.nombre,
      valorAnterior: { nombre: before.nombre, precio: before.precio, unidad: before.unidad },
      valorNuevo: { nombre: extra.nombre, precio: extra.precio, unidad: extra.unidad },
    });

    return NextResponse.json({ ok: true, data: extra });
  } catch (e) { return handleError(e); }
});

export const DELETE = withAdmin(async (_req, { params }, user) => {
  try {
    const extra = await prisma.extra.findUnique({ where: { id: params.id } });
    if (!extra) throw new AppError('Extra no encontrado', 404);
    const count = await prisma.quotationItemExtra.count({ where: { extraId: params.id } });
    if (count === 0) {
      await prisma.extra.delete({ where: { id: params.id } });
      await logCatalogChange({
        userId: user.userId, modulo: 'EXTRAS', accion: 'ELIMINAR',
        entidadId: extra.id, entidadNombre: extra.nombre, valorAnterior: { precio: extra.precio },
      });
      return NextResponse.json({ ok: true, message: 'Extra eliminado permanentemente' });
    }
    const updated = await prisma.extra.update({ where: { id: params.id }, data: { activo: false } });
    await logCatalogChange({
      userId: user.userId, modulo: 'EXTRAS', accion: 'ELIMINAR',
      entidadId: extra.id, entidadNombre: extra.nombre,
      valorAnterior: { activo: true }, valorNuevo: { activo: false, motivo: 'usado en cotizaciones, se desactivó en vez de borrar' },
    });
    return NextResponse.json({ ok: true, data: updated, message: `Usado en ${count} cotización(es), se desactivó para preservar historial.` });
  } catch (e) { return handleError(e); }
});
