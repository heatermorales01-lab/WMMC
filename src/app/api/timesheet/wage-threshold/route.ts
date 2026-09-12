import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth, withAdmin } from '@/lib/auth';
import { handleError, AppError } from '@/lib/errors';
import { getUmbralHoras } from '@/lib/timesheet-helpers';

export const GET = withAuth(async () => {
  try {
    const umbralHoras = await getUmbralHoras();
    return NextResponse.json({ ok: true, data: { umbralHoras } });
  } catch (e) { return handleError(e); }
});

export const PUT = withAdmin(async (req) => {
  try {
    const { umbralHoras } = await req.json();
    if (!umbralHoras || isNaN(Number(umbralHoras)) || Number(umbralHoras) <= 0) {
      throw new AppError('umbralHoras debe ser un número mayor a 0', 400);
    }
    const existing = await (prisma as any).wageThreshold.findFirst();
    const config = existing
      ? await (prisma as any).wageThreshold.update({ where: { id: existing.id }, data: { umbralHoras: Number(umbralHoras) } })
      : await (prisma as any).wageThreshold.create({ data: { umbralHoras: Number(umbralHoras) } });
    return NextResponse.json({ ok: true, data: { umbralHoras: config.umbralHoras }, message: 'Umbral actualizado' });
  } catch (e) { return handleError(e); }
});
