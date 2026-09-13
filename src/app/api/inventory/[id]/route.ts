import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAdmin } from '@/lib/auth';
import { handleError, AppError } from '@/lib/errors';
import { logInventoryMovement } from '@/lib/audit';

// Editar datos del elemento de inventario (nombre, categoría, unidad de medida).
// El stock se sigue ajustando por separado vía /stock y /adjust.
// Protegido con withAdmin: la verificación de rol ocurre en el backend,
// no depende de que el botón esté oculto en el frontend.
export const PATCH = withAdmin(async (req, { params }, user) => {
  try {
    const { nombre, categoria, unidadMedida } = await req.json();

    if (nombre !== undefined && !nombre.trim()) {
      throw new AppError('El nombre no puede estar vacío', 400);
    }

    const before = await prisma.inventoryItem.findUnique({ where: { id: params.id } });
    if (!before) throw new AppError('Elemento no encontrado', 404);

    const item = await prisma.inventoryItem.update({
      where: { id: params.id },
      data: {
        ...(nombre !== undefined ? { nombre: nombre.trim() } : {}),
        ...(categoria !== undefined ? { categoria } : {}),
        ...(unidadMedida !== undefined ? { unidadMedida } : {}),
      },
    });

    await logInventoryMovement({
      userId: user.userId,
      itemId: item.id,
      itemNombre: item.nombre,
      tipoMovimiento: 'EDITAR',
      detalle: { antes: { nombre: before.nombre, categoria: before.categoria, unidadMedida: before.unidadMedida }, despues: { nombre: item.nombre, categoria: item.categoria, unidadMedida: item.unidadMedida } },
    });

    return NextResponse.json({ ok: true, data: item });
  } catch (e) { return handleError(e); }
});

export const DELETE = withAdmin(async (_req, { params }, user) => {
  try {
    const item = await prisma.inventoryItem.findUnique({ where: { id: params.id } });
    if (!item) throw new AppError('Elemento no encontrado', 404);

    await prisma.inventoryItem.delete({ where: { id: params.id } });

    await logInventoryMovement({
      userId: user.userId,
      itemId: item.id,
      itemNombre: item.nombre,
      tipoMovimiento: 'ELIMINAR',
      detalle: { stockActual: item.stockActual, categoria: item.categoria },
    });

    return NextResponse.json({ ok: true, message: 'Elemento eliminado' });
  } catch (e) { return handleError(e); }
});
