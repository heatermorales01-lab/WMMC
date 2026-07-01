import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAdmin } from '@/lib/auth';
import { handleError } from '@/lib/errors';

export const PATCH = withAdmin(async (req, { params }) => {
  try {
    const { stockActual, stockMinimo, precioUnitario } = await req.json();
    const item = await prisma.inventoryItem.update({
      where: { id: params.id },
      data: { stockActual: Number(stockActual), stockMinimo: Number(stockMinimo), precioUnitario: precioUnitario ? Number(precioUnitario) : null },
    });
    return NextResponse.json({ ok: true, data: item });
  } catch (e) { return handleError(e); }
});
