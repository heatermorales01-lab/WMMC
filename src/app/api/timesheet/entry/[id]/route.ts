import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAdmin } from '@/lib/auth';
import { handleError, AppError } from '@/lib/errors';
import { calcularHorasPagas, getMinutosPermitidos } from '@/lib/timesheet-helpers';
import { logTimesheetCorrection } from '@/lib/audit';

const CAMPOS_AUDITABLES = ['horaEntrada', 'horaSalida', 'desayunoInicio', 'desayunoFin', 'almuerzoInicio', 'almuerzoFin', 'cafeInicio', 'cafeFin', 'observaciones'] as const;

export const PUT = withAdmin(async (req, { params }, user) => {
  try {
    const { horaEntrada, horaSalida, observaciones, desayunoInicio, desayunoFin, almuerzoInicio, almuerzoFin, cafeInicio, cafeFin, motivo } = await req.json();
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

    // Bitácora: una fila por cada campo que realmente cambió, para trazabilidad
    // clara de qué corrigió el admin (no solo que "editó" el registro).
    for (const campo of CAMPOS_AUDITABLES) {
      const antes = entry[campo] instanceof Date ? entry[campo].toISOString() : (entry[campo] ?? null);
      const despues = (updated as any)[campo] instanceof Date ? (updated as any)[campo].toISOString() : ((updated as any)[campo] ?? null);
      if (String(antes) !== String(despues)) {
        await logTimesheetCorrection({
          adminId: user.userId,
          trabajadorId: entry.userId,
          timesheetEntryId: entry.id,
          campo,
          valorAnterior: antes,
          valorNuevo: despues,
          motivo: motivo || null,
        });
      }
    }

    return NextResponse.json({ ok: true, data: updated });
  } catch (e) { return handleError(e); }
});

export const DELETE = withAdmin(async (req, { params }, user) => {
  try {
    const entry = await (prisma as any).timesheetEntry.findUnique({ where: { id: params.id } });
    if (!entry) throw new AppError('Registro no encontrado', 404);
    if (entry.archivado) throw new AppError('No se puede eliminar un registro archivado', 409);
    const { motivo } = await req.json().catch(() => ({ motivo: null }));

    await (prisma as any).timesheetEntry.delete({ where: { id: params.id } });

    await logTimesheetCorrection({
      adminId: user.userId,
      trabajadorId: entry.userId,
      timesheetEntryId: entry.id,
      campo: 'REGISTRO_ELIMINADO',
      valorAnterior: JSON.stringify({ fecha: entry.fecha, horaEntrada: entry.horaEntrada, horaSalida: entry.horaSalida }),
      valorNuevo: null,
      motivo: motivo || null,
    });

    return NextResponse.json({ ok: true, message: 'Registro eliminado' });
  } catch (e) { return handleError(e); }
});
