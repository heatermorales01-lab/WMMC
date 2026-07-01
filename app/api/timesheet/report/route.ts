import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAdmin } from '@/lib/auth';
import { handleError } from '@/lib/errors';
import { startOfWeek, endOfWeek, endOfDay } from '@/lib/timesheet-helpers';

export const GET = withAdmin(async (req) => {
  try {
    const { searchParams } = new URL(req.url);
    const filterUser = searchParams.get('userId');
    const desde = searchParams.get('desde');
    const hasta = searchParams.get('hasta');
    const rangeStart = desde ? new Date(desde) : startOfWeek(new Date());
    const rangeEnd = hasta ? endOfDay(new Date(hasta)) : endOfWeek(new Date());
    const where: any = { archivado: false, fecha: { gte: rangeStart, lte: rangeEnd } };
    if (filterUser) where.userId = filterUser;
    const entries = await (prisma as any).timesheetEntry.findMany({
      where,
      include: { user: { select: { id: true, nombre: true, correo: true } } },
      orderBy: [{ fecha: 'asc' }, { horaEntrada: 'asc' }],
    });
    const byUser: Record<string, any> = {};
    for (const e of entries) {
      const uid = e.user.id;
      if (!byUser[uid]) byUser[uid] = { user: e.user, entries: [], totalHoras: 0, totalExcedente: 0 };
      byUser[uid].entries.push(e);
      byUser[uid].totalHoras += Number(e.horasTrabajadas || 0);
      byUser[uid].totalExcedente += Number(e.minutosExcedentes || 0);
    }
    const wageConfigs = await (prisma as any).userWageConfig.findMany({ where: filterUser ? { userId: filterUser } : {} });
    const wageMap: Record<string, number> = {};
    for (const w of wageConfigs) wageMap[w.userId] = Number(w.tarifaHora);
    const result = Object.values(byUser).map((u: any) => ({
      ...u,
      totalHoras: Number(u.totalHoras.toFixed(2)),
      totalExcedente: Math.round(u.totalExcedente),
      tarifaHora: wageMap[u.user.id] ?? null,
      salarioCalculado: wageMap[u.user.id] ? Number((u.totalHoras * wageMap[u.user.id]).toFixed(2)) : null,
    }));
    return NextResponse.json({ ok: true, data: result, meta: { rangeStart: rangeStart.toISOString(), rangeEnd: rangeEnd.toISOString() } });
  } catch (e) { return handleError(e); }
});
