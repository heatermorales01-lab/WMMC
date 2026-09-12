import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAdmin } from '@/lib/auth';
import { handleError, AppError } from '@/lib/errors';

export const PUT = withAdmin(async (req, { params }) => {
  try {
    const { tarifaHora, tarifaHoraExceso } = await req.json();
    if (!tarifaHora || isNaN(Number(tarifaHora))) throw new AppError('tarifaHora debe ser un número', 400);
    if (tarifaHoraExceso !== undefined && tarifaHoraExceso !== null && tarifaHoraExceso !== '' && isNaN(Number(tarifaHoraExceso))) {
      throw new AppError('tarifaHoraExceso debe ser un número', 400);
    }
    const dataExceso = tarifaHoraExceso === undefined || tarifaHoraExceso === null || tarifaHoraExceso === ''
      ? null
      : Number(tarifaHoraExceso);
    const config = await (prisma as any).userWageConfig.upsert({
      where: { userId: params.userId },
      update: { tarifaHora: Number(tarifaHora), tarifaHoraExceso: dataExceso },
      create: { userId: params.userId, tarifaHora: Number(tarifaHora), tarifaHoraExceso: dataExceso },
    });
    return NextResponse.json({ ok: true, data: config });
  } catch (e) { return handleError(e); }
});
