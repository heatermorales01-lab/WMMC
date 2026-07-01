import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth, withAdmin } from '@/lib/auth';
import { handleError, AppError } from '@/lib/errors';

export const GET = withAuth(async () => {
  try {
    const items = await prisma.inventoryItem.findMany({ orderBy: { nombre: 'asc' } });
    const lowStockCount = items.filter((i) => i.stockActual <= i.stockMinimo).length;
    return NextResponse.json({ ok: true, data: items, lowStockCount });
  } catch (e) { return handleError(e); }
});

export const POST = withAdmin(async (req) => {
  try {
    const { nombre, descripcion, unidad, stockActual, stockMinimo, precioUnitario } = await req.json();
    if (!nombre) throw new AppError('nombre es requerido', 400);
    const item = await prisma.inventoryItem.create({
      data: { nombre, descripcion, unidad, stockActual: Number(stockActual) || 0, stockMinimo: Number(stockMinimo) || 0, precioUnitario: precioUnitario ? Number(precioUnitario) : null },
    });
    return NextResponse.json({ ok: true, data: item }, { status: 201 });
  } catch (e) { return handleError(e); }
});
