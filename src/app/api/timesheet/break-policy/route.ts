import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth, withAdmin } from '@/lib/auth';
import { handleError, AppError } from '@/lib/errors';
import { getMinutosPermitidos } from '@/lib/timesheet-helpers';

export const GET = withAuth(async () => {
  try {
    const minutos = await getMinutosPermitidos();
    return NextResponse.json({ ok: true, data: minutos });
  } catch (e) { return handleError(e); }
});

export const PUT = withAdmin(async (req) => {
  try {
    const updates = await req.json() as Record<string, number>;
    const valid = ['DESAYUNO', 'ALMUERZO', 'CAFE'];
    for (const [tipo, minutos] of Object.entries(updates)) {
      if (!valid.includes(tipo)) continue;
      if (isNaN(Number(minutos)) || Number(minutos) < 0) throw new AppError(`Minutos inválidos para ${tipo}`, 400);
      await (prisma as any).breakPolicy.upsert({
        where: { tipo },
        update: { minutosPermitidos: Number(minutos) },
        create: { tipo, minutosPermitidos: Number(minutos) },
      });
    }
    const data = await getMinutosPermitidos();
    return NextResponse.json({ ok: true, data, message: 'Política actualizada' });
  } catch (e) { return handleError(e); }
});
