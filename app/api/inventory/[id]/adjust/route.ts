import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';
import { handleError, AppError } from '@/lib/errors';

export const POST = withAuth(async (req, { params }) => {
  try {
    const { cantidad, tipo, motivo } = await req.json();
    const item = await prisma.inventoryItem.findUnique({ where: { id: params.id } });
    if (!item) throw new AppError('Item no encontrado', 404);
    const newStock = tipo === 'ENTRADA'
      ? item.stockActual + Number(cantidad)
      : item.stockActual - Number(cantidad);
    if (newStock < 0) throw new AppError('Stock insuficiente', 400);
    const updated = await prisma.inventoryItem.update({ where: { id: params.id }, data: { stockActual: newStock } });
    return NextResponse.json({ ok: true, data: updated });
  } catch (e) { return handleError(e); }
});
