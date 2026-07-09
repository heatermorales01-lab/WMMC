import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAdmin } from '@/lib/auth';
import { handleError, AppError } from '@/lib/errors';
import { startOfWeek, endOfWeek, endOfDay } from '@/lib/timesheet-helpers';
import { generateWeeklyTimesheetPDF } from '@/lib/services/timesheet-pdf.service';

export const GET = withAdmin(async (req) => {
  try {
    const { searchParams } = new URL(req.url);
    const desde = searchParams.get('desde');
    const hasta = searchParams.get('hasta');
    const userId = searchParams.get('userId');
    const rangeStart = desde ? new Date(desde) : startOfWeek(new Date());
    const rangeEnd = hasta ? endOfDay(new Date(hasta)) : endOfWeek(new Date());
    const where: any = { archivado: false, fecha: { gte: rangeStart, lte: rangeEnd } };
    if (userId) where.userId = userId;
    const entries = await (prisma as any).timesheetEntry.findMany({
      where,
      include: { user: { select: { id: true, nombre: true, correo: true } } },
      orderBy: [{ fecha: 'asc' }, { horaEntrada: 'asc' }],
    });
    if (entries.length === 0) throw new AppError('No hay registros en este rango', 404);
    const byUser: Record<string, any> = {};
    for (const e of entries) {
      const uid = e.user.id;
      if (!byUser[uid]) byUser[uid] = { user: e.user, entries: [], totalHoras: 0, totalExcedente: 0 };
      byUser[uid].entries.push(e);
      byUser[uid].totalHoras += Number(e.horasTrabajadas || 0);
      byUser[uid].totalExcedente += Number(e.minutosExcedentes || 0);
    }
    const wageConfigs = await (prisma as any).userWageConfig.findMany({});
    const wageMap: Record<string, number> = {};
    for (const w of wageConfigs) wageMap[w.userId] = Number(w.tarifaHora);
    const rows = Object.values(byUser).map((u: any) => ({
      ...u,
      tarifaHora: wageMap[u.user.id] ?? null,
      salarioCalculado: wageMap[u.user.id] ? Number((u.totalHoras * wageMap[u.user.id]).toFixed(2)) : null,
    }));
    const buffer = await generateWeeklyTimesheetPDF({ semanaInicio: rangeStart.toISOString(), semanaFin: rangeEnd.toISOString(), rows });
    const filename = `Reporte-Horario-${rangeStart.toISOString().slice(0,10)}.pdf`;
    return new NextResponse(new Uint8Array(buffer), {
      headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${filename}"` },
    });
  } catch (e) { return handleError(e); }
});
