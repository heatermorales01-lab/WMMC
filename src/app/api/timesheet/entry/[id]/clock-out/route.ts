import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';
import { handleError, AppError } from '@/lib/errors';
import {
    getFase,
    calcularHorasPagas,
    getMinutosPermitidos,
    getCostaRicaDate,
} from '@/lib/timesheet-helpers';

export const PATCH = withAuth(async (req, { params }, user) => {
  try {
    const { observaciones } = await req.json().catch(() => ({}));
    const entry = await (prisma as any).timesheetEntry.findUnique({ where: { id: params.id } });
    if (!entry) throw new AppError('Registro no encontrado', 404);
    if (entry.userId !== user.userId && user.roleName !== 'ADMINISTRADOR') throw new AppError('Sin permiso', 403);
    if (entry.horaSalida) throw new AppError('La salida ya fue registrada', 409);
    if (getFase(entry) !== 'TRABAJANDO') throw new AppError('Hay un descanso en curso. Finalizalo primero.', 409);
    const now = getCostaRicaDate();
    const minutosPermitidos = await getMinutosPermitidos();
    const { horas, minutosExcedentes } = calcularHorasPagas({ ...entry, horaSalida: now }, minutosPermitidos);
    const updated = await (prisma as any).timesheetEntry.update({
      where: { id: params.id },
      data: { horaSalida: now, horasTrabajadas: horas, minutosExcedentes, observaciones },
    });
    return NextResponse.json({ ok: true, data: { ...updated, fase: 'FINALIZADO' }, message: `Salida registrada. Total horas: ${horas}` });
  } catch (e) { return handleError(e); }
});
