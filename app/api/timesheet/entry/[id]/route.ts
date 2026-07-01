import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAdmin } from '@/lib/auth';
import { handleError, AppError } from '@/lib/errors';
import { calcularHorasPagas, getMinutosPermitidos } from '@/lib/timesheet-helpers';

export const PUT = withAdmin(async (req, { params }) => {
  try {
    const { horaEntrada, horaSalida, observaciones, desayunoInicio, desayunoFin, almuerzoInicio, almuerzoFin, cafeInicio, cafeFin } = await req.json();
    const entry = await (prisma as any).timesheetEntry.findUnique({ where: { id: params.id } });
    if (!entry) throw new AppError('Registro no encontrado', 404);
    if (entry.archivado) throw new AppError('No se puede editar un registro archivado', 409);
    const toDate = (v: any, fallback: any) => v === undefined ? (fallback ? new Date(fallback) : null) : (v ? new Date(v) : null);
    const data = {
      horaEntrada: horaEntrada ? new Date(horaEntrada) : new Date(entry.horaEntrada),
      horaSalida: toDate(horaSalida, entry.horaSalida),
      desayunoInicio: toDate(desayunoInicio, entry.desayunoInicio),
      desayunoFin: toDate(desayunoFin, entry.desayunoFin),
      almuerzoInicio: toDate(almuerzoInicio, entry.almuerzoInicio),
      almuerzoFin: toDate(almuerzoFin, entry.almuerzoFin),
      cafeInicio: toDate(cafeInicio, entry.cafeInicio),
      cafeFin: toDate(cafeFin, entry.cafeFin),
      observaciones,
    };
    let horasTrabajadas = null; let minutosExcedentes = 0;
    if (data.horaSalida) {
      const mp = await getMinutosPermitidos();
      const calc = calcularHorasPagas(data, mp);
      horasTrabajadas = calc.horas; minutosExcedentes = calc.minutosExcedentes;
    }
    const updated = await (prisma as any).timesheetEntry.update({ where: { id: params.id }, data: { ...data, horasTrabajadas, minutosExcedentes } });
    return NextResponse.json({ ok: true, data: updated });
  } catch (e) { return handleError(e); }
});

export const DELETE = withAdmin(async (_req, { params }) => {
  try {
    const entry = await (prisma as any).timesheetEntry.findUnique({ where: { id: params.id } });
    if (!entry) throw new AppError('Registro no encontrado', 404);
    if (entry.archivado) throw new AppError('No se puede eliminar un registro archivado', 409);
    await (prisma as any).timesheetEntry.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true, message: 'Registro eliminado' });
  } catch (e) { return handleError(e); }
});
