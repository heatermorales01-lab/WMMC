import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';
import { handleError, AppError } from '@/lib/errors';
import { logInventoryMovement } from '@/lib/audit';

export const POST = withAuth(async (req, { params }, user) => {
  try {
    const { cantidad, operacion, motivo } = await req.json();
    const item = await prisma.inventoryItem.findUnique({ where: { id: params.id } });
    if (!item) throw new AppError('Item no encontrado', 404);
      const stockActual = Number(item.stockActual);

      const newStock = operacion === 'ENTRADA'
          ? stockActual + Number(cantidad)
          : stockActual - Number(cantidad);
    if (newStock < 0) throw new AppError('Stock insuficiente', 400);
    const updated = await prisma.inventoryItem.update({ where: { id: params.id }, data: { stockActual: newStock } });

    await logInventoryMovement({
      userId: user.userId,
      itemId: item.id,
      itemNombre: item.nombre,
      tipoMovimiento: operacion,
      cantidad: Number(cantidad),
      detalle: { motivo: motivo || null, stockAnterior: stockActual, stockNuevo: newStock },
    });

    return NextResponse.json({ ok: true, data: updated });
  } catch (e) { return handleError(e); }
});
