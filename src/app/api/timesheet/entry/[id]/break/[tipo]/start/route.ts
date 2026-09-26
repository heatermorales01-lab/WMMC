import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';
import { handleError, AppError } from '@/lib/errors';
import {
    getFase,
    BREAK_FIELDS,
    now,
} from '@/lib/timesheet-helpers';
import { validarUbicacionTaller } from '@/lib/geofence';

export const PATCH = withAuth(async (req, { params }, user) => {
    try {
        const { lat, lng } = await req.json().catch(() => ({}));
        const ubicacion = validarUbicacionTaller(lat, lng);
        if (!ubicacion.ok) throw new AppError(ubicacion.mensaje!, 403);

        const fields = BREAK_FIELDS[params.tipo]; if (!fields) throw new AppError('Tipo de descanso inválido', 400);
    const entry = await (prisma as any).timesheetEntry.findUnique({ where: { id: params.id } });
    if (!entry) throw new AppError('Registro no encontrado', 404);
    if (entry.userId !== user.userId && user.roleName !== 'ADMINISTRADOR') throw new AppError('Sin permiso', 403);
    if (entry.horaSalida) throw new AppError('La jornada ya fue cerrada', 409);
    if (entry[fields.start]) throw new AppError(`${fields.label} ya fue iniciado`, 409);
    if (getFase(entry) !== 'TRABAJANDO') throw new AppError('Ya hay un descanso en curso', 409);
      const updated = await (prisma as any).timesheetEntry.update({ where: { id: params.id }, data: { [fields.start]: now() } });
    return NextResponse.json({ ok: true, data: { ...updated, fase: getFase(updated) }, message: `${fields.label} iniciado` });
  } catch (e) { return handleError(e); }
});
