import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAdmin } from '@/lib/auth';
import { handleError, AppError } from '@/lib/errors';

export const PUT = withAdmin(async (req, { params }) => {
  try {
    const { tarifaHora } = await req.json();
    if (!tarifaHora || isNaN(Number(tarifaHora))) throw new AppError('tarifaHora debe ser un número', 400);
    const config = await (prisma as any).userWageConfig.upsert({
      where: { userId: params.userId },
      update: { tarifaHora: Number(tarifaHora) },
      create: { userId: params.userId, tarifaHora: Number(tarifaHora) },
    });
    return NextResponse.json({ ok: true, data: config });
  } catch (e) { return handleError(e); }
});
