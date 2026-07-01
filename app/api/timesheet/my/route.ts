import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';
import { handleError } from '@/lib/errors';
import { endOfDay } from '@/lib/timesheet-helpers';

export const GET = withAuth(async (req, _ctx, user) => {
  try {
    const { searchParams } = new URL(req.url);
    const desde = searchParams.get('desde');
    const hasta = searchParams.get('hasta');
    const where: any = { userId: user.userId, archivado: false };
    if (desde || hasta) {
      where.fecha = {};
      if (desde) where.fecha.gte = new Date(desde);
      if (hasta) where.fecha.lte = endOfDay(new Date(hasta));
    }
    const entries = await (prisma as any).timesheetEntry.findMany({ where, orderBy: { fecha: 'desc' } });
    const totalHoras = entries.reduce((acc: number, e: any) => acc + Number(e.horasTrabajadas || 0), 0);
    return NextResponse.json({ ok: true, data: { entries, totalHoras: Number(totalHoras.toFixed(2)) } });
  } catch (e) { return handleError(e); }
});
