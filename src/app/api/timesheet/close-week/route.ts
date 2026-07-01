import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAdmin } from '@/lib/auth';
import { handleError, AppError } from '@/lib/errors';
import { startOfWeek, endOfWeek, endOfDay } from '@/lib/timesheet-helpers';

export const POST = withAdmin(async (req, _ctx, user) => {
  try {
    const { desde, hasta } = await req.json().catch(() => ({}));
    const rangeStart = desde ? new Date(desde) : startOfWeek(new Date());
    const rangeEnd = hasta ? endOfDay(new Date(hasta)) : endOfWeek(new Date());
    const entries = await (prisma as any).timesheetEntry.findMany({
      where: { archivado: false, fecha: { gte: rangeStart, lte: rangeEnd } },
      include: { user: { select: { id: true, nombre: true } } },
    });
    if (entries.length === 0) throw new AppError('No hay registros sin archivar en este rango', 400);
    const open = entries.filter((e: any) => !e.horaSalida);
    if (open.length > 0) {
      const nombres = [...new Set(open.map((e: any) => e.user.nombre))].join(', ');
      throw new AppError(`Hay jornadas sin salida para: ${nombres}`, 409);
    }
    const byUser: Record<string, any[]> = {};
    for (const e of entries) { if (!byUser[e.userId]) byUser[e.userId] = []; byUser[e.userId].push(e); }
    const wageConfigs = await (prisma as any).userWageConfig.findMany({});
    const wageMap: Record<string, number> = {};
    for (const w of wageConfigs) wageMap[w.userId] = Number(w.tarifaHora);
    const summaries: any[] = [];
    await prisma.$transaction(async (tx: any) => {
      for (const [userId, userEntries] of Object.entries(byUser)) {
        const totalHoras = (userEntries as any[]).reduce((acc, e) => acc + Number(e.horasTrabajadas || 0), 0);
        const tarifaHora = wageMap[userId] ?? null;
        const salarioTotal = tarifaHora ? Number((totalHoras * tarifaHora).toFixed(2)) : null;
        const summary = await tx.weeklyTimesheetSummary.create({
          data: { userId, semanaInicio: rangeStart, semanaFin: rangeEnd, totalHoras: Number(totalHoras.toFixed(2)), tarifaHora, salarioTotal, cantidadDias: (userEntries as any[]).length, generadoPor: user.userId },
          include: { user: { select: { nombre: true } } },
        });
        summaries.push(summary);
        await tx.timesheetEntry.updateMany({ where: { id: { in: (userEntries as any[]).map((e) => e.id) } }, data: { archivado: true } });
      }
    });
    return NextResponse.json({ ok: true, data: summaries, message: `Semana cerrada. ${summaries.length} resumen(es) generado(s).` });
  } catch (e) { return handleError(e); }
});
