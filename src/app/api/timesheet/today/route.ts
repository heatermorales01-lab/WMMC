import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';
import { handleError } from '@/lib/errors';
import {
    startOfDay,
    endOfDay,
    getFase,
    getMinutosPermitidos,
    now,
} from '@/lib/timesheet-helpers';

export const GET = withAuth(async (_req, _ctx, user) => {
  try {
    const today = now();
    const entry = await (prisma as any).timesheetEntry.findFirst({
      where: { userId: user.userId, fecha: { gte: startOfDay(today), lte: endOfDay(today) } },
      orderBy: { horaEntrada: 'desc' },
    });
    const minutosPermitidos = await getMinutosPermitidos();
    return NextResponse.json({ ok: true, data: entry ? { ...entry, fase: getFase(entry) } : null, minutosPermitidos });
  } catch (e) { return handleError(e); }
});
