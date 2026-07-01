import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withBlockTrabajador } from '@/lib/auth';
import { handleError, AppError } from '@/lib/errors';

export const PATCH = withBlockTrabajador(async (req, { params }) => {
  try {
    const { fondoPersonalizado } = await req.json();
    const item = await prisma.quotationItem.findUnique({ where: { id: params.itemId } });
    if (!item) throw new AppError('Item no encontrado', 404);
    const updated = await prisma.quotationItem.update({
      where: { id: params.itemId },
      data: { fondoPersonalizado: fondoPersonalizado?.trim() || null },
    });
    return NextResponse.json({ ok: true, data: updated });
  } catch (e) { return handleError(e); }
});
